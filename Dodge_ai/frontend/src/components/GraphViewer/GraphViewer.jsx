import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as d3 from "d3";

import NodeTooltip from "../NodeTooltip/NodeTooltip";

const LABEL_COLORS = {
  SalesOrder: "#3b82f6",         // Blue
  SalesOrderItem: "#60a5fa",     // Light blue
  SalesOrderScheduleLine: "#93c5fd", // Lighter blue
  OutboundDelivery: "#10b981",   // Emerald
  OutboundDeliveryItem: "#34d399", // Light emerald
  BillingDocument: "#f59e0b",    // Amber
  BillingDocumentItem: "#fbbf24",// Light amber
  BillingCancellation: "#ef4444",// Red
  JournalEntry: "#8b5cf6",       // Violet
  Payment: "#14b8a6",            // Teal
  BusinessPartner: "#ec4899",    // Pink
  BusinessPartnerAddress: "#f472b6", // Light pink
  CustomerCompany: "#6366f1",    // Indigo
  CustomerSalesArea: "#818cf8",  // Light indigo
  Product: "#f97316",            // Orange
  ProductDescription: "#fb923c", // Light orange
  Plant: "#84cc16",              // Lime
  ProductPlant: "#a3e635",       // Light lime
  ProductStorageLocation: "#06b6d4" // Cyan
};

const DEFAULT_COLOR = "#c5ccd8";
const NODE_TYPES = Object.keys(LABEL_COLORS);

function getColor(label) {
  return LABEL_COLORS[label] || DEFAULT_COLOR;
}

function getRadius(label) {
  const large = ["SalesOrder", "BillingDocument", "BusinessPartner", "OutboundDelivery"];
  const medium = ["JournalEntry", "Payment", "Product", "Plant"];
  if (large.includes(label)) return 8;
  if (medium.includes(label)) return 6;
  return 4;
}

// Minimize icon SVG
function MinimizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M8 3H3v5M21 3h-5v5M16 21h5v-5M3 16v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Overlay icon SVG
function OverlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

