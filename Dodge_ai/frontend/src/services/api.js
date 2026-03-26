import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const fetchGraphOverview = (limit = 300, nodeTypes = null) => {
  const params = { limit };
  if (nodeTypes) params.node_types = nodeTypes;
  return api.get("/api/graph/overview", { params });
};

export const fetchNodeDetail = (nodeId) => api.get(`/api/graph/node/${nodeId}`);

export const searchNodes = (q, label = null, limit = 20) => {
  const params = { q, limit };
  if (label) params.label = label;
  return api.get("/api/graph/search", { params });
};

export const fetchGraphStats = () => api.get("/api/graph/stats");

export const sendChatMessage = (message, sessionId = "default") =>
  api.post("/api/chat/message", { message, session_id: sessionId });

export const clearChatSession = (sessionId) => api.delete(`/api/chat/session/${sessionId}`);

export const startIngestion = () => api.post("/api/ingestion/start");
export const getIngestionStatus = () => api.get("/api/ingestion/status");
export const resetGraph = () => api.post("/api/ingestion/reset");

export const listFolders = () => api.get("/api/folders");

export const getFolderData = (folderName, limit = 100) => 
  api.get(`/api/data/${folderName}`, { params: { limit } });
