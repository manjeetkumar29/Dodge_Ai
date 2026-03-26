from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str = Field(default="default")


class ChatResponse(BaseModel):
    answer: str
    cypher: Optional[str] = None
    results: list[dict] = Field(default_factory=list)
    highlights: list[dict] = Field(default_factory=list)
    followUpQuestions: list[str] = Field(default_factory=list)
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GraphNode(BaseModel):
    id: str
    label: str
    properties: dict[str, Any]
    connections: int = 0


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphData(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    node_count: int
    edge_count: int


class IngestionStatus(BaseModel):
    status: str
    steps: list[dict] = Field(default_factory=list)
    message: str = ""


class NodeSearchResult(BaseModel):
    nodes: list[dict]
    total: int
