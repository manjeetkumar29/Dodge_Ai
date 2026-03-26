<div align="center">
  <h1>🚀 Dodge AI: SAP O2C Graph Intelligence</h1>
  <p>An autonomous, self-healing Graph Database Reasoning Agent bridging Natural Language with millions of interconnected SAP Order-to-Cash operational nodes.</p>
</div>

<br />

> **UI Snapshot**  
> ![Dodge AI Dashboard Snapshot](https://via.placeholder.com/1200x600.png?text=Upload+Your+App+Screenshot+Here)  
> *(Insert your favorite UI screenshot above!)*

## 🧠 About the Project

Dodge AI fundamentally transforms how enterprise analysts query complex operational data. Instead of writing massive SQL or Cypher table-joins manually, users simply talk to the system. 

Built on top of the blistering inference speeds of **Groq** and the graph-traversal superiority of **Neo4j**, Dodge AI reads plain English context (e.g., *"Find the single most complex open-loop sales order with no billing documents"*), compiles it instantly into an AST Cypher string, executes the traversal against the backend Neo4j cluster, evaluates the mathematical result, and translates the conclusion back into a human-readable business summary.

### ⚡ Architectural Highlights
1. **Self-Healing Cypher Execution:** If the LLM agent generates a flawed Cypher pattern that triggers a database `SyntaxError`, the Python orchestrator safely catches the crash, dynamically re-injects the Neo4j schema back into its prompt context window, and commands the agent to natively hot-fix the syntax error before finally returning the data to the user.
2. **Parallel Physics Rendering:** Massive D3.js computational networking structures are safely offloaded entirely to a discrete React **Web Worker**, ensuring that the frontend browser thread never freezes or stutters even when visualizing 2,000+ localized relational edges simultaneously.
3. **Resilient Rate Limiting Protocol:** Built natively with `tenacity`, the backend implements strict Exponential Backoff retry mechanics protecting complex analytical queries from bouncing against LLM Token Rate Limits (`429 Too Many Requests`).

---

## 🛠️ Technology Stack

**Frontend Interface (`/frontend`)**
* **Framework:** React 18, React Router DOM
* **Styling Engine:** TailwindCSS v3 (with persistent Dark Mode contexts)
* **Visualization:** D3.js v7 + Web Workers
* **Networking:** Axios API interceptors

**Backend Orchestrator (`/backend`)**
* **Framework:** Python, FastAPI, Uvicorn (ASGI)
* **AI Pipelines:** AsyncOpenAI, LangChain, LLaMA v3 on Groq
* **Resiliency Tools:** Pydantic (Schema Validation), Tenacity (Retries)
* **Database Driver:** `neo4j` Python Client

---

## 📦 Local Deployment Instructions

### 1. Configure the Environment Profile
Establish your secure credentials inside `backend/.env` for both the Graph Database cluster and your LLM inference pipeline:

```env
NEO4J_URI=neo4j+s://<YOUR_DB>.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<PASSWORD>
GROQ_API_KEY=<YOUR_GROQ_KEY>
GROQ_MODEL=llama-3.3-70b-versatile
```

### 2. Boot the Global Architecture
Dodge AI comes equipped with a universal PowerShell deployment script, isolating both the FastAPI Python runtime and the Webpack React server into parallel concurrent background jobs securely.

**Automated Windows Workflow:**
```powershell
.\start.ps1
```

**Manual Boot Sequence:**

**(A) Uvicorn Server Environment:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**(B) NPM Webpack Environment:**
```bash
cd frontend
npm install
npm start
```

---

## 📡 Core API Reference

The backend exposes a highly optimized RESTful structure strictly for decoupled front-end parsing:

* `POST /api/chat/message`: The primary payload sink fielding the raw string questions, returning validated synthesized responses, generated syntax lines, and arrayed analytical Node Identifiers.
* `GET /api/graph/overview`: Broadcasts a highly-truncated, 300-node macro snapshot for immediate visual scaffolding upon initialization.
* `GET /api/graph/search`: Maps a wildcard text query universally against any property dict spanning any structural graph node via iterative `toLower` matching.
* `GET /api/graph/highlights/{session_id}`: Re-verifies arrayed sub-paths explicitly related to an active conversational session context.

---
*Developed proudly with Neo4j, Meta LLaMA, and Groq.*