const GraphViewer = forwardRef(function GraphViewer(
  { graphData, loading, highlightedIds = new Set(), onNodeClick },
  ref
) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);
  const zoomRef = useRef(null);
  const gRef = useRef(null);

  const [tooltip, setTooltip] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activeFilters, setActiveFilters] = useState(new Set(NODE_TYPES));
  const [dimensions, setDimensions] = useState({ w: 900, h: 600 });

  useImperativeHandle(ref, () => ({
    resetZoom: () => {
      if (svgRef.current && zoomRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(600)
          .call(zoomRef.current.transform, d3.zoomIdentity);
      }
    },
  }));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ w: width, h: height });
        }
      }
    });

    observer.observe(element);
    setDimensions({ w: element.clientWidth, h: element.clientHeight });
    return () => observer.disconnect();
  }, []);

  const buildGraph = useCallback(() => {
    if (!svgRef.current || !graphData?.nodes?.length) return undefined;

    const { w, h } = dimensions;
    const visibleNodes = graphData.nodes.filter((node) => activeFilters.has(node.label));
    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    const visibleLinks = (graphData.edges || []).filter(
      (edge) => visibleIds.has(String(edge.source)) && visibleIds.has(String(edge.target))
    );

    const nodes = visibleNodes.map((node) => ({ ...node }));
    const links = visibleLinks.map((edge) => ({
      source: String(edge.source),
      target: String(edge.target),
      type: edge.type,
    }));

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", w)
      .attr("height", h)
      .style("cursor", "grab");

    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 16)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#a8c4e0")
      .attr("opacity", 0.5);

    const g = svg.append("g");
    gRef.current = g;

    const zoom = d3
      .zoom()
      .scaleExtent([0.03, 10])
      .on("zoom", (event) => g.attr("transform", event.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    const linkSel = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "stroke-[#a8c4e0] dark:stroke-gray-700 stroke-opacity-50 dark:stroke-opacity-60 stroke-[1px] fill-none transition-colors duration-200")
      .attr("marker-end", "url(#arrow)");

    const nodeSel = g
      .append("g")
      .selectAll("g")
      .data(nodes, (node) => node.id)
      .join("g")
      .attr("class", "cursor-pointer")
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", (event, node) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart();
            node.fx = node.x;
            node.fy = node.y;
          })
          .on("drag", (event, node) => {
            node.fx = event.x;
            node.fy = event.y;
          })
          .on("end", (event, node) => {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            node.fx = null;
            node.fy = null;
          })
      );

    nodeSel
      .append("circle")
      .attr("class", "cursor-pointer transition-[r] duration-150")
      .attr("r", (node) => getRadius(node.label))
      .attr("fill", (node) => getColor(node.label))
      .attr("stroke", (node) => (highlightedIds.has(node.id) ? "#f59e0b" : "rgba(255,255,255,0.6)"))
      .attr("stroke-width", (node) => (highlightedIds.has(node.id) ? 3 : 1.2));

    nodeSel
      .append("text")
      .attr("class", "text-[9px] fill-[#555] dark:fill-gray-300 transition-colors duration-200 pointer-events-none select-none")
      .attr("dy", "0.35em")
      .attr("x", (node) => getRadius(node.label) + 3)
      .text((node) => (highlightedIds.has(node.id) ? node.display_id?.slice(0, 12) || node.label : ""));

    nodeSel
      .on("mouseover", (event, node) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        const connections = links.filter(
          (link) =>
            String(link.source.id || link.source) === node.id ||
            String(link.target.id || link.target) === node.id
        ).length;
        setTooltip({ node, x, y, connections });
      })
      .on("mousemove", (event) => {
        const [x, y] = d3.pointer(event, containerRef.current);
        setTooltip((prev) => (prev ? { ...prev, x, y } : prev));
      })
      .on("mouseout", () => setTooltip(null))
      .on("click", (event, node) => {
        event.stopPropagation();
        if (onNodeClick) onNodeClick(node);
      });

    if (simulationRef.current) simulationRef.current.stop();

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((node) => node.id)
          .distance(40)
          .strength(0.8)
      )
      .force("charge", d3.forceManyBody().strength(-80).distanceMax(150))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius((node) => getRadius(node.label) + 2))
      .alphaDecay(0.06);

    simulationRef.current = simulation;

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (link) => link.source.x)
        .attr("y1", (link) => link.source.y)
        .attr("x2", (link) => link.target.x)
        .attr("y2", (link) => link.target.y);

      nodeSel.attr("transform", (node) => `translate(${node.x},${node.y})`);
    });

    simulation.on("end", () => {
      const padding = 40;
      const xs = nodes.map((node) => node.x);
      const ys = nodes.map((node) => node.y);
      const x0 = Math.min(...xs) - padding;
      const y0 = Math.min(...ys) - padding;
      const x1 = Math.max(...xs) + padding;
      const y1 = Math.max(...ys) + padding;
      const boundsWidth = x1 - x0 || 1;
      const boundsHeight = y1 - y0 || 1;
      const scale = Math.min(0.9, Math.min(w / boundsWidth, h / boundsHeight));
      const tx = (w - scale * (x0 + x1)) / 2;
      const ty = (h - scale * (y0 + y1)) / 2;
      svg
        .transition()
        .duration(800)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

    return () => simulation.stop();
  }, [activeFilters, dimensions, graphData, highlightedIds, onNodeClick]);

  useEffect(() => buildGraph(), [buildGraph]);

  useEffect(() => {
    if (!gRef.current) return;

    gRef.current
      .selectAll("g circle")
      .attr("stroke", (node) => (node && highlightedIds.has(node.id) ? "#f59e0b" : "rgba(255,255,255,0.6)"))
      .attr("stroke-width", (node) => (node && highlightedIds.has(node.id) ? 3 : 1.2))
      .attr("r", (node) => (node ? getRadius(node.label) + (highlightedIds.has(node.id) ? 3 : 0) : 4));

    gRef.current
      .selectAll("g text")
      .text((node) => (node && highlightedIds.has(node.id) ? node.display_id?.slice(0, 12) || node.label : ""));
  }, [highlightedIds]);

  const toggleFilter = useCallback((label) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const labelCounts = {};
  (graphData?.nodes || []).forEach((node) => {
    labelCounts[node.label] = (labelCounts[node.label] || 0) + 1;
  });
  const presentLabels = NODE_TYPES.filter((label) => labelCounts[label]);

  return (
    <div className="flex-1 relative bg-[#f5f6f8] dark:bg-gray-950 transition-colors duration-200 overflow-hidden flex flex-col" ref={containerRef}>
      <div className="absolute top-[14px] left-[14px] flex gap-2 z-20 max-[900px]:flex-wrap max-[900px]:max-w-[60%]">
        {/* Minimize button — light outlined */}
        <button
          className="flex items-center justify-center gap-1.5 px-[14px] py-[7px] bg-white dark:bg-gray-800 text-[#374151] dark:text-gray-200 border border-[#d1d5db] dark:border-gray-700 rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150 shadow-sm hover:bg-[#f3f4f6] dark:hover:bg-gray-700 hover:border-[#9ca3af] dark:hover:border-gray-500"
          onClick={() => {
            if (svgRef.current && zoomRef.current) {
              d3.select(svgRef.current)
                .transition()
                .duration(500)
                .call(zoomRef.current.transform, d3.zoomIdentity);
            }
          }}
        >
          <MinimizeIcon />
          Minimize
        </button>

        {/* Hide/Show Granular Overlay — always dark filled */}
        <button
          className={`flex items-center justify-center gap-1.5 px-[14px] py-[7px] rounded-lg text-[12px] font-medium cursor-pointer transition-colors duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${showOverlay ? "bg-[#111827] dark:bg-blue-600 text-white border border-[#111827] dark:border-blue-700 hover:bg-[#1f2937] dark:hover:bg-blue-500 hover:border-[#1f2937] dark:hover:border-blue-500" : "bg-white dark:bg-gray-800 text-[#374151] dark:text-gray-200 border border-[#d1d5db] dark:border-gray-700 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 hover:border-[#9ca3af] dark:hover:border-gray-500"}`}
          onClick={() => setShowOverlay((prev) => !prev)}
        >
          <OverlayIcon />
          {showOverlay ? "Hide Granular Overlay" : "Show Granular Overlay"}
        </button>
      </div>

      {showOverlay && (
        <div className="absolute top-[14px] right-[14px] flex flex-wrap gap-[5px] max-w-[320px] justify-end z-20 max-[900px]:max-w-[45%]">
          {presentLabels.map((label) => (
            <span
              key={label}
              className={`py-1 px-2.5 rounded-xl text-[11px] font-medium cursor-pointer border-[1.5px] border-transparent transition-all duration-150 text-white ${activeFilters.has(label) ? "opacity-100 shadow-[0_1px_4px_rgba(0,0,0,0.15)]" : "opacity-50"}`}
              style={{ background: getColor(label) }}
              onClick={() => toggleFilter(label)}
              title={`${labelCounts[label] || 0} nodes`}
            >
              {label.replace(/([A-Z])/g, " $1").trim()}
            </span>
          ))}
        </div>
      )}

      <svg ref={svgRef} className="flex-1 w-full h-full" />

      {loading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-[#e5e7eb] dark:border-gray-800 border-t-[#6b7280] dark:border-t-gray-400 rounded-full animate-[spin_0.8s_linear_infinite]" />
          <span className="text-[13px] text-[#9ca3af] dark:text-gray-500">Loading graph data...</span>
        </div>
      )}

      {tooltip && (
        <NodeTooltip
          node={tooltip.node}
          x={tooltip.x}
          y={tooltip.y}
          connections={tooltip.connections}
        />
      )}

      {showOverlay && presentLabels.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/92 dark:bg-gray-900/92 border border-[#e5e7eb] dark:border-gray-800 rounded-lg py-2.5 px-[14px] text-[11px] backdrop-blur z-10 transition-colors duration-200 shadow-sm">
          <div className="font-bold text-[#333] dark:text-gray-100 mb-1.5">Node Types</div>
          {presentLabels.slice(0, 8).map((label) => (
            <div className="flex items-center gap-[7px] mb-1 text-[#555] dark:text-gray-300" key={label}>
              <div className="w-[10px] h-[10px] rounded-full shrink-0" style={{ background: getColor(label) }} />
              {label.replace(/([A-Z])/g, " $1").trim()}
            </div>
          ))}
          {presentLabels.length > 8 && (
            <div className="flex items-center gap-[7px] mb-1 text-[#9ca3af] dark:text-gray-500">
              + {presentLabels.length - 8} more
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-white/92 dark:bg-gray-900/92 border border-[#e5e7eb] dark:border-gray-800 rounded-lg py-[7px] px-[14px] text-[11px] text-[#6b7280] dark:text-gray-400 backdrop-blur z-10 transition-colors duration-200 shadow-sm">
        <strong className="text-[#374151] dark:text-gray-200">{(graphData?.nodes || []).length}</strong> nodes |{" "}
        <strong className="text-[#374151] dark:text-gray-200">{(graphData?.edges || []).length}</strong> edges
        {highlightedIds.size > 0 && (
          <>
            {" "}| <strong style={{ color: "#f59e0b" }}>{highlightedIds.size}</strong> highlighted
          </>
        )}
      </div>
    </div>
  );
});

export default GraphViewer;
