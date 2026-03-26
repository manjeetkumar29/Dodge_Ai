# Dodge AI - SAP O2C Graph Intelligence

> **UI Snapshot Placeholder**
> ![Dodge AI Dashboard Snapshot](https://via.placeholder.com/1200x600.png?text=Upload+Your+App+Screenshot+Here)
> *(Replace the image URL above with a real screenshot of your React Dashboard!)*

Dodge AI is an **intelligent operational assistant** that translates natural language questions into complex Cypher traversals against an extensive SAP Order-to-Cash (O2C) Neo4j Graph Database. Designed to seamlessly aggregate millions of nodes, Dodge AI empowers business analysts to directly interrogate high-volume data cycles, unearth cash-flow bottlenecks, and trace financial lifecycles at blistering speeds.

## 🚀 Key Features

* **Natural Language to Cypher:** Automatically constructs highly intricate, multi-path database aggregations using LLaMA models on Groq.
* **Dynamic Graph Visualization:** Stunning responsive **D3.js** node physics engine offloaded entirely to Web Workers to ensure seamless UI threading during massive data aggregation loads.
* **Agentic Chat Interface:** Features smart, context-aware interactive messaging capabilities including follow-up question injection and fully resizable interface panels.
* **Intelligent Error Recovery:** Self-healing reasoning architecture that immediately intercepts Neo4j Syntax Errors and feeds them back into the LLM layer for native auto-correction.
* **Dark Mode UI Aesthetics:** Beautiful, fully-responsive TailwindCSS layouts featuring persistent local storage configurations and granular data browser grids.

## 💻 Tech Stack

* **Graph Engine:** Neo4j (Cypher AST Generation)
* **AI / LLM Orchestration:** LangChain, Groq API (Meta LLaMA)
* **Backend Architecture:** Python, FastAPI, Uvicorn, Pydantic
* **Frontend Framework:** React.js, TailwindCSS (v3), Axios
* **Visualization:** D3.js

## ⚙️ Local Development Setup

### 1. Configure the Environment

Ensure your `backend/.env` file is properly populated with your Neo4j credentials and active `GROQ_API_KEY`:

```env
NEO4J_URI=neo4j+s://<YOUR_DB>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<PASSWORD>
GROQ_API_KEY=<YOUR_GROQ_KEY>
GROQ_MODEL=llama-3.3-70b-versatile
```

### 2. Boot the Application

Dodge AI comes with automated startup scripts that will natively handle running both Python (Uvicorn) and Node development servers concurrently.

**Via Windows PowerShell:**
```powershell
.\start.ps1
```

**Manual Start:**

**Backend (FastAPI):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend (React):**
```bash
cd frontend
npm install
npm start
```

## 🌐 Endpoints & URLs

* **Web UI:** `http://localhost:3000`
* **FastAPI Core:** `http://localhost:8000`
* **Swagger API Docs:** `http://localhost:8000/docs`
