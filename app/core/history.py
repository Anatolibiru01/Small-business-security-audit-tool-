"""
Scan History & Storage Engine.
Stores past audit scorecards in SQLite database for trend tracking,
supporting multi-server filtering and scorecard retrieval.
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Union
from app.core.scorer import AuditScorecard
from app.config import DATA_DIR

DB_PATH = os.path.join(DATA_DIR, "audit_history.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_history_db():
    """
    Initialize SQLite tables for scan history and apply schema migrations.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id INTEGER,
            server_name TEXT,
            timestamp TEXT NOT NULL,
            hostname TEXT NOT NULL,
            os_name TEXT NOT NULL,
            overall_score INTEGER NOT NULL,
            letter_grade TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            total_findings INTEGER NOT NULL,
            critical_count INTEGER NOT NULL,
            high_count INTEGER NOT NULL,
            medium_count INTEGER NOT NULL,
            low_count INTEGER NOT NULL,
            firewall_active INTEGER NOT NULL,
            scorecard_json TEXT NOT NULL
        )
    """)
    
    # Safe migration: ensure server_id and server_name exist if upgrading existing DB
    cursor.execute("PRAGMA table_info(scan_records)")
    columns = [col["name"] for col in cursor.fetchall()]
    if "server_id" not in columns:
        cursor.execute("ALTER TABLE scan_records ADD COLUMN server_id INTEGER")
    if "server_name" not in columns:
        cursor.execute("ALTER TABLE scan_records ADD COLUMN server_name TEXT")

    conn.commit()
    conn.close()


def save_scan_record(
    scorecard: AuditScorecard,
    server_id: Optional[int] = None,
    server_name: Optional[str] = None
) -> int:
    """
    Save an AuditScorecard to the history database associated with a server.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scorecard_dict = scorecard.model_dump()
    scorecard_dict["scan_time"] = timestamp
    
    cursor.execute("""
        INSERT INTO scan_records (
            server_id, server_name, timestamp, hostname, os_name,
            overall_score, letter_grade, risk_level, total_findings,
            critical_count, high_count, medium_count, low_count,
            firewall_active, scorecard_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        server_id,
        server_name or scorecard.hostname,
        timestamp,
        scorecard.hostname,
        scorecard.os_name,
        scorecard.overall_score,
        scorecard.letter_grade,
        scorecard.risk_level,
        scorecard.total_findings,
        scorecard.critical_count,
        scorecard.high_count,
        scorecard.medium_count,
        scorecard.low_count,
        1 if scorecard.firewall_active else 0,
        json.dumps(scorecard_dict)
    ))
    
    record_id = cursor.lastrowid or 0
    conn.commit()
    conn.close()
    return record_id


def get_scan_history(
    limit: int = 20,
    server_id: Optional[Any] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve past scan summaries, optionally filtered by server_id.
    - server_id == 'local' or 'localhost': only returns local machine scans (WHERE server_id IS NULL)
    - server_id is an integer (or int string): returns scans for that remote server
    - server_id is None or 'all': returns scans across all assets
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if str(server_id).lower() in ["local", "localhost", "null", "none_str"]:
        cursor.execute("""
            SELECT id, server_id, server_name, timestamp, hostname, os_name,
                   overall_score, letter_grade, risk_level, total_findings,
                   critical_count, high_count, medium_count, low_count, firewall_active
            FROM scan_records
            WHERE server_id IS NULL
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
    elif server_id is not None and str(server_id).isdigit():
        cursor.execute("""
            SELECT id, server_id, server_name, timestamp, hostname, os_name,
                   overall_score, letter_grade, risk_level, total_findings,
                   critical_count, high_count, medium_count, low_count, firewall_active
            FROM scan_records
            WHERE server_id = ?
            ORDER BY id DESC
            LIMIT ?
        """, (int(server_id), limit))
    else:
        cursor.execute("""
            SELECT id, server_id, server_name, timestamp, hostname, os_name,
                   overall_score, letter_grade, risk_level, total_findings,
                   critical_count, high_count, medium_count, low_count, firewall_active
            FROM scan_records
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
    
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


from app.core.knowledge_base import get_remediation_details


def _enrich_scorecard_data(data: Dict[str, Any]) -> AuditScorecard:
    """
    Ensure all findings in the scorecard remediation feed have real,
    actionable remediation commands and structured details.
    """
    feed = data.get("remediation_feed", [])
    for item in feed:
        test_id = item.get("test_id", "")
        raw_text = item.get("plain_english") or item.get("description", "")
        cmd = item.get("remediation_cmd", "")
        how_to_solve = item.get("how_to_solve", "")

        # If missing or contains legacy placeholder text, re-fetch from knowledge base
        if not cmd or "Review Lynis documentation" in cmd or "lynis show details" in cmd or not how_to_solve:
            details = get_remediation_details(
                test_id=test_id,
                raw_text=raw_text,
                is_warning=item.get("is_warning", False)
            )
            item["control_detail"] = details.get("control_detail", item.get("control_detail", ""))
            item["description"] = details.get("description", item.get("description", ""))
            item["how_to_solve"] = details.get("how_to_solve", item.get("how_to_solve", ""))
            item["remediation_cmd"] = details.get("remediation_cmd", item.get("remediation_cmd", ""))
            item["compliance_mapping"] = details.get("compliance_mapping", item.get("compliance_mapping", {}))
            item["estimated_time"] = details.get("estimated_time", item.get("estimated_time", "5 mins"))
            item["difficulty"] = details.get("difficulty", item.get("difficulty", "Easy"))
            item["rollback_note"] = details.get("rollback_note", item.get("rollback_note", ""))

    # Ensure letter_grade and risk_level dynamically match the current 5-tier standard
    score = data.get("overall_score")
    if score is not None:
        if score >= 95:
            data["letter_grade"] = "A+"
            data["risk_level"] = "Low Risk"
        elif score >= 90:
            data["letter_grade"] = "A"
            data["risk_level"] = "Low Risk"
        elif score >= 80:
            data["letter_grade"] = "B"
            data["risk_level"] = "Low Risk"
        elif score >= 70:
            data["letter_grade"] = "C"
            data["risk_level"] = "Moderate Risk"
        elif score >= 60:
            data["letter_grade"] = "D"
            data["risk_level"] = "Needs Attention"
        else:
            data["letter_grade"] = "F"
            data["risk_level"] = "Critical Risk"

    return AuditScorecard(**data)


def get_scan_by_id(scan_id: int) -> Optional[AuditScorecard]:
    """
    Retrieve full scorecard by history record ID.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT scorecard_json, timestamp FROM scan_records WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        data = json.loads(row["scorecard_json"])
        if not data.get("scan_time") and row["timestamp"]:
            data["scan_time"] = row["timestamp"]
        return _enrich_scorecard_data(data)
    return None


def get_latest_scan_for_server(server_id: Optional[Union[int, str]] = None) -> Optional[AuditScorecard]:
    """
    Retrieve the most recent AuditScorecard, strictly isolating Localhost vs Remote Servers.
    - server_id is None or 'local': queries WHERE server_id IS NULL (Localhost machine)
    - server_id is an integer (or numeric str): queries WHERE server_id = ? (Remote server)
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if server_id is not None and str(server_id).lower() not in ["local", "localhost", "none", ""]:
        cursor.execute("""
            SELECT scorecard_json, timestamp FROM scan_records
            WHERE server_id = ?
            ORDER BY id DESC LIMIT 1
        """, (int(server_id),))
    else:
        cursor.execute("""
            SELECT scorecard_json, timestamp FROM scan_records
            WHERE server_id IS NULL
            ORDER BY id DESC LIMIT 1
        """)
        
    row = cursor.fetchone()
    conn.close()
    
    if row:
        data = json.loads(row["scorecard_json"])
        if not data.get("scan_time") and row["timestamp"]:
            data["scan_time"] = row["timestamp"]
        return _enrich_scorecard_data(data)
    return None


def delete_scan_by_id(scan_id: int) -> bool:
    """
    Delete a scan record from history by ID.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM scan_records WHERE id = ?", (scan_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
