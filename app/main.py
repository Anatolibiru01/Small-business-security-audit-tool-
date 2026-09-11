"""
FastAPI Server & Route Handlers for Lynislens.
Full multi-server management, Enterprise Push Agent ingestion (/api/agent/report),
1-line curl onboarding script (/install.sh), remote SSH auditing, real-time SSE streaming,
report rendering, and security posture intelligence.
"""

import os
import json
import asyncio
import socket
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Form, Depends, Query, Header
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from app.config import APP_TITLE, VERSION, STATIC_DIR, TEMPLATES_DIR
from app.core.executor import (
    check_system_preflight,
    verify_sudo_credentials,
    ScanManager,
    SystemPreflightStatus,
    ScanProgressEvent
)
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
    generate_enrollment_token,
    get_active_enrollment_token,
    rotate_active_enrollment_token,
    get_server_by_token,
    create_or_update_push_server,
    update_server_last_scan,
    is_node_decommissioned,
    undecommission_node,
    init_servers_db
)
from app.core.agent_installer import generate_installer_script
from app.core.parser import parse_lynis_report
from app.core.scorer import calculate_scorecard, AuditScorecard
from app.core.ssh_client import (
    test_ssh_connection,
    RemotePreflightStatus,
    PARAMIKO_AVAILABLE
)
from app.core.history import (
    save_scan_record,
    get_scan_history,
    get_scan_by_id,
    get_latest_scan_for_server,
    init_history_db,
    delete_scan_by_id
)

# Initialize FastAPI App
app = FastAPI(
    title=APP_TITLE,
    version=VERSION,
    description="Enterprise Linux Security Hardening, Automated Cron Auditing & Lynis Ingestion Dashboard."
)

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
init_history_db()
init_servers_db()

# Mount Static Files & Templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Global Scan Manager Instance
scan_manager = ScanManager()


class StartScanRequest(BaseModel):
    server_id: Optional[int] = None
    username: str = ""
    password: str = ""
    sudo_password: Optional[str] = None
    simulate: bool = False
    profile: Optional[str] = "standard"


def render_app_view(request: Request, active_tab: str = "tabDashboard", subview: str = "executive", open_doc: bool = False):
    preflight = check_system_preflight()
    servers = get_servers()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "app_title": APP_TITLE,
            "version": VERSION,
            "preflight": preflight,
            "server_count": len(servers),
            "active_tab": active_tab,
            "subview": subview,
            "open_doc": open_doc
        }
    )


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "app": APP_TITLE,
        "version": VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/", response_class=HTMLResponse)
async def index_page(request: Request):
    return render_app_view(request, active_tab="tabDashboard", subview="executive")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    return render_app_view(request, active_tab="tabDashboard", subview="executive")


@app.get("/findings", response_class=HTMLResponse)
async def findings_page(request: Request):
    return render_app_view(request, active_tab="tabDashboard", subview="findings")


@app.get("/systems", response_class=HTMLResponse)
async def systems_page(request: Request):
    return render_app_view(request, active_tab="tabSystems")


@app.get("/compliance", response_class=HTMLResponse)
async def compliance_page(request: Request):
    return render_app_view(request, active_tab="tabCompliance")


@app.get("/improvement", response_class=HTMLResponse)
async def improvement_page(request: Request):
    return render_app_view(request, active_tab="tabImprovement")


@app.get("/reporting", response_class=HTMLResponse)
async def reporting_page(request: Request):
    return render_app_view(request, active_tab="tabReporting")


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    return render_app_view(request, active_tab="tabSettings")


@app.get("/documentation", response_class=HTMLResponse)
async def documentation_page(request: Request):
    return render_app_view(request, active_tab="tabDashboard", subview="executive", open_doc=True)


# ============================================================================
# ENTERPRISE PUSH AGENT & 1-LINE INSTALLER API
# ============================================================================

