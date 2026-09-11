"""
SSH Client Engine for Remote Linux Auditing.
Handles remote SSH connections, authentication (password/keys), remote OS discovery,
automated Lynis installation, privileged execution with sudo escalation,
real-time stream parsing, and remote audit log retrieval.
"""

import io
import os
import time
import socket
from typing import Optional, Dict, Any, Tuple, Callable
from pydantic import BaseModel

from app.core.servers import ServerProfile

try:
    import paramiko
    PARAMIKO_AVAILABLE = True
except ImportError:
    PARAMIKO_AVAILABLE = False


class RemotePreflightStatus(BaseModel):
    connected: bool = False
    hostname: str = ""
    os_name: str = ""
    kernel: str = ""
    lynis_installed: bool = False
    lynis_path: Optional[str] = None
    lynis_version: Optional[str] = None
    has_sudo: bool = False
    latency_ms: int = 0
    error: Optional[str] = None


class SSHConnectionManager:
    """
    Manages SSH client creation, authentication, and execution over Paramiko.
    """
    def __init__(self, server: ServerProfile, timeout: float = 15.0):
        self.server = server
        self.timeout = timeout
        self.client: Optional[Any] = None

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def connect(self):
        if not PARAMIKO_AVAILABLE:
            raise RuntimeError(
                "Paramiko SSH library is not installed in the active Python environment. "
                "Please run: pip install paramiko cryptography"
            )

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs: Dict[str, Any] = {
            "hostname": self.server.host,
            "port": self.server.port,
            "username": self.server.username,
            "timeout": self.timeout,
            "banner_timeout": self.timeout,
            "auth_timeout": self.timeout,
        }

        if self.server.auth_type == "key" and self.server.private_key:
            key_file = io.StringIO(self.server.private_key.strip())
            pkey = None
            for key_class in [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.DSSKey]:
                key_file.seek(0)
                try:
                    pkey = key_class.from_private_key(key_file, password=self.server.passphrase)
                    break
                except Exception:
                    continue

            if pkey is None:
                raise ValueError("Could not parse the provided SSH private key. Supported: RSA, Ed25519, ECDSA.")
            connect_kwargs["pkey"] = pkey
        else:
            connect_kwargs["password"] = self.server.password or ""

        try:
            client.connect(**connect_kwargs)
            self.client = client
        except paramiko.AuthenticationException as e:
            raise RuntimeError(f"SSH authentication failed for {self.server.username}@{self.server.host}: {str(e)}")
        except (socket.timeout, TimeoutError):
            raise RuntimeError(f"SSH connection timed out connecting to {self.server.host}:{self.server.port}")
        except Exception as e:
            raise RuntimeError(f"Failed to connect to {self.server.host}:{self.server.port} over SSH: {str(e)}")

    def close(self):
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None

    def exec_command(self, cmd: str, sudo_pass: Optional[str] = None, timeout: Optional[float] = 30.0) -> Tuple[int, str, str]:
        """
        Execute command on remote server with PATH enrichment and clean stdin sudo support.
        """
        if not self.client:
            raise RuntimeError("SSH Client is not connected.")

        # Ensure administrative sbin paths are always present in SSH session PATH
        full_cmd = f'export PATH="$PATH:/usr/sbin:/sbin:/usr/local/sbin:/usr/local/bin:/opt/lynis"; {cmd}'

        stdin, stdout, stderr = self.client.exec_command(full_cmd, get_pty=False, timeout=timeout)
        
        if sudo_pass:
            stdin.write(f"{sudo_pass}\n")
            stdin.flush()
        stdin.close()

        stdout_text = stdout.read().decode("utf-8", errors="replace")
        stderr_text = stderr.read().decode("utf-8", errors="replace")
        exit_code = stdout.channel.recv_exit_status()

        return exit_code, stdout_text, stderr_text


