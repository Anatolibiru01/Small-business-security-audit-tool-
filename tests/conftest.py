import pytest
import os
import sqlite3
import app.core.servers as servers_mod
import app.core.history as history_mod

@pytest.fixture(autouse=True)
def isolate_test_db(monkeypatch, tmp_path):
    """
    Automatically creates an isolated SQLite test database for each test run,
    preventing any test from polluting production data/audit_history.db.
    """
    test_db = str(tmp_path / "test_audit_history.db")
    
    # Monkeypatch the DB_PATH across modules
    monkeypatch.setattr(servers_mod, "DB_PATH", test_db)
    monkeypatch.setattr(history_mod, "DB_PATH", test_db)
    
    # Initialize schemas
    servers_mod.init_servers_db()
    history_mod.init_history_db()
    
    yield test_db
