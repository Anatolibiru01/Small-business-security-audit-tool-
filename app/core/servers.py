"""
Server Registry & Management Engine.
Handles target server profiles, credentials, SQLite persistence,
enrollment tokens for Enterprise Push agents, and security masking.
"""

import os
import secrets
import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.config import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "audit_history.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_servers_db():
    """
    Initialize SQLite table for registered servers with safe migrations.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 22,
            username TEXT NOT NULL DEFAULT 'root',
            auth_type TEXT NOT NULL DEFAULT 'password',
            password TEXT,
            private_key TEXT,
            passphrase TEXT,
            sudo_password TEXT,
            is_local INTEGER NOT NULL DEFAULT 0,
            enrollment_token TEXT UNIQUE,
            agent_mode TEXT DEFAULT 'push',
            last_heartbeat TEXT,
            description TEXT,
            tags TEXT,
            status TEXT DEFAULT 'unknown',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_scan_at TEXT,
            last_score INTEGER,
            last_grade TEXT
        )
    """)
    
    # Safe migrations
    cursor.execute("PRAGMA table_info(servers)")
    columns = [col["name"] for col in cursor.fetchall()]
    if "enrollment_token" not in columns:
        cursor.execute("ALTER TABLE servers ADD COLUMN enrollment_token TEXT")
    if "agent_mode" not in columns:
        cursor.execute("ALTER TABLE servers ADD COLUMN agent_mode TEXT DEFAULT 'push'")
    if "last_heartbeat" not in columns:
        cursor.execute("ALTER TABLE servers ADD COLUMN last_heartbeat TEXT")

    conn.commit()
    conn.close()


def generate_enrollment_token() -> str:
    """
    Generate a secure random enrollment token for enterprise push agents.
    """
    return f"LL-TOKEN-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"


class ServerBase(BaseModel):
    name: str = Field(..., description="Friendly name for the server")
    host: str = Field(..., description="IP address or domain name")
    port: int = Field(22, description="SSH port")
    username: str = Field("root", description="SSH user")
    auth_type: str = Field("password", description="'password' or 'key'")
    is_local: bool = Field(False, description="Whether this is the local machine")
    agent_mode: str = Field("push", description="'push' (Enterprise Outbound) or 'ssh' (Direct)")
    description: Optional[str] = Field(None, description="Optional notes or environment description")
    tags: Optional[str] = Field(None, description="Comma-separated tags e.g. 'web,prod,kali'")


class ServerCreate(ServerBase):
    password: Optional[str] = None
    private_key: Optional[str] = None
    passphrase: Optional[str] = None
    sudo_password: Optional[str] = None
    enrollment_token: Optional[str] = None


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    auth_type: Optional[str] = None
    password: Optional[str] = None
    private_key: Optional[str] = None
    passphrase: Optional[str] = None
    sudo_password: Optional[str] = None
    is_local: Optional[bool] = None
    agent_mode: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None


class ServerProfile(ServerBase):
    id: int
    password: Optional[str] = None
    private_key: Optional[str] = None
    passphrase: Optional[str] = None
    sudo_password: Optional[str] = None
    enrollment_token: Optional[str] = None
    agent_mode: str = "push"
    last_heartbeat: Optional[str] = None
    status: str = "unknown"
    created_at: str
    updated_at: str
    last_scan_at: Optional[str] = None
    last_score: Optional[int] = None
    last_grade: Optional[str] = None

    def to_response(self) -> "ServerResponse":
        return ServerResponse(
            id=self.id,
            name=self.name,
            host=self.host,
            port=self.port,
            username=self.username,
            auth_type=self.auth_type,
            is_local=self.is_local,
            agent_mode=self.agent_mode,
            enrollment_token=self.enrollment_token,
            last_heartbeat=self.last_heartbeat,
            description=self.description,
            tags=self.tags,
            status=self.status,
            created_at=self.created_at,
            updated_at=self.updated_at,
            last_scan_at=self.last_scan_at,
            last_score=self.last_score,
            last_grade=self.last_grade,
            has_password=bool(self.password),
            has_private_key=bool(self.private_key),
            has_sudo_password=bool(self.sudo_password)
        )


class ServerResponse(ServerBase):
    id: int
    enrollment_token: Optional[str] = None
    agent_mode: str = "push"
    last_heartbeat: Optional[str] = None
    status: str = "unknown"
    created_at: str
    updated_at: str
    last_scan_at: Optional[str] = None
    last_score: Optional[int] = None
    last_grade: Optional[str] = None
    has_password: bool = False
    has_private_key: bool = False
    has_sudo_password: bool = False


def _row_to_profile(row: sqlite3.Row) -> ServerProfile:
    # Safely retrieve potentially new columns with defaults
    agent_mode = "push"
    token = None
    heartbeat = None
    try:
        agent_mode = row["agent_mode"] or "push"
    except (IndexError, KeyError):
        pass
    try:
        token = row["enrollment_token"]
    except (IndexError, KeyError):
        pass
    try:
        heartbeat = row["last_heartbeat"]
    except (IndexError, KeyError):
        pass

    return ServerProfile(
        id=row["id"],
        name=row["name"],
        host=row["host"],
        port=row["port"],
        username=row["username"],
        auth_type=row["auth_type"],
        password=row["password"],
        private_key=row["private_key"],
        passphrase=row["passphrase"],
        sudo_password=row["sudo_password"],
        is_local=bool(row["is_local"]),
        enrollment_token=token,
        agent_mode=agent_mode,
        last_heartbeat=heartbeat,
        description=row["description"],
        tags=row["tags"],
        status=row["status"] or "unknown",
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        last_scan_at=row["last_scan_at"],
        last_score=row["last_score"],
        last_grade=row["last_grade"]
    )


