"""
FastAPI Server & Route Handlers for Small-Business Security Audit Tool.
"""

import os
import json
import asyncio
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Form, Depends
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
from app.core.history import (
    save_scan_record,
    get_scan_history,
    get_scan_by_id,
    init_history_db,
    delete_scan_by_id
)
from app.core.scorer import AuditScorecard

# Initialize FastAPI App
app = FastAPI(
    title=APP_TITLE,
    version=VERSION,
    description="Visual wrapper and business risk translator for Lynis security audit engine."
)

# Ensure directories exist
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)
init_history_db()

# Mount Static Files & Templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Global Scan Manager Instance
scan_manager = ScanManager()


class StartScanRequest(BaseModel):
    username: str = ""
    password: str = ""


@app.get("/", response_class=HTMLResponse)
async def index_page(request: Request):
    """
    Render main Single-Page Dashboard.
    """
    preflight = check_system_preflight()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "app_title": APP_TITLE,
            "version": VERSION,
            "preflight": preflight
        }
    )


@app.get("/api/system/status", response_model=SystemPreflightStatus)
async def get_system_status():
    """
    Endpoint for host OS and Lynis installation status check.
    """
    return check_system_preflight()


@app.post("/api/auth/verify")
async def verify_auth(username: str = Form(""), password: str = Form("")):
    """
    Verify administrator/sudo credentials without initiating a full scan.
    """
    is_valid = verify_sudo_credentials(username, password)
    return {"valid": is_valid, "username": username}


@app.post("/api/scan/start")
async def start_scan(payload: StartScanRequest, background_tasks: BackgroundTasks):
    """
    Trigger a security audit scan in the background and stream progress via SSE.
    """
    if scan_manager.is_scanning:
        return JSONResponse(
            status_code=409,
            content={"message": "An audit scan is already in progress. Please wait."}
        )

    # Launch background worker task
    background_tasks.add_task(
        _execute_scan_worker,
        username=payload.username,
        password=payload.password
    )

    return {"status": "started", "message": "Audit scan initiated successfully."}


async def _execute_scan_worker(username: str, password: str):
    """
    Background worker that runs the scan and pushes progress events into the SSE queue.
    """
    async for event in scan_manager.run_scan(
        username=username,
        password=password
    ):
        # Broadcast event to all active SSE subscribers
        await scan_manager.broadcast(event)
        
        # Save record to database when complete
        if event.is_complete and event.scorecard:
            save_scan_record(event.scorecard)


@app.get("/api/scan/stream")
async def stream_scan_progress():
    """
    Server-Sent Events (SSE) endpoint for live streaming scan progression.
    """
    async def event_generator():
        # If no active scan, yield initial state and exit
        if not scan_manager.is_scanning:
            if scan_manager.last_scorecard:
                init_event = ScanProgressEvent(
                    stage="Completed",
                    progress_percent=100,
                    message="Latest audit results ready.",
                    is_complete=True,
                    scorecard=scan_manager.last_scorecard
                )
                yield f"data: {init_event.model_dump_json()}\n\n"
            else:
                idle_event = ScanProgressEvent(
                    stage="Idle",
                    progress_percent=0,
                    message="Ready to start audit."
                )
                yield f"data: {idle_event.model_dump_json()}\n\n"
            return

        # Subscribe to active scan events
        q = scan_manager.subscribe()
        try:
            while True:
                try:
                    event: ScanProgressEvent = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                    if event.is_complete or event.error:
                        break
                except asyncio.TimeoutError:
                    # Send keep-alive comment
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
async def get_latest_scan():
    """
    Get the most recently calculated scorecard.
    """
    if scan_manager.last_scorecard:
        return scan_manager.last_scorecard
    
    # Try loading latest from database
    history = get_scan_history(limit=1)
    if history:
        full_record = get_scan_by_id(history[0]["id"])
        if full_record:
            return full_record

    return {"message": "No scan results available. Start a new audit."}


@app.get("/api/history")
async def list_scan_history():
    """
    Get audit history list.
    """
    return get_scan_history(limit=20)


@app.get("/api/history/{scan_id}")
async def get_history_detail(scan_id: int):
    """
    Get full scorecard for a specific historical audit.
    """
    scorecard = get_scan_by_id(scan_id)
    if not scorecard:
        raise HTTPException(status_code=404, detail="Audit record not found.")
    return scorecard


@app.delete("/api/history/{scan_id}")
async def delete_history_record(scan_id: int):
    """
    Delete a specific historical audit.
    """
    deleted = delete_scan_by_id(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Audit record not found or already deleted.")
    return {"status": "success", "message": "Record deleted"}



@app.get("/api/export/html", response_class=HTMLResponse)
async def export_html_report(request: Request, scan_id: Optional[int] = None):
    """
    Render a clean, printable executive audit report.
    """
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    else:
        scorecard = scan_manager.last_scorecard
        if not scorecard:
            history = get_scan_history(limit=1)
            if history:
                scorecard = get_scan_by_id(history[0]["id"])

    if not scorecard:
        return HTMLResponse("<h2>No audit results found to generate report.</h2>", status_code=404)

    return templates.TemplateResponse(
        request=request,
        name="report_export.html",
        context={
            "scorecard": scorecard,
            "app_title": APP_TITLE,
            "version": VERSION
        }
    )


@app.get("/api/export/json")
async def export_json_report(scan_id: Optional[int] = None):
    """
    Download raw JSON report data.
    """
    scorecard = None
    if scan_id:
        scorecard = get_scan_by_id(scan_id)
    else:
        scorecard = scan_manager.last_scorecard

    if not scorecard:
        raise HTTPException(status_code=404, detail="No audit report available.")

    content = scorecard.model_dump_json(indent=2)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=security-audit-{scorecard.hostname}.json"}
    )
