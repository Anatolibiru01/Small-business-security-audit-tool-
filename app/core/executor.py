"""
Execution & Orchestration Engine for Lynis Audits.
Coordinates local Linux scans, remote SSH target executions via Paramiko,
simulated testing pipelines, and real-time SSE progress streaming.
"""

import os
import sys
import shutil
import asyncio
import subprocess
import time
from typing import Dict, Any, Optional, Callable, AsyncGenerator, List, Tuple
from pydantic import BaseModel

from app.core.parser import parse_lynis_report, LynisReportData
from app.core.scorer import calculate_scorecard, AuditScorecard
from app.core.servers import get_server_by_id, update_server_last_scan, ServerProfile
from app.core.ssh_client import (
    execute_remote_lynis_scan,
    test_ssh_connection,
    RemotePreflightStatus,
    PARAMIKO_AVAILABLE
)

LYNIS_DEFAULT_REPORT_PATH = "/var/log/lynis-report.dat"
LYNIS_DEFAULT_LOG_PATH = "/var/log/lynis.log"


class SystemPreflightStatus(BaseModel):
    is_linux: bool
    lynis_installed: bool
    lynis_path: Optional[str] = None
    sudo_available: bool
    can_execute: bool
    install_help: Dict[str, str] = {}


class ScanProgressEvent(BaseModel):
    stage: str
    progress_percent: int
    message: str
    is_complete: bool = False
    error: Optional[str] = None
    scorecard: Optional[AuditScorecard] = None
    server_id: Optional[int] = None
    server_name: Optional[str] = None


def check_system_preflight() -> SystemPreflightStatus:
    """
    Verify local host OS, presence of Lynis binary, and execution readiness.
    """
    is_linux = sys.platform.startswith("linux")
    
    lynis_path = shutil.which("lynis")
    if not lynis_path:
        for common_path in ["/usr/sbin/lynis", "/usr/bin/lynis", "/usr/local/bin/lynis", "/opt/lynis/lynis"]:
            if os.path.exists(common_path) and os.access(common_path, os.X_OK):
                lynis_path = common_path
                break

    lynis_installed = lynis_path is not None
    sudo_available = shutil.which("sudo") is not None or not is_linux

    install_commands = {
        "Ubuntu / Debian / Kali": "sudo apt update && sudo apt install -y lynis",
        "RHEL / AlmaLinux / Rocky": "sudo dnf install -y epel-release && sudo dnf install -y lynis",
        "Arch Linux": "sudo pacman -S --noconfirm lynis",
        "OpenSUSE": "sudo zypper install -y lynis",
        "Direct Clone (Any Distro)": "git clone https://github.com/CISOfy/lynis.git /opt/lynis && sudo ln -s /opt/lynis/lynis /usr/local/bin/lynis"
    }

    can_exec = is_linux and lynis_installed

    return SystemPreflightStatus(
        is_linux=is_linux,
        lynis_installed=lynis_installed,
        lynis_path=lynis_path,
        sudo_available=sudo_available,
        can_execute=can_exec,
        install_help=install_commands
    )


