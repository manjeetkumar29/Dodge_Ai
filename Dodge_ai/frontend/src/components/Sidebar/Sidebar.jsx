import React from "react";


const NAV_ITEMS = [
  { id: "browser", icon: "DB", label: "Data Browser" },
  { id: "graph", icon: "GV", label: "Graph View" },
];

export default function Sidebar({ activeView, onViewChange, collapsed, stats }) {
  return (
    <aside className={`bg-white dark:bg-gray-900 text-[#111827] dark:text-white transition-colors duration-200 flex flex-col border-r border-[#e5e7eb] dark:border-gray-800 transition-[width] duration-250 ease overflow-hidden z-10 ${collapsed ? "w-0 min-w-0" : "w-[240px] min-w-[240px]"}`}>
      <div className="pt-[18px] px-4 pb-3 border-b border-[#e5e7eb] dark:border-gray-800 transition-colors duration-200">
        <div className="text-[13px] font-bold tracking-[0.08em] text-[#111827] dark:text-white uppercase transition-colors duration-200">SAP O2C Graph</div>
        <div className="text-[11px] text-[#6b7280] dark:text-gray-400 mt-[2px] transition-colors duration-200">Intelligence Platform</div>
      </div>

      <div className="pt-3 px-4 pb-[6px]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#555] dark:text-gray-400 mb-2 transition-colors duration-200">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`w-full flex items-center gap-[10px] py-2 px-3 rounded-[6px] cursor-pointer text-[13px] transition-colors duration-150 mb-[2px] border-none text-left ${activeView === item.id ? "bg-[#111827] dark:bg-gray-800 text-white font-medium" : "bg-transparent text-[#4b5563] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-800/60 hover:text-[#111827] dark:hover:text-white"}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="text-[12px] w-[20px] text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {stats && (
        <div className="mt-auto pt-3 px-4 border-t border-[#e5e7eb] dark:border-gray-800 text-[11px] text-[#6b7280] dark:text-gray-400 transition-colors duration-200">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#555] dark:text-gray-400 mb-2">Graph Stats</div>
          {(stats.node_counts || []).slice(0, 6).map((item) => (
            <div className="flex justify-between mb-1" key={item.label}>
              <span className="transition-colors duration-200">{item.label}</span>
              <span className="text-[#111827] dark:text-white font-semibold transition-colors duration-200">{item.count?.toLocaleString?.() || item.count}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
