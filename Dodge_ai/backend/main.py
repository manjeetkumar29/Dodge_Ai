import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from api.chat import router as chat_router
from api.graph import router as graph_router
from api.ingestion import router as ingestion_router
from config import get_settings, resolve_data_dir
from database.neo4j_client import close_driver, get_driver
from ingestion.data_loader import df_to_records, load_csv_folder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SAP O2C Graph API")
    await get_driver()
    logger.info("Neo4j connected")
    yield
    await close_driver()
    logger.info("Neo4j disconnected")


settings = get_settings()

app = FastAPI(
    title="SAP O2C Graph Intelligence API",
    description="Graph-powered Order-to-Cash analysis with LLM chat",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graph_router)
app.include_router(chat_router)
app.include_router(ingestion_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SAP O2C Graph API"}


@app.get("/api/folders")
async def list_folders():
    data_dir = str(resolve_data_dir(settings.DATA_DIR))
    if not os.path.exists(data_dir):
        return {"folders": []}

    folders = [item for item in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, item))]
    result = []
    for folder in sorted(folders):
        folder_path = os.path.join(data_dir, folder)
        files = []
        for root, _, file_names in os.walk(folder_path):
            for file_name in file_names:
                file_path = os.path.join(root, file_name)
                files.append(
                    {
                        "name": file_name,
                        "size": os.path.getsize(file_path),
                        "modified": os.path.getmtime(file_path),
                    }
                )
        result.append({"name": folder, "file_count": len(files), "files": files})

    return {"folders": result, "total": len(result)}


@app.get("/api/data/{folder_name}")
async def get_folder_data(folder_name: str, limit: int = 100):
    try:
        df = load_csv_folder(folder_name)
        if df.empty:
            return {"columns": [], "data": []}
        
        # Take just a sample to avoid overloading the frontend
        if len(df) > limit:
            df = df.head(limit)
            
        records = df_to_records(df)
        columns = list(df.columns) if not df.empty else []
        return {"columns": columns, "data": records}
    except Exception as exc:
        logger.error(f"Failed to load data for {folder_name}: {exc}")
        return {"columns": [], "data": [], "error": str(exc)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
