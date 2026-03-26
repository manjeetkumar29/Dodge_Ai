import { useCallback, useState } from "react";

import {
  fetchGraphOverview,
  fetchGraphStats,
  fetchNodeDetail,
} from "../services/api";

export function useGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const loadGraph = useCallback(async (limit = 300, nodeTypes = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchGraphOverview(limit, nodeTypes);
      setGraphData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNodeDetail = useCallback(async (nodeId) => {
    try {
      const response = await fetchNodeDetail(nodeId);
      setSelectedNode({ id: nodeId, ...response.data });
    } catch (err) {
      console.error("Node detail error:", err);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetchGraphStats();
      setStats(response.data);
    } catch (err) {
      console.error("Stats error:", err);
    }
  }, []);

  const highlightNodes = useCallback((highlights) => {
    if (!highlights || highlights.length === 0) {
      setHighlightedIds(new Set());
      return;
    }

    const ids = new Set();
    graphData.nodes.forEach((node) => {
      highlights.forEach((highlight) => {
        if (node.label !== highlight.label) return;
        const props = highlight.properties || {};
        const nodeProps = node.properties || {};
        const matches = Object.entries(props).some(
          ([key, value]) => nodeProps[key] && String(nodeProps[key]) === String(value)
        );
        if (matches) ids.add(node.id);
      });
    });
    setHighlightedIds(ids);
  }, [graphData.nodes]);

  const clearHighlights = useCallback(() => setHighlightedIds(new Set()), []);

  return {
    graphData,
    selectedNode,
    highlightedIds,
    loading,
    stats,
    error,
    loadGraph,
    loadNodeDetail,
    loadStats,
    highlightNodes,
    clearHighlights,
    setSelectedNode,
  };
}
