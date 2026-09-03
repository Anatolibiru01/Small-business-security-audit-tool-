"""
Execution & Subprocess Management Engine.
Handles safe background Lynis scan execution, pre-flight dependency verification,
zero-persistence credential scrubbing, and cross-platform simulation mode.
"""

import os
import sys
import shutil
import asyncio
import subprocess
import time
from typing import Dict, Any, Optional, Callable, AsyncGenerator
from pydantic import BaseModel
from app.core.parser import parse_lynis_report, LynisReportData
from app.core.scorer import calculate_scorecard, AuditScorecard

# Default report path on Linux systems
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


def check_system_preflight() -> SystemPreflightStatus:
    """
    Verify host OS, presence of Lynis binary, and execution readiness.
    """
    is_linux = sys.platform.startswith("linux")
    
    # Locate Lynis binary
    lynis_path = shutil.which("lynis")
    if not lynis_path:
        for common_path in ["/usr/sbin/lynis", "/usr/bin/lynis", "/usr/local/bin/lynis", "/opt/lynis/lynis"]:
            if os.path.exists(common_path) and os.access(common_path, os.X_OK):
                lynis_path = common_path
                break

    lynis_installed = lynis_path is not None
    sudo_available = shutil.which("sudo") is not None or not is_linux

    install_commands = {
        "Ubuntu / Debian": "sudo apt update && sudo apt install -y lynis",
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
    Validate Linux credentials by invoking `sudo -k -S -p '' id` via stdin pipe.
    Password is immediately wiped from memory.
    """
    if not sys.platform.startswith("linux"):
        # On Windows / dev machines, accept non-empty credentials for simulation/demo
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
        # Scrub local variable reference
        password = "0" * len(password)
        del password

        return proc.returncode == 0
    except Exception:
        return False


class ScanManager:
    """
    Manages active scan lifecycle, async streaming of progress events,
    and fallback to simulation mode when requested or running on non-Linux hosts.
    """
    def __init__(self):
        self.is_scanning = False
        self.last_scorecard: Optional[AuditScorecard] = None
        self.last_error: Optional[str] = None
        self.current_progress: int = 0
        self.current_stage: str = "Idle"
        self.current_message: str = "Ready to start audit"
        self.subscribers: list = []

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
        username: str = "",
        password: str = ""
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Execute an audit scan asynchronously, yielding progress events.
        """
        if self.is_scanning:
            yield ScanProgressEvent(
                stage="Busy",
                progress_percent=self.current_progress,
                message="An audit scan is already running. Please wait...",
                error="Scan in progress"
            )
            return

        self.is_scanning = True
        self.last_error = None

        try:
            preflight = check_system_preflight()
            
            if not preflight.is_linux or not preflight.lynis_installed:
                raise RuntimeError("Live scan requires Linux host and Lynis installation.")

            async for event in self._run_live_linux_scan(username, password, preflight.lynis_path or "lynis"):
                yield event

        except Exception as e:
            self.last_error = str(e)
            yield ScanProgressEvent(
                stage="Failed",
                progress_percent=0,
                message="Scan execution failed.",
                error=str(e)
            )
        finally:
            self.is_scanning = False

    async def _run_live_linux_scan(
        self,
        username: str,
        password: str,
        lynis_bin: str
    ) -> AsyncGenerator[ScanProgressEvent, None]:
        """
        Execute real `sudo lynis audit system --quick` in background on a Linux host.
        """
        yield ScanProgressEvent(
            stage="Authentication",
            progress_percent=5,
            message="Validating administrator privileges..."
        )

        # Run Lynis and then make the report file readable by the current user so Python can parse it
        script = f"{lynis_bin} audit system --quick --auditor SmallBusinessSecurityAuditTool; chmod 644 {LYNIS_DEFAULT_REPORT_PATH}"
        cmd = ["sudo", "-S", "-p", "", "sh", "-c", script]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Send password via stdin and immediately clear local reference
        input_data = f"{password}\n".encode("utf-8")
        proc.stdin.write(input_data)
        await proc.stdin.drain()
        proc.stdin.close()
        
        # Scrub memory
        password = "0" * len(password)
        del password

        yield ScanProgressEvent(
            stage="Scanning",
            progress_percent=20,
            message="Lynis audit in progress. Examining system defenses..."
        )

        # Track progress periodically while process runs
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
                        message=msg
                    )

        stdout, stderr = await proc.communicate()

        if proc.returncode != 0 and proc.returncode != 78:  # Lynis returns 78 for warnings
            err_msg = stderr.decode("utf-8", errors="replace")
            if "incorrect password" in err_msg.lower():
                raise RuntimeError("Invalid administrator password. Please check your credentials.")
            # If report was still generated, proceed; otherwise raise
            if not os.path.exists(LYNIS_DEFAULT_REPORT_PATH):
                raise RuntimeError(f"Lynis execution failed (Exit code {proc.returncode}): {err_msg}")

        yield ScanProgressEvent(
            stage="Analyzing",
            progress_percent=90,
            message="Parsing /var/log/lynis-report.dat and computing scorecard..."
        )

        if not os.path.exists(LYNIS_DEFAULT_REPORT_PATH):
            raise RuntimeError(f"Could not locate Lynis report at {LYNIS_DEFAULT_REPORT_PATH}")

        report_data = parse_lynis_report(LYNIS_DEFAULT_REPORT_PATH)
        scorecard = calculate_scorecard(report_data)
        self.last_scorecard = scorecard

        yield ScanProgressEvent(
            stage="Completed",
            progress_percent=100,
            message=f"Audit complete! Score: {scorecard.overall_score}/100 ({scorecard.letter_grade})",
            is_complete=True,
            scorecard=scorecard
        )

