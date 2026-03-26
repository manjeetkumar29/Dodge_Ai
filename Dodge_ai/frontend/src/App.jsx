import React, { useCallback, useEffect, useRef, useState } from "react";

import ChatPanel from "./components/ChatPanel/ChatPanel";
import DataBrowser from "./components/DataBrowser/DataBrowser";
import GraphViewer from "./components/GraphViewer/GraphViewer";
import Sidebar from "./components/Sidebar/Sidebar";
import { useChat } from "./hooks/useChat";
import { useGraph } from "./hooks/useGraph";

const VIEWS = {
  "Process View": "SalesOrder,OutboundDelivery,BillingDocument,BillingCancellation,JournalEntry,Payment",
  "Item Trace View": "SalesOrderItem,SalesOrderScheduleLine,OutboundDeliveryItem,BillingDocumentItem,Product",
  "Master Data View": "BusinessPartner,BusinessPartnerAddress,CustomerCompany,CustomerSalesArea,Product,Plant,ProductPlant,ProductStorageLocation,ProductDescription",
  "All Data View": null,
};

function Toast({ message, onDone }) {
  useEffect(() => {
    const timeout = setTimeout(onDone, 3000);
    return () => clearTimeout(timeout);
  }, [onDone]);

  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1e3a5f] text-white px-[22px] py-[10px] rounded-lg text-[13px] z-[9999] shadow-[0_4px_12px_rgba(0,0,0,0.2)] [animation:toastIn_0.25s_ease]">{message}</div>;
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeView, setActiveView] = useState("graph");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const graphRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const {
    graphData,
    loading: graphLoading,
    highlightedIds,
    loadGraph,
    highlightNodes,
    loadNodeDetail,
  } = useGraph();

  const { messages, loading: chatLoading, sendMessage, clearChat } = useChat();

  const [graphView, setGraphView] = useState("All Data View");

  useEffect(() => {
    const limit = (graphView === "All Data View" || graphView === "Master Data View") ? 2000 : 2500;
    loadGraph(limit, VIEWS[graphView]);
  }, [loadGraph, graphView]);

  const showToast = (message) => setToast(message);

  const handleNodeClick = useCallback(
    (node) => {
      loadNodeDetail(Number(node.id));
      showToast(`Selected: ${node.label} - ${node.display_id}`);
    },
    [loadNodeDetail]
  );

  const handleSend = useCallback(
    (text) => {
      sendMessage(text, (highlights) => {
        highlightNodes(highlights);
        if (highlights.length > 0) {
          showToast(`Highlighted ${highlights.length} related node(s)`);
        }
      });
    },
    [highlightNodes, sendMessage]
  );

  const breadcrumbs = [
    { label: "Mapping" },
    { label: "Order to Cash", active: true },
  ];

  return (
    <>
      <div className="h-[48px] bg-white dark:bg-gray-900 transition-colors duration-200 flex items-center px-4 gap-[10px] border-b border-[#e5e7eb] dark:border-gray-800 shrink-0 z-[100]">
        {/* Sidebar toggle icon */}
        <button 
          className="bg-transparent border-none text-[#6b7280] dark:text-gray-400 text-[18px] cursor-pointer px-[6px] py-[4px] rounded leading-none transition-colors duration-150 flex items-center hover:text-[#111] dark:hover:text-white" 
          title="Toggle Sidebar"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="16" height="16" rx="3" stroke="#6b7280" strokeWidth="1.5" />
            <line x1="6" y1="1" x2="6" y2="17" stroke="#6b7280" strokeWidth="1.5" />
          </svg>
        </button>
        <span className="text-[#d1d5db] dark:text-gray-600 text-[16px] select-none">/</span>
        <div className="text-[13px] text-[#6b7280] dark:text-gray-400 flex items-center gap-[6px]">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && <span className="text-[#9ca3af] dark:text-gray-600 text-[14px]">/</span>}
              <span className={crumb.active ? "text-[#111] dark:text-white font-semibold" : ""}>{crumb.label}</span>
            </React.Fragment>
          ))}
        </div>
        {activeView === "graph" && (
          <div className="topbar-controls" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", marginRight: "12px" }}>
            <span style={{ fontSize: "12px", color: darkMode ? "#9ca3af" : "#6b7280", fontWeight: 'bold' }}>Graph View:</span>
            <select 
              className="view-select dark:bg-gray-800 dark:text-white dark:border-gray-700"
              value={graphView} 
              onChange={(e) => setGraphView(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid", borderColor: darkMode ? "#374151" : "#d1d5db", fontSize: "12px", background: darkMode ? "#1f2937" : "white", color: darkMode ? "white" : "inherit", cursor: "pointer", outline: "none" }}
            >
              {Object.keys(VIEWS).map(view => (
                <option key={view} value={view}>{view}</option>
              ))}
            </select>
          </div>
        )}
        <button
          className="bg-transparent border-none text-[#6b7280] dark:text-gray-400 text-[18px] cursor-pointer px-[6px] py-[4px] rounded leading-none transition-colors duration-150 flex items-center hover:text-[#111] dark:hover:text-white ml-auto"
          title="Toggle Theme"
          onClick={() => setDarkMode(!darkMode)}
          style={{ marginLeft: activeView === "graph" ? "0" : "auto" }}
        >
          {darkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden max-[900px]:flex-col">
        {showSidebar && (
          <Sidebar 
            activeView={activeView}
            onViewChange={setActiveView}
            collapsed={false}
            stats={graphData?.metadata}
          />
        )}
        <div className="flex-1 flex overflow-hidden bg-[#f5f6f8] dark:bg-gray-950 transition-colors duration-200 max-[900px]:flex-col">
          {activeView === "graph" ? (
            <GraphViewer
              ref={graphRef}
              graphData={graphData}
              loading={graphLoading}
              highlightedIds={highlightedIds}
              onNodeClick={handleNodeClick}
            />
          ) : (
             <DataBrowser onNavigateToGraph={() => setActiveView("graph")} />
          )}
        </div>
        <ChatPanel
          messages={messages}
          loading={chatLoading}
          onSend={handleSend}
          onClear={clearChat}
        />
      </div>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
