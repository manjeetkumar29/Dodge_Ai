import React, { useCallback, useEffect, useState } from "react";

import { getFolderData, getIngestionStatus, listFolders, startIngestion } from "../../services/api";

const FOLDERS_META = {
  billing_document_cancellations: "Billing Cancellations",
  billing_document_headers: "Billing Document Headers",
  billing_document_items: "Billing Document Items",
  business_partner_addresses: "Business Partner Addresses",
  business_partners: "Business Partners",
  customer_company_assignments: "Customer Company Assignments",
  customer_sales_area_assignments: "Customer Sales Area Assignments",
  journal_entry_items_accounts_receivable: "Journal Entry AR Items",
  outbound_delivery_headers: "Outbound Delivery Headers",
  outbound_delivery_items: "Outbound Delivery Items",
  payments_accounts_receivable: "Payments AR",
  plants: "Plants",
  product_descriptions: "Product Descriptions",
  product_plants: "Product Plants",
  product_storage_locations: "Product Storage Locations",
  products: "Products",
  sales_order_headers: "Sales Order Headers",
  sales_order_items: "Sales Order Items",
  sales_order_schedule_lines: "Sales Order Schedule Lines",
};

function formatBytes(bytes) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DataBrowser({ onNavigateToGraph }) {
  const [folders, setFolders] = useState([]);
  const [search, setSearch] = useState("");
  const [ingestionStatus, setIngestionStatus] = useState(null);
  const [ingestionRunning, setIngestionRunning] = useState(false);
  const [ingestionSteps, setIngestionSteps] = useState([]);

  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderData, setFolderData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const response = await listFolders();
      setFolders(response.data.folders || []);
    } catch {
      setFolders(
        Object.keys(FOLDERS_META).map((name) => ({
          name,
          file_count: 0,
          files: [],
        }))
      );
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const response = await getIngestionStatus();
      const data = response.data;
      setIngestionStatus(data.status);
      setIngestionSteps(data.steps || []);
      if (data.status === "running") {
        setIngestionRunning(true);
        setTimeout(pollStatus, 2000);
      } else {
        setIngestionRunning(false);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    loadFolders();
    pollStatus();
  }, [loadFolders, pollStatus]);

  const handleIngest = async () => {
    try {
      await startIngestion();
      setIngestionRunning(true);
      setTimeout(pollStatus, 1500);
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to start ingestion");
    }
  };

  const handleSelectFolder = async (folderName) => {
    setSelectedFolder(folderName);
    setLoadingData(true);
    setFolderData(null);
    try {
      const response = await getFolderData(folderName);
      setFolderData(response.data);
    } catch (error) {
      alert("Failed to load table data");
    } finally {
      setLoadingData(false);
    }
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setFolderData(null);
  };

  const filtered = folders.filter((folder) => folder.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 bg-[#f5f5f5] dark:bg-gray-950 flex flex-col overflow-hidden transition-colors duration-200">
      <div className="bg-white dark:bg-gray-900 border-b border-[#e0e0e0] dark:border-gray-800 pt-5 px-7 pb-4 max-[900px]:p-4 transition-colors duration-200">
        <div className="text-[12px] text-[#888] dark:text-gray-400 mb-1.5">
          Storage / <span className="text-[#333] dark:text-white font-semibold">sap-o2c-data</span> {selectedFolder && <> / <span className="text-[#333] dark:text-white font-semibold">{selectedFolder}</span></>}
        </div>
        <div className="text-[22px] font-bold text-[#111] dark:text-white flex items-center gap-3">
          {selectedFolder ? (
            <>
              <button className="bg-transparent border border-[#e0e0e0] dark:border-gray-700 rounded-[6px] py-1 px-[10px] text-[13px] font-medium text-[#666] dark:text-gray-300 cursor-pointer transition-all duration-200 hover:bg-[#f5f5f5] dark:hover:bg-gray-800 hover:text-[#111] dark:hover:text-white" onClick={handleBackToFolders}>
                ← Back
              </button>
              {selectedFolder}
              {folderData && <span className="text-[13px] font-normal text-[#888] dark:text-gray-300 bg-[#f0f0f0] dark:bg-gray-800 py-[2px] px-[10px] rounded-xl">{folderData.data.length} rows preview</span>}
            </>
          ) : (
            <>
              sap-o2c-data
              <span className="text-[13px] font-normal text-[#888] dark:text-gray-300 bg-[#f0f0f0] dark:bg-gray-800 py-[2px] px-[10px] rounded-xl">{folders.length} items</span>
            </>
          )}
        </div>
        {!selectedFolder && (
          <div className="flex items-center gap-[10px] mt-3 max-[900px]:flex-wrap">
            <input
              className="py-[7px] px-[14px] border border-[#ddd] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#111827] dark:text-white placeholder:text-[#9ca3af] dark:placeholder:text-gray-500 rounded-[6px] text-[13px] w-[260px] outline-none transition-colors duration-150 focus:border-[#4a90e2] dark:focus:border-[#4a90e2] max-[900px]:w-full"
              placeholder="Search folders..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              className={`ml-auto py-[7px] px-[18px] text-white border-none rounded-[6px] text-[13px] font-medium cursor-pointer transition-colors duration-150 disabled:bg-[#aaa] disabled:cursor-not-allowed ${ingestionRunning ? "bg-[#e8a020] animate-[pulse_1.2s_infinite]" : "bg-[#4a90e2] hover:bg-[#357abd]"}`}
              onClick={handleIngest}
              disabled={ingestionRunning}
            >
              {ingestionRunning ? "Ingesting..." : "Ingest to Graph"}
            </button>
            <button
              className="py-[7px] px-[18px] bg-[#6366f1] text-white border-none rounded-[6px] text-[13px] font-medium cursor-pointer transition-colors duration-150 hover:bg-[#4f46e5]"
              style={{ marginLeft: 0 }}
              onClick={onNavigateToGraph}
            >
              Open Graph
            </button>
          </div>
        )}
      </div>

      {!selectedFolder && ingestionStatus && ingestionStatus !== "idle" && (
        <div className={`mx-7 mb-3 px-4 py-2.5 rounded-lg text-[12px] flex items-center gap-2 max-[900px]:mx-4 ${ingestionStatus === 'success' ? 'bg-[#ecfdf5] dark:bg-green-900/30 border border-[#a7f3d0] dark:border-green-800/50 text-[#065f46] dark:text-green-300' : ingestionStatus === 'error' ? 'bg-[#fef2f2] dark:bg-red-900/30 border border-[#fca5a5] dark:border-red-800/50 text-[#7f1d1d] dark:text-red-300' : 'bg-[#fffbeb] dark:bg-yellow-900/30 border border-[#fcd34d] dark:border-yellow-800/50 text-[#78350f] dark:text-yellow-300'}`}>
          <span className={`w-2 h-2 rounded-full inline-block ${ingestionStatus === 'success' ? 'bg-[#22c55e]' : ingestionStatus === 'error' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'}`} />
          {ingestionStatus === "running" && "Ingestion pipeline is running..."}
          {ingestionStatus === "completed" &&
            `Ingestion completed successfully - ${ingestionSteps.length} steps`}
          {ingestionStatus === "error" && "Ingestion encountered errors"}
        </div>
      )}

      {!selectedFolder && ingestionSteps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mx-7 mb-3 max-[900px]:mx-4">
          {ingestionSteps.map((step, index) => (
            <span
              key={`${step.step}-${index}`}
              className={`py-[3px] px-[10px] rounded-xl text-[11px] font-medium ${step.status === 'success' ? 'bg-[#dcfce7] dark:bg-green-900/50 text-[#166534] dark:text-green-300' : 'bg-[#fee2e2] dark:bg-red-900/50 text-[#991b1b] dark:text-red-300'}`}
              title={step.error || ""}
            >
              {step.status === "success" ? "OK" : "ERR"} {step.step}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200 my-4 mx-7 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] max-[900px]:my-3 max-[900px]:mx-4">
        {selectedFolder ? (
          loadingData ? (
             <div className="p-10 text-center text-[#888] dark:text-gray-400 text-[14px]">Loading preview data...</div>
          ) : folderData && folderData.columns.length > 0 ? (
             <div className="overflow-auto flex-1">
               <table className="w-full border-collapse">
                 <thead>
                   <tr>
                     {folderData.columns.map((col) => (
                       <th className="p-3 px-4 text-left text-[12px] font-semibold text-[#888] dark:text-gray-400 border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap" key={col}>{col}</th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                   {folderData.data.map((row, idx) => (
                     <tr className="hover:bg-[#f9fbff] dark:hover:bg-gray-800/60 transition-colors" key={idx}>
                       {folderData.columns.map((col) => (
                         <td className="py-[11px] px-4 text-[13px] text-[#444] dark:text-gray-300 border-b border-[#f5f5f5] dark:border-gray-800 align-middle whitespace-nowrap" key={col}>{row[col] === null ? <span className="text-[#ccc] dark:text-gray-500 italic text-[11px]">NULL</span> : row[col]}</td>
                       ))}
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          ) : (
             <div className="p-10 text-center text-[#888] dark:text-gray-400 text-[14px]">No data found in {selectedFolder}</div>
          )
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 px-4 text-left border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10" style={{ width: 40 }} />
                  <th className="p-3 px-4 text-left text-[12px] font-semibold text-[#888] dark:text-gray-400 border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">Name</th>
                  <th className="p-3 px-4 text-left text-[12px] font-semibold text-[#888] dark:text-gray-400 border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">Files</th>
                  <th className="p-3 px-4 text-left text-[12px] font-semibold text-[#888] dark:text-gray-400 border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">Last Modified</th>
                  <th className="p-3 px-4 text-left text-[12px] font-semibold text-[#888] dark:text-gray-400 border-b border-[#eee] dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10 whitespace-nowrap">Total Size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((folder) => {
                  const lastModified = (folder.files || []).reduce(
                    (max, file) => Math.max(max, file.modified || 0),
                    0
                  );
                  const size = (folder.files || []).reduce((acc, file) => acc + (file.size || 0), 0);
                  return (
                    <tr className="hover:bg-[#f9fbff] dark:hover:bg-gray-800/60 transition-colors" key={folder.name}>
                      <td className="py-[11px] px-4 border-b border-[#f5f5f5] dark:border-gray-800 align-middle">
                        <span className="text-[#888] dark:text-gray-500 text-[16px] mr-1">[]</span>
                      </td>
                      <td className="py-[11px] px-4 text-[13px] text-[#444] dark:text-gray-300 border-b border-[#f5f5f5] dark:border-gray-800 align-middle whitespace-nowrap">
                        <span className="text-[#2563eb] dark:text-blue-400 font-medium cursor-pointer hover:underline" onClick={() => handleSelectFolder(folder.name)}>
                          {folder.name}
                        </span>
                      </td>
                      <td className="py-[11px] px-4 text-[13px] text-[#444] dark:text-gray-300 border-b border-[#f5f5f5] dark:border-gray-800 align-middle whitespace-nowrap">{folder.file_count || "-"}</td>
                      <td className="py-[11px] px-4 text-[13px] text-[#444] dark:text-gray-300 border-b border-[#f5f5f5] dark:border-gray-800 align-middle whitespace-nowrap">{lastModified ? formatDate(lastModified) : "-"}</td>
                      <td className="py-[11px] px-4 text-[13px] text-[#444] dark:text-gray-300 border-b border-[#f5f5f5] dark:border-gray-800 align-middle whitespace-nowrap">{size ? formatBytes(size) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
