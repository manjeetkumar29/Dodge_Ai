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

Built on top of the inference speeds of **Groq** and the graph-traversal superiority of **Neo4j**, Dodge AI reads plain English context (e.g., *"Find the single most complex open-loop sales order with no billing documents"*), compiles it instantly into an AST Cypher string, executes the traversal against the backend Neo4j cluster, evaluates the mathematical result, and translates the conclusion back into a human-readable business summary.

### 🏛️ Architecture Decisions & Capabilities
1. **D3 Parallel Web Workers:** Visualizing 2,000+ relational graph nodes in the UI normally locks the browser's main thread. Dodge AI offloads all D3 node physics and collision calculations to isolated background Web Workers, guaranteeing the React interface never stutters or drops frames during massive visual render spikes.
2. **Self-Healing LLM Cypher Execution:** When querying highly novel combinations of O2C data, the LLM might hallucinate an invalid Cypher syntax. The Python orchestrator safely intercepts these Native Database Errors, automatically re-injects the Graph Schema back into the Agent's context, and forces the LLM to auto-correct the syntax without the user ever noticing.
3. **Resilient Rate Limiting Protocol:** Built natively with Python's `tenacity`, the backend implements strict Exponential Backoff retry mechanics protecting complex analytical queries from bouncing against Groq Token Rate Limits (`429 Too Many Requests`).

### 🗄️ Database Choice: Neo4j AuraDB
SAP Order-to-Cash (O2C) lifecycles (Order -> Delivery -> Billing -> Accounting Document -> Payment clearance) are inherently sequential and intensely interconnected.
* **The Problem with Relational (SQL):** Constructing a query to find *"An unfulfilled payment that stems from a specific Outbound Delivery linked to a targeted Business Partner"* requires 4 to 5 massive `JOIN` operations across monolithic tables, severely penalizing performance.
* **The Neo4j Solution:** Graph databases store relationships natively as pointers. Cypher traversal paths like `(BP)-[:SOLD_TO]->(SO)-[:HAS_ITEM]->(Product)` process linearly and instantly, making Neo4j the definitive backend choice for modeling supply chain logistics and cash-flow bottlenecks.

### 🤖 LLM Prompting Strategy (LangChain & Groq)
The intelligence pipeline is strictly conditioned using sophisticated Prompt Engineering tactics to guarantee absolute business consistency:
* **Schema Injection:** The agent is dynamically fed the live Neo4j `SCHEMA_DESCRIPTION` so it actively understands exactly which node labels and properties actually exist, preventing severe hallucinations.
* **Adaptive Response Formatting:** The LLM's `ANSWER_GENERATION_PROMPT` dynamically shifts its formatting instructions based strictly on the query result count. 
  * *Single Result:* Forces deep paragraph summaries.
  * *Medium Results (2-15):* Forces heavily structured Markdown numbered lists.
  * *Massive Sets (15+):* Automatically summarizes total counts, samples a few ID ranges, and offers to paginated follow-ups.

### 🛡️ Security Guardrails & Query Sanitization
Because Dodge AI translates Natural Language into executable raw database commands, the `guardrails.py` pipeline acts as a definitive zero-trust firewall:
* **Topic Whitelisting:** Any user prompt exceeding 5 words that does not contain specific business entities (e.g. `order, sales, invoice, plant, SAP, O2C, ledger`) is instantly blocked, preventing prompt-injection sandbox escapes like "Ignore previous instructions".
* **Cypher Mutation Blocking:** The generated Cypher strings are Regex scanned. If the LLM generates `DELETE`, `DROP`, `CREATE USER`, or `DETACH`, the query is terminated instantly before touching the database driver.
* **Runaway Query Limiters:** Every outbound Cypher string is algorithmically appended with `LIMIT 500` to prevent unbounded memory spikes if the LLM attempts to return the entire database.

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

## 📦 Vercel Deployment Instructions

Dodge AI is split into two discrete projects (`frontend/` and `backend/`) and should be deployed natively as **two separate Vercel Projects**.

### Phase 1: Deploy Backend API
1. Import the repository into Vercel and set the Root Directory to **`backend/`**.
2. Add all `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `GROQ_API_KEY` Environment Variables.
3. Deploy. Vercel automatically reads the `vercel.json` file to deploy the FastAPI application natively as Serverless Functions. Copy the Live API URL.

### Phase 2: Deploy React Frontend
1. Import the identical repository into Vercel and set Root Directory to **`frontend/`**.
2. Create an Environment Variable named `REACT_APP_API_URL` and paste the Live API URL you just copied from Phase 1.
3. Deploy. The UI will automatically connect directly to your secured Serverless backend endpoints!

---
*Developed proudly with Neo4j, Meta LLaMA, and Groq.*