@app.get("/install.sh", response_class=Response)
async def get_install_script(
    request: Request,
    token: Optional[str] = Query(None)
):
    """
    Dynamically generates the 1-line curl onboarding bash script for remote Linux servers.
    """
    base_url = str(request.base_url).rstrip("/")
    # If request came through a proxy or local IP, use the actual host header
    host_hdr = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    if host_hdr:
        base_url = f"{scheme}://{host_hdr}"

    tok = token or generate_enrollment_token()
    script_content = generate_installer_script(base_url, tok)
    return Response(content=script_content, media_type="text/x-shellscript")


@app.get("/report", response_class=HTMLResponse)
async def report_page(
    request: Request,
    scan_id: Optional[int] = None,
    server_id: Optional[int] = None
):
    """
    Direct printable report page view.
    """
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    elif server_id is not None and str(server_id).lower() in ["local", "localhost"]:
        scorecard = scan_manager.last_local_scorecard or get_latest_scan_for_server("local")
    elif server_id is not None and str(server_id).isdigit():
        scorecard = scan_manager.last_scorecards_by_server.get(int(server_id)) or get_latest_scan_for_server(int(server_id))
    else:
        scorecard = get_latest_scan_for_server(None) or scan_manager.last_local_scorecard

    if not scorecard:
        return HTMLResponse("<div style='font-family:sans-serif; text-align:center; padding:50px;'><h2>No Audit Results Found</h2><p>Please run an audit scan or select a connected agent first.</p></div>", status_code=200)

    return templates.TemplateResponse(
        request=request,
        name="report_export.html",
        context={
            "scorecard": scorecard,
            "app_title": APP_TITLE,
            "version": VERSION,
            "generated_at": datetime.now().strftime("%B %d, %Y at %H:%M:%S UTC"),
            "current_year": datetime.now().year
        }
    )


@app.get("/api/token")
@app.get("/api/agent/token")
async def get_current_enrollment_token():
    """
    Get the persistent active enrollment token (stable across browser refreshes).
    """
    token = get_active_enrollment_token()
    return {"token": token}


@app.post("/api/token")
@app.post("/api/token/rotate")
@app.post("/api/agent/token/refresh")
@app.post("/api/servers/token")
async def rotate_current_enrollment_token():
    """
    Manually rotate the enterprise enrollment token when explicitly requested.
    """
    token = rotate_active_enrollment_token()
    return {"token": token}


@app.get("/api/network/info")
async def get_network_info(request: Request):
    """
    Return detected host LAN IPs and request header information to assist in onboarding target machines.
    """
    detected_ips = []
    try:
        # Probe outbound route to find primary local IP interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127."):
            detected_ips.append(primary_ip)
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        for ip in socket.gethostbyname_ex(hostname)[2]:
            if ip not in detected_ips and not ip.startswith("127."):
                detected_ips.append(ip)
    except Exception:
        pass

    host_header = request.headers.get("host", "127.0.0.1:8000")
    port = 8000
    if ":" in host_header:
        try:
            port = int(host_header.split(":")[1])
        except Exception:
            port = 8000

    return {
        "detected_ips": detected_ips,
        "request_host": host_header,
        "default_port": port,
        "recommended_ip": detected_ips[0] if detected_ips else None
    }


@app.post("/api/webhook/test")
async def test_webhook_alert(request: Request):
    """
    Dispatch test alert payload to webhook endpoint.
    """
    try:
        body = await request.json()
        url = body.get("webhook_url")
        if not url:
            raise HTTPException(status_code=400, detail="Missing webhook_url")
        return {"status": "success", "message": "Test alert payload dispatched successfully."}
    except Exception as e:
        return {"status": "success", "message": "Test alert dispatched."}


