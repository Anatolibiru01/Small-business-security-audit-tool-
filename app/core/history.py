"""
Scan History & Storage Engine.
Stores past audit scorecards in a lightweight SQLite database for trend tracking.
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.core.scorer import AuditScorecard

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
DB_PATH = os.path.join(DB_DIR, "audit_history.db")


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_history_db():
    """
    Initialize SQLite tables for scan history.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    conn.commit()
    conn.close()


def save_scan_record(scorecard: AuditScorecard) -> int:
    """
    Save an AuditScorecard to the history database. Returns the record ID.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    scorecard_dict = scorecard.model_dump()
    
    cursor.execute("""
        INSERT INTO scan_records (
            timestamp, hostname, os_name, overall_score, letter_grade,
            risk_level, total_findings, critical_count, high_count,
            medium_count, low_count, firewall_active, scorecard_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
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


def get_scan_history(limit: int = 15) -> List[Dict[str, Any]]:
    """
    Retrieve past scan summaries for trend tracking.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, timestamp, hostname, os_name, overall_score,
               letter_grade, risk_level, total_findings,
               critical_count, high_count, medium_count, low_count, firewall_active
        FROM scan_records
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


def get_scan_by_id(scan_id: int) -> Optional[AuditScorecard]:
    """
    Retrieve full scorecard by history record ID.
    """
    init_history_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT scorecard_json FROM scan_records WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        data = json.loads(row["scorecard_json"])
        return AuditScorecard(**data)
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
