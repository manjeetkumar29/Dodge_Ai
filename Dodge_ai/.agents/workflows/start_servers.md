---
description: Start Dodge AI Frontend and Backend
---

Start the frontend and backend servers. The user explicitly requested to automatically run these to test changes without asking for permission.

1. Start Frontend Server
// turbo-all
```powershell
cd c:\Users\Asus\Downloads\ddd\Dodge_ai\Dodge_ai\frontend
npm install
npm run build
npm run serve:static
```

2. Start Backend Server
```powershell
cd c:\Users\Asus\Downloads\ddd\Dodge_ai\Dodge_ai\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