def create_server(data: ServerCreate) -> ServerProfile:
    """
    Register a new server profile in the database.
    """
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    token = data.enrollment_token or generate_enrollment_token()
    
    cursor.execute("""
        INSERT INTO servers (
            name, host, port, username, auth_type, password, private_key,
            passphrase, sudo_password, is_local, enrollment_token, agent_mode,
            description, tags, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.name.strip(),
        data.host.strip(),
        data.port,
        data.username.strip(),
        data.auth_type,
        data.password,
        data.private_key,
        data.passphrase,
        data.sudo_password,
        1 if data.is_local else 0,
        token,
        data.agent_mode,
        data.description,
        data.tags,
        "unknown",
        now,
        now
    ))
    
    server_id = cursor.lastrowid or 0
    conn.commit()
    conn.close()
    
    profile = get_server_by_id(server_id)
    if not profile:
        raise RuntimeError("Failed to retrieve newly created server profile.")
    return profile


def get_servers() -> List[ServerResponse]:
    """
    Retrieve all registered servers with credentials masked.
    """
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM servers ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    
    return [_row_to_profile(r).to_response() for r in rows]


def get_server_by_id(server_id: int) -> Optional[ServerProfile]:
    """
    Retrieve full server profile with credentials for internal execution.
    """
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM servers WHERE id = ?", (server_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return _row_to_profile(row)
    return None


def get_server_by_token(token: str) -> Optional[ServerProfile]:
    """
    Find server profile matching an enrollment token.
    """
    if not token:
        return None
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM servers WHERE enrollment_token = ?", (token.strip(),))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return _row_to_profile(row)
    return None


def create_or_update_push_server(
    token: str,
    hostname: str,
    ip: str = "",
    os_name: str = ""
) -> ServerProfile:
    """
    Auto-enroll or update a server when an Enterprise Push Agent posts a report.
    """
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    existing = get_server_by_token(token)
    if existing:
        # Update server host & heartbeat & hostname from report data
        resolved_host = ip if (ip and ip != "testclient") else (hostname or existing.host or "127.0.0.1")
        resolved_name = hostname if hostname else (existing.name or "Enterprise Linux Host")
        cursor.execute("""
            UPDATE servers SET
                name = ?, host = ?, last_heartbeat = ?, status = 'online', updated_at = ?
            WHERE id = ?
        """, (resolved_name, resolved_host, now, now, existing.id))
        conn.commit()
        conn.close()
        return get_server_by_id(existing.id)


    # Auto-register new host profile for this token
    display_name = hostname if (hostname and hostname != "testclient") else (ip or "Enterprise Linux Host")
    host_addr = ip if (ip and ip != "testclient") else (hostname or "127.0.0.1")
    
    cursor.execute("""
        INSERT INTO servers (
            name, host, port, username, auth_type, is_local, enrollment_token,
            agent_mode, last_heartbeat, status, created_at, updated_at
        ) VALUES (?, ?, 22, 'root', 'agent', 0, ?, 'push', ?, 'online', ?, ?)
    """, (
        display_name,
        host_addr,
        token,
        now,
        now,
        now
    ))
    
    server_id = cursor.lastrowid or 0
    conn.commit()

    conn.close()
    return get_server_by_id(server_id)


def get_server_response_by_id(server_id: int) -> Optional[ServerResponse]:
    profile = get_server_by_id(server_id)
    if profile:
        return profile.to_response()
    return None


def update_server(server_id: int, update: ServerUpdate) -> Optional[ServerProfile]:
    """
    Update server fields. Blank credentials are preserved if not provided.
    """
    existing = get_server_by_id(server_id)
    if not existing:
        return None

    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    name = update.name.strip() if update.name is not None else existing.name
    host = update.host.strip() if update.host is not None else existing.host
    port = update.port if update.port is not None else existing.port
    username = update.username.strip() if update.username is not None else existing.username
    auth_type = update.auth_type if update.auth_type is not None else existing.auth_type
    
    password = update.password if update.password is not None else existing.password
    private_key = update.private_key if update.private_key is not None else existing.private_key
    passphrase = update.passphrase if update.passphrase is not None else existing.passphrase
    sudo_password = update.sudo_password if update.sudo_password is not None else existing.sudo_password
    
    is_local = (1 if update.is_local else 0) if update.is_local is not None else (1 if existing.is_local else 0)
    agent_mode = update.agent_mode if update.agent_mode is not None else existing.agent_mode
    description = update.description if update.description is not None else existing.description
    tags = update.tags if update.tags is not None else existing.tags

    cursor.execute("""
        UPDATE servers SET
            name = ?, host = ?, port = ?, username = ?, auth_type = ?,
            password = ?, private_key = ?, passphrase = ?, sudo_password = ?,
            is_local = ?, agent_mode = ?, description = ?, tags = ?, updated_at = ?
        WHERE id = ?
    """, (
        name, host, port, username, auth_type,
        password, private_key, passphrase, sudo_password,
        is_local, agent_mode, description, tags, now, server_id
    ))
    
    conn.commit()
    conn.close()
    return get_server_by_id(server_id)


def delete_server(server_id: int) -> bool:
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM servers WHERE id = ?", (server_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def update_server_last_scan(server_id: int, score: int, grade: str):
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE servers SET
            last_scan_at = ?,
            last_score = ?,
            last_grade = ?,
            status = 'online',
            last_heartbeat = ?,
            updated_at = ?
        WHERE id = ?
    """, (now, score, grade, now, now, server_id))
    conn.commit()
    conn.close()


def update_server_status(server_id: int, status: str):
    init_servers_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE servers SET status = ?, updated_at = ? WHERE id = ?
    """, (status, now, server_id))
    conn.commit()
    conn.close()
