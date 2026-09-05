"""
Tests for Server Management, SSH Preflight, and Multi-Server Audit Execution.
"""

import pytest
from app.core.servers import (
    create_server,
    get_servers,
    get_server_by_id,
    update_server,
    delete_server,
    ServerCreate,
    ServerUpdate
)
from app.core.history import save_scan_record, get_scan_history, get_latest_scan_for_server
from app.core.scorer import calculate_scorecard
from app.core.parser import parse_lynis_report


def test_server_crud_and_masking():
    # 1. Create Server
    srv_data = ServerCreate(
        name="Kali Test VM",
        host="192.168.100.50",
        port=22,
        username="kali",
        auth_type="password",
        password="kalipassword123",
        sudo_password="kalipassword123",
        description="Local VMware test node",
        tags="vmware,kali,lab"
    )
    profile = create_server(srv_data)
    assert profile.id is not None
    assert profile.name == "Kali Test VM"
    assert profile.password == "kalipassword123"

    # 2. Verify Masking in ServerResponse
    resp = profile.to_response()
    assert resp.has_password is True
    assert resp.has_sudo_password is True
    assert not hasattr(resp, "password") or resp.model_dump().get("password") is None

    # 3. Retrieve Server
    fetched = get_server_by_id(profile.id)
    assert fetched is not None
    assert fetched.host == "192.168.100.50"

    # 4. Update Server
    up_data = ServerUpdate(name="Kali Security Lab Server", port=2222)
    updated = update_server(profile.id, up_data)
    assert updated is not None
    assert updated.name == "Kali Security Lab Server"
    assert updated.port == 2222
    # Verify password was preserved
    assert updated.password == "kalipassword123"

    # 5. List Servers
    all_servers = get_servers()
    assert any(s.id == profile.id for s in all_servers)

    # 6. Delete Server
    deleted = delete_server(profile.id)
    assert deleted is True
    assert get_server_by_id(profile.id) is None


def test_server_history_association():
    # Create two test servers
    srv1 = create_server(ServerCreate(name="Server Alpha", host="10.0.0.1", username="root"))
    srv2 = create_server(ServerCreate(name="Server Beta", host="10.0.0.2", username="root"))

    sample_content = """
auditor_version=3.0.8
os=Linux
os_name=Ubuntu 22.04 LTS
hostname=srv-alpha
hardening_index=72
firewall_active=1
ssh_daemon=1
installed_packages=800
vulnerable_packages=0
"""
    data1 = parse_lynis_report(sample_content)
    scorecard1 = calculate_scorecard(data1)
    
    # Save record for srv1
    rec1_id = save_scan_record(scorecard1, server_id=srv1.id, server_name=srv1.name)
    assert rec1_id > 0

    # Save record for srv2
    sample_content2 = sample_content.replace("srv-alpha", "srv-beta").replace("72", "85")
    data2 = parse_lynis_report(sample_content2)
    scorecard2 = calculate_scorecard(data2)
    rec2_id = save_scan_record(scorecard2, server_id=srv2.id, server_name=srv2.name)
    assert rec2_id > 0

    # Filter history by srv1
    hist_srv1 = get_scan_history(server_id=srv1.id)
    assert len(hist_srv1) >= 1
    assert all(h["server_id"] == srv1.id for h in hist_srv1)
    assert hist_srv1[0]["server_name"] == "Server Alpha"

    # Filter history by srv2
    hist_srv2 = get_scan_history(server_id=srv2.id)
    assert len(hist_srv2) >= 1
    assert all(h["server_id"] == srv2.id for h in hist_srv2)
    assert hist_srv2[0]["server_name"] == "Server Beta"

    # Test latest scorecard for server
    latest1 = get_latest_scan_for_server(srv1.id)
    assert latest1 is not None
    assert latest1.hostname == "srv-alpha"

    # Clean up
    delete_server(srv1.id)
    delete_server(srv2.id)