def test_ssh_connection(server: ServerProfile) -> RemotePreflightStatus:
    """
    Probe remote host over SSH, check OS version, Lynis binary presence, and sudo privileges.
    """
    status = RemotePreflightStatus()
    start_time = time.time()

    try:
        with SSHConnectionManager(server, timeout=10.0) as mgr:
            latency = int((time.time() - start_time) * 1000)
            status.connected = True
            status.latency_ms = latency

            # 1. Hostname
            code, out, _ = mgr.exec_command("hostname")
            status.hostname = out.strip() if code == 0 else server.host

            # 2. Kernel & OS
            code, out, _ = mgr.exec_command("uname -sr")
            status.kernel = out.strip() if code == 0 else ""

            code, out, _ = mgr.exec_command("cat /etc/os-release 2>/dev/null || cat /etc/issue 2>/dev/null")
            if code == 0 and out:
                for line in out.splitlines():
                    if line.startswith("PRETTY_NAME="):
                        status.os_name = line.split("=", 1)[1].strip('"\'')
                        break
            if not status.os_name:
                status.os_name = status.kernel or "Linux"

            # 3. Lynis presence (checking /usr/sbin, /usr/bin, /opt/lynis)
            code, out, _ = mgr.exec_command(
                "which lynis 2>/dev/null || ls /usr/sbin/lynis /usr/bin/lynis /opt/lynis/lynis 2>/dev/null | head -n 1"
            )
            lynis_bin = out.strip().splitlines()[0] if out.strip() else ""
            if lynis_bin and ("lynis" in lynis_bin):
                status.lynis_installed = True
                status.lynis_path = lynis_bin
                
                # Check version
                vcode, vout, _ = mgr.exec_command(f"{lynis_bin} --version 2>/dev/null | head -n 1")
                if vcode == 0 and vout:
                    status.lynis_version = vout.strip()
            else:
                status.lynis_installed = False

            # 4. Sudo check
            sudo_pass = server.sudo_password or server.password or ""
            if server.username == "root":
                status.has_sudo = True
            else:
                scode, sout, serr = mgr.exec_command("echo '' | sudo -S -p '' id 2>&1", sudo_pass=sudo_pass)
                status.has_sudo = (scode == 0 or "uid=0" in sout or "root" in sout)

    except Exception as e:
        status.connected = False
        status.error = str(e)

    return status


def ensure_remote_lynis_installed(
    mgr: SSHConnectionManager,
    server: ServerProfile,
    progress_callback: Optional[Callable[[str, int, str], None]] = None
) -> str:
    """
    Verifies Lynis binary is present on remote machine; if missing, installs it quickly.
    """
    sudo_pass = server.sudo_password or server.password or ""
    prefix = "" if server.username == "root" else "sudo -S -p '' "
    
    # 1. Check existing binary in PATH, /usr/sbin, /usr/bin, or /opt/lynis
    code, out, _ = mgr.exec_command(
        "which lynis 2>/dev/null || ls /usr/sbin/lynis /usr/bin/lynis /usr/local/bin/lynis /opt/lynis/lynis 2>/dev/null | head -n 1"
    )
    existing_path = out.strip().splitlines()[0] if out.strip() else ""
    if existing_path and ("lynis" in existing_path):
        return existing_path

    if progress_callback:
        progress_callback("Installing", 12, "Lynis engine not found. Setting up lightweight Lynis...")

    # 2. Fast Clone directly into /opt/lynis (takes ~2 seconds, zero package manager delay)
    clone_cmd = f"{prefix}sh -c 'git clone --depth=1 https://github.com/CISOfy/lynis.git /opt/lynis 2>/dev/null && ln -sf /opt/lynis/lynis /usr/local/bin/lynis'"
    code, out, err = mgr.exec_command(clone_cmd, sudo_pass=sudo_pass, timeout=30.0)

    # Re-check binary
    code, out, _ = mgr.exec_command("which lynis 2>/dev/null || ls /opt/lynis/lynis /usr/local/bin/lynis 2>/dev/null | head -n 1")
    path = out.strip().splitlines()[0] if out.strip() else ""
    if path and "lynis" in path:
        return path

    # 3. Fallback: APT / DNF install
    pkg_cmd = f"{prefix}sh -c 'DEBIAN_FRONTEND=noninteractive apt-get install -y -qq lynis 2>/dev/null || dnf install -y lynis 2>/dev/null'"
    code, out, err = mgr.exec_command(pkg_cmd, sudo_pass=sudo_pass, timeout=40.0)

    code, out, _ = mgr.exec_command("which lynis 2>/dev/null || ls /usr/sbin/lynis /usr/bin/lynis /opt/lynis/lynis 2>/dev/null | head -n 1")
    path = out.strip().splitlines()[0] if out.strip() else ""
    if path and "lynis" in path:
        return path

    raise RuntimeError(
        "Could not detect Lynis on remote server. Please run 'sudo apt install lynis' in your Kali terminal, then re-scan."
    )


