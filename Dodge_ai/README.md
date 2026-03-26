# SAP O2C Graph Intelligence

Complete FastAPI + Neo4j + React implementation generated from `Dodgeai.txt`.

## Quick start

1. Edit [backend/.env](/c:/Users/91942/Desktop/Dodge_ai/backend/.env) and set your real `GROQ_API_KEY`.
2. Put your CSV, Parquet, or JSONL files into the matching folders inside [data/sap-o2c-data](/c:/Users/91942/Desktop/Dodge_ai/data/sap-o2c-data).
3. Run `.\start.ps1` to concurrently boot the backend and frontend servers locally.

## URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Neo4j Browser: `http://localhost:7474`

## Local development

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm install --legacy-peer-deps
npm start
```