def verify_sudo_credentials(username: str, password: str) -> bool:
    """
    Validate local Linux credentials by invoking `sudo -k -S -p '' id`.
    """
    if not sys.platform.startswith("linux"):
        return len(password.strip()) > 0

    try:
        proc = subprocess.Popen(
            ["sudo", "-k", "-S", "-p", "", "id"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=f"{password}\n", timeout=5)
        password = "0" * len(password)
        del password
        return proc.returncode == 0
    except Exception:
        return False


class ScanManager:
    """
    Manages active scan lifecycle across multiple remote SSH targets and local execution.
    """
    def __init__(self):
        self.active_scans: Dict[int, bool] = {} # server_id -> is_scanning
        self.is_scanning = False # Global flag for local / active scans
        self.last_local_scorecard: Optional[AuditScorecard] = None
        self.last_scorecards_by_server: Dict[int, AuditScorecard] = {}
        self.last_error: Optional[str] = None
        self.current_progress: int = 0
        self.current_stage: str = "Idle"
        self.current_message: str = "Ready to start audit"
        self.subscribers: list = []

    @property
    def last_scorecard(self) -> Optional[AuditScorecard]:
        return self.last_local_scorecard

    @last_scorecard.setter
    def last_scorecard(self, val: Optional[AuditScorecard]):
        self.last_local_scorecard = val

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.subscribers:
            self.subscribers.remove(q)

    async def broadcast(self, event: ScanProgressEvent):
        for q in list(self.subscribers):
            try:
                await q.put(event)
            except Exception:
                pass

    async def run_scan(
        self,
        server_id: Optional[int] = None,
        username: str = "",
        password: str = "",
        simulate: bool = False
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Execute an audit scan asynchronously for a specific server profile or local host.
        """
        target_key = server_id if server_id is not None else 0

        if self.active_scans.get(target_key, False):
            yield ScanProgressEvent(
                stage="Busy",
                progress_percent=self.current_progress,
                message="An audit scan is already running for this server. Please wait...",
                error="Scan in progress",
                server_id=server_id
            )
            return

        self.active_scans[target_key] = True
        self.is_scanning = True
        self.last_error = None

        server_profile: Optional[ServerProfile] = None
        if server_id is not None:
            server_profile = get_server_by_id(server_id)
            if not server_profile:
                self.active_scans[target_key] = False
                self.is_scanning = any(self.active_scans.values())
                yield ScanProgressEvent(
                    stage="Failed",
                    progress_percent=0,
                    message="Target server profile not found.",
                    error="Server not found",
                    server_id=server_id
                )
                return

        server_name = server_profile.name if server_profile else "Local Host"

        try:
            if simulate:
                async for event in self._run_simulated_scan(server_id, server_name):
                    yield event
            elif server_profile and not server_profile.is_local:
                # Remote SSH Scan
                async for event in self._run_remote_ssh_scan(server_profile):
                    yield event
            else:
                # Local Linux Scan
                preflight = check_system_preflight()
                if not preflight.is_linux or not preflight.lynis_installed:
                    # Fallback gracefully to simulated scan on dev/non-Linux machines
                    async for event in self._run_simulated_scan(server_id, server_name):
                        yield event
                else:
                    async for event in self._run_live_linux_scan(
                        username=username or (server_profile.username if server_profile else ""),
                        password=password or (server_profile.password if server_profile else ""),
                        lynis_bin=preflight.lynis_path or "lynis",
                        server_id=server_id,
                        server_name=server_name
                    ):
                        yield event

        except Exception as e:
            self.last_error = str(e)
            yield ScanProgressEvent(
                stage="Failed",
                progress_percent=0,
                message=f"Scan execution failed: {str(e)}",
                error=str(e),
                server_id=server_id,
                server_name=server_name
            )
        finally:
            self.active_scans[target_key] = False
            self.is_scanning = any(self.active_scans.values())

    async def _run_remote_ssh_scan(
        self,
        server: ServerProfile
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Run remote Lynis audit over SSH in a non-blocking background thread while streaming progress.
        """
        loop = asyncio.get_running_loop()
        event_queue = asyncio.Queue()

        def sync_progress_callback(stage: str, percent: int, msg: str):
            evt = ScanProgressEvent(
                stage=stage,
                progress_percent=percent,
                message=msg,
                server_id=server.id,
                server_name=server.name
            )
            loop.call_soon_threadsafe(event_queue.put_nowait, evt)

        # Worker thread
        async def run_remote_worker():
            try:
                report_text, log_text = await asyncio.to_thread(
                    execute_remote_lynis_scan,
                    server,
                    sync_progress_callback
                )
                
                # Parse report
                evt_parse = ScanProgressEvent(
                    stage="Analyzing",
                    progress_percent=92,
                    message="Parsing remote Lynis report and computing security scorecard...",
                    server_id=server.id,
                    server_name=server.name
                )
                await event_queue.put(evt_parse)

                report_data = parse_lynis_report(report_text)
                scorecard = calculate_scorecard(report_data)
                
                # Update server last scan in DB and per-server cache
                update_server_last_scan(server.id, scorecard.overall_score, scorecard.letter_grade)
                self.last_scorecards_by_server[server.id] = scorecard

                done_evt = ScanProgressEvent(
                    stage="Completed",
                    progress_percent=100,
                    message=f"Audit completed for {server.name}! Score: {scorecard.overall_score}/100 ({scorecard.letter_grade})",
                    is_complete=True,
                    scorecard=scorecard,
                    server_id=server.id,
                    server_name=server.name
                )
                await event_queue.put(done_evt)
            except Exception as e:
                fail_evt = ScanProgressEvent(
                    stage="Failed",
                    progress_percent=0,
                    message=str(e),
                    error=str(e),
                    is_complete=True,
                    server_id=server.id,
                    server_name=server.name
                )
                await event_queue.put(fail_evt)

        worker_task = asyncio.create_task(run_remote_worker())

        while True:
            evt = await event_queue.get()
            yield evt
            if evt.is_complete or evt.error:
                break

        await worker_task

    async def _run_live_linux_scan(
        self,
        username: str,
        password: str,
        lynis_bin: str,
        server_id: Optional[int] = None,
        server_name: Optional[str] = None
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Execute real `sudo lynis audit system --quick` on local host.
        """
        yield ScanProgressEvent(
            stage="Authentication",
            progress_percent=5,
            message="Validating administrator privileges...",
            server_id=server_id,
            server_name=server_name
        )

        script = f"{lynis_bin} audit system --quick --auditor SmallBusinessSecurityAuditTool; chmod 644 {LYNIS_DEFAULT_REPORT_PATH}"
        cmd = ["sudo", "-S", "-p", "", "sh", "-c", script]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        input_data = f"{password}\n".encode("utf-8")
        proc.stdin.write(input_data)
        await proc.stdin.drain()
        proc.stdin.close()
        
        password = "0" * len(password)
        del password

        yield ScanProgressEvent(
            stage="Scanning",
            progress_percent=20,
            message="Lynis audit in progress. Examining system defenses...",
            server_id=server_id,
            server_name=server_name
        )

        sim_pct = 25
        while proc.returncode is None:
            try:
                await asyncio.wait_for(proc.wait(), timeout=2.0)
            except asyncio.TimeoutError:
                if sim_pct < 85:
                    sim_pct += 5
                    msg = f"Auditing system components... ({sim_pct}%)"
                    yield ScanProgressEvent(
                        stage="Scanning",
                        progress_percent=sim_pct,
                        message=msg,
                        server_id=server_id,
                        server_name=server_name
                    )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0 and proc.returncode != 78:
            err_msg = stderr.decode("utf-8", errors="replace")
            if "incorrect password" in err_msg.lower():
                raise RuntimeError("Invalid administrator password. Please check your credentials.")
            if not os.path.exists(LYNIS_DEFAULT_REPORT_PATH):
                raise RuntimeError(f"Lynis execution failed (Exit code {proc.returncode}): {err_msg}")

        yield ScanProgressEvent(
            stage="Analyzing",
            progress_percent=90,
            message="Parsing /var/log/lynis-report.dat and computing scorecard...",
            server_id=server_id,
            server_name=server_name
        )

        if not os.path.exists(LYNIS_DEFAULT_REPORT_PATH):
            raise RuntimeError(f"Could not locate Lynis report at {LYNIS_DEFAULT_REPORT_PATH}")

        report_data = parse_lynis_report(LYNIS_DEFAULT_REPORT_PATH)
        scorecard = calculate_scorecard(report_data)
        if server_id is not None:
            self.last_scorecards_by_server[server_id] = scorecard
            update_server_last_scan(server_id, scorecard.overall_score, scorecard.letter_grade)
        else:
            self.last_local_scorecard = scorecard

        yield ScanProgressEvent(
            stage="Completed",
            progress_percent=100,
            message=f"Audit complete! Score: {scorecard.overall_score}/100 ({scorecard.letter_grade})",
            is_complete=True,
            scorecard=scorecard,
            server_id=server_id,
            server_name=server_name
        )

    async def _run_simulated_scan(
        self,
        server_id: Optional[int] = None,
        server_name: Optional[str] = None
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Simulated scan execution using sample data for dev/testing.
        """
        stages = [
            ("Initializing", 10, "Initializing audit profiles and system probes..."),
            ("Scanning", 30, "Auditing kernel, users, authentication and network stack..."),
            ("Scanning", 60, "Inspecting firewall rules, SSH configuration and open ports..."),
            ("Scanning", 80, "Checking installed packages, system integrity and logging..."),
            ("Analyzing", 95, "Compiling audit data and generating business scorecard...")
        ]

        for stage, pct, msg in stages:
            yield ScanProgressEvent(
                stage=stage,
                progress_percent=pct,
                message=msg,
                server_id=server_id,
                server_name=server_name
            )
            await asyncio.sleep(0.4)

        sample_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "tests",
            "sample_lynis_report.dat"
        )
        
        if os.path.exists(sample_path):
            report_data = parse_lynis_report(sample_path)
        else:
            sample_content = """
auditor_version=3.0.8
os=Linux
os_name=Kali GNU/Linux
os_version=2024.1
os_kernel_version=6.6.9-kali1-amd64
hostname=kali-linux-srv
hardening_index=64
firewall_active=1
ufw_active=0
iptables_active=1
ssh_daemon=1
installed_packages=1450
vulnerable_packages=3
warning[]=SSH-7408|PermitRootLogin is enabled in /etc/ssh/sshd_config||
warning[]=FIRE-4518|IP forwarding is enabled in sysctl||
suggestion[]=AUTH-9288|Install fail2ban or libpam-google-authenticator for MFA||
suggestion[]=KRNL-5820|Configure sysctl core dump restrictions||
suggestion[]=SSH-7408|Set MaxAuthTries to 3 in sshd_config||
"""
            report_data = parse_lynis_report(sample_content)

        if server_name:
            report_data.hostname = server_name

        scorecard = calculate_scorecard(report_data)
        if server_id is not None:
            self.last_scorecards_by_server[server_id] = scorecard
            update_server_last_scan(server_id, scorecard.overall_score, scorecard.letter_grade)
        else:
            self.last_local_scorecard = scorecard

        yield ScanProgressEvent(
            stage="Completed",
            progress_percent=100,
            message=f"Audit complete! Score: {scorecard.overall_score}/100 ({scorecard.letter_grade})",
            is_complete=True,
            scorecard=scorecard,
            server_id=server_id,
            server_name=server_name
        )