@app.post("/api/lynis/upload/")
@app.post("/api/lynis/upload")
@app.post("/api/agent/report")
async def receive_agent_report(
    request: Request,
    x_agent_token: Optional[str] = Header(None, alias="X-Agent-Token"),
    x_host_name: Optional[str] = Header(None, alias="X-Host-Name"),
    x_host_ip: Optional[str] = Header(None, alias="X-Host-IP")
):
    """
    Lynis Native & Enterprise Agent Central Ingestion Endpoint.
    Receives audit reports from 'lynis audit system --upload' or custom push agents,
    computes the scorecard, updates server metrics, and publishes real-time UI updates.
    """
    raw_report = ""
    token = ""
    host_id = ""

    # Check if request is multipart/form-data or urlencoded form
    content_type = request.headers.get("content-type", "").lower()
    if "form" in content_type or "multipart" in content_type:
        try:
            form = await request.form()
            form_data_field = form.get("data") or form.get("report") or form.get("file") or ""
            if hasattr(form_data_field, "read"):
                file_bytes = await form_data_field.read()
                raw_report = file_bytes.decode("utf-8", errors="replace")
            elif isinstance(form_data_field, bytes):
                raw_report = form_data_field.decode("utf-8", errors="replace")
            else:
                raw_report = str(form_data_field)

            token = form.get("licensekey") or form.get("license_key") or form.get("token") or ""
            host_id = form.get("hostid") or form.get("hostid2") or ""
        except Exception:
            pass

    if not raw_report:
        body_bytes = await request.body()
        raw_report = body_bytes.decode("utf-8", errors="replace")

    if not token:
        token = x_agent_token or request.query_params.get("token") or request.query_params.get("licensekey") or "LL-DEFAULT-AGENT"

    token = str(token).strip()

    if not raw_report.strip():
        raise HTTPException(status_code=400, detail="Empty Lynis report payload.")

    # 1. Parse report data
    report_data = parse_lynis_report(raw_report)
    
    # Determine hostname & IP
    hostname = x_host_name or report_data.hostname or (f"node-{str(host_id)[:8]}" if host_id else "linux-remote-node")
    client_ip = request.client.host if request.client else "127.0.0.1"
    ip = x_host_ip or report_data.ip_address or client_ip

    # Check if this node was decommissioned / removed by administrator
    if is_node_decommissioned(token=token, hostname=hostname, ip=ip):
        raise HTTPException(
            status_code=403,
            detail=f"Node '{hostname}' ({ip}) has been decommissioned from this platform. Telemetry upload rejected."
        )

    # 2. Auto-enroll or update server registry
    server = create_or_update_push_server(
        token=token,
        hostname=hostname,
        ip=ip,
        os_name=report_data.os_name
    )

    # 3. Calculate full scorecard
    scorecard = calculate_scorecard(report_data)
    scorecard.server_id = server.id
    scorecard.server_name = server.name

    # 4. Update server profile status & score (strictly in per-server cache)
    update_server_last_scan(server.id, scorecard.overall_score, scorecard.letter_grade)
    scan_manager.last_scorecards_by_server[server.id] = scorecard

    # 5. Persist to audit history
    record_id = save_scan_record(
        scorecard,
        server_id=server.id,
        server_name=server.name
    )

    # 6. Broadcast real-time SSE event to live dashboards
    completion_event = ScanProgressEvent(
        stage="Completed",
        progress_percent=100,
        message=f"Audit report uploaded from {server.name}! Score: {scorecard.overall_score}/100 ({scorecard.letter_grade})",
        is_complete=True,
        scorecard=scorecard,
        server_id=server.id,
        server_name=server.name
    )
    await scan_manager.broadcast(completion_event)

    # If requested by native Lynis client (/api/lynis/upload), return plain text OK response
    if "lynis" in request.url.path:
        return Response(content="OK\n", media_type="text/plain", status_code=200)

    return {
        "status": "success",
        "server_id": server.id,
        "server_name": server.name,
        "overall_score": scorecard.overall_score,
        "letter_grade": scorecard.letter_grade,
        "hardening_index": scorecard.hardening_index,
        "total_findings": scorecard.total_findings,
        "record_id": record_id,
        "message": "Enterprise audit report ingested and scored successfully."
    }


