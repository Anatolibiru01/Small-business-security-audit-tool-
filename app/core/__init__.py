"""
Core parsing, scoring, servers, ssh client, and execution package for Lynislens.
"""
from app.core.parser import parse_lynis_report, LynisReportData
from app.core.scorer import calculate_scorecard, AuditScorecard
from app.core.knowledge_base import get_remediation_details, REMEDIATION_KB
from app.core.servers import (
    ServerProfile,
    ServerCreate,
    ServerUpdate,
    ServerResponse,
    create_server,
    get_servers,
    get_server_by_id,
    get_server_response_by_id,
    update_server,
    delete_server,
    init_servers_db
)
from app.core.ssh_client import (
    SSHConnectionManager,
    RemotePreflightStatus,
    test_ssh_connection,
    ensure_remote_lynis_installed,
    execute_remote_lynis_scan
)
from app.core.executor import (
    ScanManager,
    ScanProgressEvent,
    check_system_preflight,
    SystemPreflightStatus,
    verify_sudo_credentials
)
from app.core.history import (
    save_scan_record,
    get_scan_history,
    get_scan_by_id,
    get_latest_scan_for_server,
    delete_scan_by_id,
    init_history_db
)

__all__ = [
    "parse_lynis_report",
    "LynisReportData",
    "calculate_scorecard",
    "AuditScorecard",
    "get_remediation_details",
    "REMEDIATION_KB",
    "ServerProfile",
    "ServerCreate",
    "ServerUpdate",
    "ServerResponse",
    "create_server",
    "get_servers",
    "get_server_by_id",
    "get_server_response_by_id",
    "update_server",
    "delete_server",
    "init_servers_db",
    "SSHConnectionManager",
    "RemotePreflightStatus",
    "test_ssh_connection",
    "ensure_remote_lynis_installed",
    "execute_remote_lynis_scan",
    "ScanManager",
    "ScanProgressEvent",
    "check_system_preflight",
    "SystemPreflightStatus",
    "verify_sudo_credentials",
    "save_scan_record",
    "get_scan_history",
    "get_scan_by_id",
    "get_latest_scan_for_server",
    "delete_scan_by_id",
    "init_history_db"
]
