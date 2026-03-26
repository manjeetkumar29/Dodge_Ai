import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ingestion.graph_builder import run_full_ingestion
from models.schemas import IngestionStatus

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])
logger = logging.getLogger(__name__)

_ingestion_status: dict = {
    "running": False,
    "results": [],
    "error": None,
    "completed": False,
}


async def _run_ingestion_task() -> None:
    global _ingestion_status
    _ingestion_status["running"] = True
    _ingestion_status["completed"] = False
    _ingestion_status["error"] = None
    _ingestion_status["results"] = []
    try:
        _ingestion_status["results"] = await run_full_ingestion()
        _ingestion_status["completed"] = True
    except Exception as exc:
        logger.error("Ingestion failed: %s", exc, exc_info=True)
        _ingestion_status["error"] = str(exc)
    finally:
        _ingestion_status["running"] = False


@router.post("/start", response_model=IngestionStatus)
async def start_ingestion(background_tasks: BackgroundTasks):
    if _ingestion_status["running"]:
        raise HTTPException(status_code=409, detail="Ingestion already running")
    background_tasks.add_task(_run_ingestion_task)
    return IngestionStatus(status="started", message="Ingestion pipeline started in background")


@router.get("/status", response_model=IngestionStatus)
async def get_ingestion_status():
    if _ingestion_status["running"]:
        status = "running"
    elif _ingestion_status["completed"]:
        status = "completed"
    elif _ingestion_status["error"]:
        status = "error"
    else:
        status = "idle"

    return IngestionStatus(
        status=status,
        steps=_ingestion_status["results"],
        message=_ingestion_status.get("error") or "",
    )


@router.post("/reset")
async def reset_graph():
    if _ingestion_status["running"]:
        raise HTTPException(status_code=409, detail="Ingestion running - stop it first")

    from database.neo4j_client import run_write_query

    await run_write_query("MATCH (n) CALL { WITH n DETACH DELETE n } IN TRANSACTIONS OF 1000 ROWS")
    return {"message": "Graph cleared successfully"}