def execute_remote_lynis_scan(
    server: ServerProfile,
    progress_callback: Callable[[str, int, str], None]
) -> Tuple[str, str]:
    """
    Connects to remote server over SSH, executes `lynis audit system --quick --cronjob`,
    streams real-time test progress, and retrieves audit report.
    """
    progress_callback("Connecting", 5, f"Establishing SSH session to {server.host}:{server.port}...")

    with SSHConnectionManager(server, timeout=15.0) as mgr:
        progress_callback("Authentication", 10, f"Authenticated as '{server.username}'. Checking Lynis engine...")

        lynis_bin = ensure_remote_lynis_installed(mgr, server, progress_callback)

        progress_callback("Initializing", 20, f"Launching Lynis security audit via {lynis_bin}...")

        sudo_pass = server.sudo_password or server.password or ""
        prefix = "" if server.username == "root" else "sudo -S -p '' "
        
        # We output the report to /tmp/lynis-report.dat to avoid /var/log permission restrictions
        audit_script = (
            f'export PATH="$PATH:/usr/sbin:/sbin:/usr/local/sbin:/usr/local/bin:/opt/lynis"; '
            f'{prefix}rm -f /tmp/lynis-report.dat /tmp/lynis.log /var/log/lynis-report.dat /var/log/lynis.log 2>/dev/null; '
            f'{prefix}{lynis_bin} audit system --quick --cronjob --auditor Lynislens '
            f'--report-file /tmp/lynis-report.dat --log-file /tmp/lynis.log; '
            f'{prefix}chmod 666 /tmp/lynis-report.dat /tmp/lynis.log /var/log/lynis-report.dat /var/log/lynis.log 2>/dev/null'
        )

        stdin, stdout, stderr = mgr.client.exec_command(audit_script, get_pty=False, timeout=300.0)
        
        if sudo_pass and server.username != "root":
            stdin.write(f"{sudo_pass}\n")
            stdin.flush()
        stdin.close()

        progress_pct = 25
        section_weights = {
            "System Tools": 30,
            "Boot and services": 35,
            "Kernel": 40,
            "Memory and Processes": 45,
            "Users, Groups and Authentication": 50,
            "Shells": 55,
            "File systems": 60,
            "Storage": 65,
            "NFS": 68,
            "Name services": 70,
            "Ports and packages": 75,
            "Networking": 78,
            "Printers and Spools": 80,
            "Software: e-mail and messaging": 82,
            "Software: firewalls": 84,
            "Software: webserver": 86,
            "SSH Support": 88,
            "SNMP": 89,
            "Databases": 90,
            "Security frameworks": 92,
            "Software: integrity": 94,
            "Software: logfiles": 95,
            "Time and Synchronization": 96,
            "Cryptography": 97,
            "Hardening": 98
        }

        full_output = []
        for line in iter(stdout.readline, ""):
            full_output.append(line)
            clean_line = line.strip()

            for section, pct in section_weights.items():
                if f"[+] {section}" in clean_line or f"+- {section}" in clean_line or section.lower() in clean_line.lower():
                    if pct > progress_pct:
                        progress_pct = pct
                        progress_callback("Auditing", progress_pct, f"Auditing {section}...")
                    break

        exit_code = stdout.channel.recv_exit_status()
        
        progress_callback("Collecting", 95, "Retrieving audit report from remote host...")

        # 1. Try reading /tmp/lynis-report.dat
        code, report_text, _ = mgr.exec_command("cat /tmp/lynis-report.dat 2>/dev/null || cat /var/log/lynis-report.dat 2>/dev/null")
        
        # 2. If empty, try sudo cat
        if not report_text.strip() or "hardening_index=" not in report_text:
            code, report_text, _ = mgr.exec_command(
                f"{prefix}cat /tmp/lynis-report.dat 2>/dev/null || {prefix}cat /var/log/lynis-report.dat 2>/dev/null",
                sudo_pass=sudo_pass
            )

        # 3. If still empty, check full terminal output for report lines or throw clear error
        if not report_text.strip() or "hardening_index=" not in report_text:
            err_details = "".join(full_output[-20:])
            if "incorrect password" in err_details.lower():
                raise RuntimeError("Invalid Sudo password for user on remote server.")
            raise RuntimeError(
                f"Lynis executed, but report data could not be retrieved from /tmp/lynis-report.dat. "
                f"Exit code: {exit_code}. Details: {err_details[:200]}"
            )

        # Get log data
        code, log_text, _ = mgr.exec_command("cat /tmp/lynis.log 2>/dev/null || cat /var/log/lynis.log 2>/dev/null")

        return report_text, log_text
