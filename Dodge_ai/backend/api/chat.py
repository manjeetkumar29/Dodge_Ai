from fastapi import APIRouter, HTTPException

from llm.agent import get_agent
from models.schemas import ChatMessage, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/message", response_model=ChatResponse)
async def send_message(payload: ChatMessage):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    agent = get_agent(payload.session_id)
    result = await agent.chat(payload.message, payload.session_id)
    return ChatResponse(**result)


@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    from llm.agent import _agents

    if session_id in _agents:
        del _agents[session_id]
    return {"message": "Session cleared"}


@router.get("/history/{session_id}")
async def get_history(session_id: str):
    from llm.agent import _agents

    agent = _agents.get(session_id)
    if not agent:
        return {"history": []}
    return {"history": agent.conversation_history}