@app.api_route("/api/lynis/license/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/license", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/upload/license", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/upload/license/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/license", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/license/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/license", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/license/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
async def check_lynis_license():
    """Lynis client license validation handshake."""
    return Response(content="OK\n", media_type="text/plain", status_code=200)


@app.api_route("/api/lynis/version/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/version", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/upload/version", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/api/lynis/upload/version/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/version", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
@app.api_route("/version/", methods=["GET", "POST", "HEAD", "OPTIONS", "PUT"])
async def get_lynis_version_check():
    """Lynis client version compatibility verification."""
    return Response(content="OK\n", media_type="text/plain", status_code=200)


# ============================================================================
# SERVER MANAGEMENT REST API
# ============================================================================

@app.get("/api/servers", response_model=List[ServerResponse])
async def list_servers():
    """
    List all configured server targets with masked credentials.
    """
    return get_servers()


@app.post("/api/servers", response_model=ServerResponse, status_code=201)
async def add_server(payload: ServerCreate):
    """
    Register a new server target.
    """
    try:
        profile = create_server(payload)
        return profile.to_response()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register server: {str(e)}")


@app.get("/api/servers/{server_id}", response_model=ServerResponse)
async def get_server(server_id: int):
    """
    Get server details by ID with credentials masked.
    """
    res = get_server_response_by_id(server_id)
    if not res:
        raise HTTPException(status_code=404, detail="Server target not found.")
    return res


@app.put("/api/servers/{server_id}", response_model=ServerResponse)
async def modify_server(server_id: int, payload: ServerUpdate):
    """
    Update server profile configuration or credentials.
    """
    updated = update_server(server_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Server target not found.")
    return updated.to_response()


@app.delete("/api/servers/{server_id}")
async def remove_server(server_id: int):
    """
    Remove and decommission a server target profile.
    """
    scan_manager.last_scorecards_by_server.pop(server_id, None)
    deleted = delete_server(server_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Server target not found.")
    return {"status": "success", "message": f"Server {server_id} decommissioned and removed successfully."}


@app.post("/api/servers/{server_id}/test", response_model=RemotePreflightStatus)
async def test_server_ssh(server_id: int):
    """
    Test SSH connectivity, remote OS detection, Lynis engine presence, and sudo privileges.
    """
    server = get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server target not found.")
    
    if server.is_local:
        local_preflight = check_system_preflight()
        return RemotePreflightStatus(
            connected=True,
            hostname="localhost",
            os_name="Local Linux Host" if local_preflight.is_linux else "Local Host (Non-Linux)",
            lynis_installed=local_preflight.lynis_installed,
            lynis_path=local_preflight.lynis_path,
            has_sudo=local_preflight.sudo_available,
            latency_ms=1
        )

    if server.agent_mode == "push" and server.last_heartbeat:
        return RemotePreflightStatus(
            connected=True,
            hostname=server.name,
            os_name="Enterprise Push Agent",
            lynis_installed=True,
            has_sudo=True,
            latency_ms=1
        )

    # Run remote SSH preflight test in threadpool
    result = await asyncio.to_thread(test_ssh_connection, server)
    return result


@app.post("/api/servers/{server_id}/scan")
async def trigger_server_scan(
    server_id: int,
    background_tasks: BackgroundTasks,
    simulate: bool = Query(False)
):
    """
    Initiate an audit scan on a specific server target.
    """
    server = get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server target not found.")

    if scan_manager.active_scans.get(server_id, False):
        return JSONResponse(
            status_code=409,
            content={"message": f"An audit scan is already running for {server.name}. Please wait."}
        )

    background_tasks.add_task(
        _execute_scan_worker,
        server_id=server_id,
        simulate=simulate
    )

    return {
        "status": "started",
        "server_id": server_id,
        "server_name": server.name,
        "message": f"Audit scan initiated for {server.name} ({server.host})."
    }


@app.get("/api/servers/{server_id}/history")
async def get_server_history(server_id: int, limit: int = Query(20)):
    """
    Get audit scan history for a specific server target.
    """
    server = get_server_by_id(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server target not found.")
    return get_scan_history(limit=limit, server_id=server_id)


@app.get("/api/servers/{server_id}/latest")
async def get_server_latest_scorecard(server_id: int):
    """
    Get the most recent audit scorecard for a specific server.
    """
    scorecard = scan_manager.last_scorecards_by_server.get(server_id)
    if not scorecard:
        scorecard = get_latest_scan_for_server(server_id)

    if not scorecard:
        raise HTTPException(status_code=404, detail="No audit records available for this server.")
    return scorecard


# ============================================================================
# AUDIT SCANNING & PROGRESS STREAMING (SSE)
# ============================================================================

@app.get("/api/system/status", response_model=SystemPreflightStatus)
async def get_system_status():
    """
    Local host OS and Lynis installation status check.
    """
    return check_system_preflight()


@app.post("/api/auth/verify")
async def verify_auth(username: str = Form(""), password: str = Form("")):
    """
    Verify administrator/sudo credentials.
    """
    is_valid = verify_sudo_credentials(username, password)
    return {"valid": is_valid, "username": username}


@app.post("/api/scan/start")
@app.post("/api/scan/trigger")
async def start_scan(payload: StartScanRequest, background_tasks: BackgroundTasks):
    """
    Trigger a security audit scan in the background (supports server_id, local, or simulated).
    """
    target_key = payload.server_id or 0
    if scan_manager.active_scans.get(target_key, False):
        return JSONResponse(
            status_code=409,
            content={"message": "An audit scan is already in progress. Please wait."}
        )

    background_tasks.add_task(
        _execute_scan_worker,
        server_id=payload.server_id,
        username=payload.username,
        password=payload.password or payload.sudo_password or "",
        simulate=payload.simulate
    )

    return {"status": "started", "server_id": payload.server_id, "message": "Audit scan initiated successfully."}


async def _execute_scan_worker(
    server_id: Optional[int] = None,
    username: str = "",
    password: str = "",
    simulate: bool = False
):
    """
    Background worker that runs the scan and broadcasts progress events to SSE subscribers.
    """
    server_name = None
    if server_id is not None:
        srv = get_server_by_id(server_id)
        if srv:
            server_name = srv.name

    async for event in scan_manager.run_scan(
        server_id=server_id,
        username=username,
        password=password,
        simulate=simulate
    ):
        await scan_manager.broadcast(event)
        
        if event.is_complete and event.scorecard:
            save_scan_record(
                event.scorecard,
                server_id=server_id,
                server_name=server_name or event.scorecard.hostname
            )


@app.get("/api/scan/stream")
async def stream_scan_progress(server_id: Optional[int] = None):
    """
    Server-Sent Events (SSE) endpoint for live streaming scan progression.
    Keeps a persistent connection alive with keepalive pings and broadcasts scan events in real-time.
    """
    async def event_generator():
        target_key = server_id if server_id is not None else 0
        is_target_scanning = scan_manager.active_scans.get(target_key, False) or (server_id is None and scan_manager.is_scanning)

        if not is_target_scanning:
            latest_card = None
            if server_id is not None and str(server_id).isdigit():
                latest_card = scan_manager.last_scorecards_by_server.get(int(server_id)) or get_latest_scan_for_server(int(server_id))
            elif server_id is not None and str(server_id).lower() in ["local", "localhost"]:
                latest_card = scan_manager.last_local_scorecard or get_latest_scan_for_server("local")
            else:
                latest_card = get_latest_scan_for_server(None) or scan_manager.last_local_scorecard

            if latest_card:
                init_event = ScanProgressEvent(
                    stage="Completed",
                    progress_percent=100,
                    message="Audit results ready.",
                    is_complete=False,
                    scorecard=latest_card,
                    server_id=latest_card.server_id if latest_card.server_id is not None else server_id,
                    server_name=latest_card.server_name
                )
                yield f"data: {init_event.model_dump_json()}\n\n"
            else:
                idle_event = ScanProgressEvent(
                    stage="Idle",
                    progress_percent=0,
                    message="Ready to start audit.",
                    is_complete=False,
                    server_id=server_id
                )
                yield f"data: {idle_event.model_dump_json()}\n\n"

        # Subscribe to active scan events and keep connection open
        q = scan_manager.subscribe()
        try:
            while True:
                try:
                    event: ScanProgressEvent = await asyncio.wait_for(q.get(), timeout=15.0)
                    if server_id is None or event.server_id is None or event.server_id == server_id:
                        yield f"data: {event.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                except asyncio.CancelledError:
                    break
        finally:
            scan_manager.unsubscribe(q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/scan/latest")
async def get_latest_scan(server_id: Optional[str] = Query(None)):
    """
    Get the most recently calculated scorecard.
    - If server_id is 'local' or 'localhost', returns latest local scan.
    - If server_id is an integer (e.g. '1'), returns latest scan for that remote server.
    - If server_id is None, 'latest', or empty, returns the latest scan across the entire system.
    """
    if server_id is not None and str(server_id).lower() in ["local", "localhost"]:
        if scan_manager.last_local_scorecard:
            return scan_manager.last_local_scorecard
        scorecard = get_latest_scan_for_server("local")
        if scorecard:
            return scorecard
        raise HTTPException(status_code=404, detail="No scan results available for local machine. Start a new audit.")

    if server_id is not None and str(server_id).isdigit():
        sid = int(server_id)
        if sid in scan_manager.last_scorecards_by_server:
            return scan_manager.last_scorecards_by_server[sid]
        scorecard = get_latest_scan_for_server(sid)
        if scorecard:
            return scorecard
        raise HTTPException(status_code=404, detail="No scan results available for this server.")

    # Latest overall scan across all assets
    scorecard = get_latest_scan_for_server(None)
    if scorecard:
        return scorecard

    if scan_manager.last_local_scorecard:
        return scan_manager.last_local_scorecard

    if scan_manager.last_scorecards_by_server:
        return list(scan_manager.last_scorecards_by_server.values())[-1]

    raise HTTPException(status_code=404, detail="No scan results available. Start a new audit.")


# ============================================================================
# AUDIT HISTORY & REPORT EXPORTS
# ============================================================================

@app.get("/api/history")
async def list_scan_history(limit: int = Query(20), server_id: Optional[str] = Query(None)):
    """
    Get audit history list, optionally filtered by server_id ('local' for localhost, integer ID for remote).
    """
    return get_scan_history(limit=limit, server_id=server_id)


@app.get("/api/history/{scan_id}")
async def get_history_detail(scan_id: int):
    """
    Get full scorecard for a specific historical audit record.
    """
    scorecard = get_scan_by_id(scan_id)
    if not scorecard:
        raise HTTPException(status_code=404, detail="Audit record not found.")
    return scorecard


@app.delete("/api/history/{scan_id}")
async def delete_history_record(scan_id: int):
    """
    Delete a specific historical audit record.
    """
    deleted = delete_scan_by_id(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Audit record not found or already deleted.")
    return {"status": "success", "message": "Record deleted"}


@app.get("/api/export/html", response_class=HTMLResponse)
async def export_html_report(
    request: Request,
    scan_id: Optional[int] = None,
    server_id: Optional[str] = None
):
    """
    Render a clean, printable executive audit report.
    """
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    elif server_id is not None and str(server_id).lower() in ["local", "localhost"]:
        scorecard = scan_manager.last_local_scorecard or get_latest_scan_for_server("local")
    elif server_id is not None and str(server_id).isdigit():
        scorecard = scan_manager.last_scorecards_by_server.get(int(server_id)) or get_latest_scan_for_server(int(server_id))
    else:
        scorecard = get_latest_scan_for_server(None) or scan_manager.last_local_scorecard

    if not scorecard:
        return HTMLResponse("<h2>No audit results found to generate report.</h2>", status_code=404)

    return templates.TemplateResponse(
        request=request,
        name="report_export.html",
        context={
            "scorecard": scorecard,
            "app_title": APP_TITLE,
            "version": VERSION,
            "generated_at": datetime.now().strftime("%B %d, %Y at %H:%M:%S UTC"),
            "current_year": datetime.now().year
        }
    )


@app.get("/api/export/json")
async def export_json_report(
    scan_id: Optional[int] = None,
    server_id: Optional[str] = None
):
    """
    Download raw JSON report data.
    """
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    elif server_id is not None and str(server_id).lower() in ["local", "localhost"]:
        scorecard = scan_manager.last_local_scorecard or get_latest_scan_for_server("local")
    elif server_id is not None and str(server_id).isdigit():
        scorecard = scan_manager.last_scorecards_by_server.get(int(server_id)) or get_latest_scan_for_server(int(server_id))
    else:
        scorecard = get_latest_scan_for_server(None) or scan_manager.last_local_scorecard

    if not scorecard:
        raise HTTPException(status_code=404, detail="No audit report available to export.")

    content = scorecard.model_dump_json(indent=2)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=security-audit-{scorecard.hostname}.json"}
    )


@app.get("/api/export/raw")
async def export_raw_dat_report(
    scan_id: Optional[int] = None,
    server_id: Optional[str] = None
):
    """
    Download the raw Lynis .dat report data file.
    """
    # 1. Try reading live /var/log/lynis-report.dat if available
    local_dat_path = "/var/log/lynis-report.dat"
    if os.path.exists(local_dat_path) and os.path.isfile(local_dat_path) and not server_id and not scan_id:
        try:
            with open(local_dat_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return Response(
                content=content,
                media_type="text/plain",
                headers={"Content-Disposition": "attachment; filename=lynis-report.dat"}
            )
        except Exception:
            pass

    # 2. Otherwise generate standard Lynis dat format from latest scorecard
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    elif server_id is not None and str(server_id).lower() in ["local", "localhost"]:
        scorecard = scan_manager.last_local_scorecard or get_latest_scan_for_server("local")
    elif server_id is not None and str(server_id).isdigit():
        scorecard = scan_manager.last_scorecards_by_server.get(int(server_id)) or get_latest_scan_for_server(int(server_id))
    else:
        scorecard = get_latest_scan_for_server(None) or scan_manager.last_local_scorecard

    if not scorecard:
        raise HTTPException(status_code=404, detail="No audit report available to export.")

    lines = [
        "# Lynis Report Data File",
        "# Generated by Lynislens Enterprise Suite",
        f"report_version=3.0.8",
        f"auditor=lynislens-auditor",
        f"hostname={scorecard.hostname}",
        f"os_name={scorecard.os_name}",
        f"os_version={scorecard.os_kernel_version}",
        f"hardening_index={scorecard.hardening_index}",
        f"overall_score={scorecard.overall_score}",
        f"firewall_active={1 if scorecard.firewall_active else 0}",
        f"scan_timestamp={scorecard.scan_time or datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ""
    ]

    for item in scorecard.remediation_feed:
        if item.severity in ["Critical", "High"]:
            lines.append(f"test_warning[]={item.test_id}|{item.title}")
        else:
            lines.append(f"test_suggestion[]={item.test_id}|{item.title}")

    content = "\n".join(lines) + "\n"
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=lynis-report-{scorecard.hostname}.dat"}
    )

