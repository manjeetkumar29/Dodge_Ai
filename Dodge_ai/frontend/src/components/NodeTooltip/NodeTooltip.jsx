import React from "react";


const PRIORITY_KEYS = [
  "SalesOrder",
  "BillingDocument",
  "OutboundDelivery",
  "AccountingDocument",
  "PaymentDocument",
  "BusinessPartner",
  "Product",
  "Plant",
  "CompanyCode",
  "FiscalYear",
  "GlAccount",
  "AmountInTransactionCurrency",
  "TransactionCurrency",
  "AmountInCompanyCodeCurrency",
  "CompanyCodeCurrency",
  "PostingDate",
  "DocumentDate",
  "ReferenceDocument",
  "AccountingDocumentType",
  "AccountingDocumentItem",
  "CostCenter",
  "ProfitCenter",
];

// Keys whose values should be shown in orange (numeric / ID fields)
const HIGHLIGHT_KEYS = new Set([
  "FiscalYear",
  "AccountingDocument",
  "GlAccount",
  "AmountInTransactionCurrency",
  "AmountInCompanyCodeCurrency",
  "ReferenceDocument",
  "AccountingDocumentItem",
  "SalesOrder",
  "BillingDocument",
  "OutboundDelivery",
  "PaymentDocument",
]);

const MAX_VISIBLE = 14;

export default function NodeTooltip({ node, x, y, connections = 0 }) {
  if (!node) return null;

  const entries = Object.entries(node.properties || {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
  const sorted = [
    ...entries.filter(([key]) => PRIORITY_KEYS.includes(key)),
    ...entries.filter(([key]) => !PRIORITY_KEYS.includes(key)),
  ];
  const visible = sorted.slice(0, MAX_VISIBLE);
  const hidden = sorted.length - MAX_VISIBLE;

  const style = {
    left: Math.min(x + 16, window.innerWidth - 400),
    top: Math.min(y - 10, window.innerHeight - 420),
  };

  return (
    <div className="absolute bg-white dark:bg-gray-900 border border-[#e5e7eb] dark:border-gray-800 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-[18px] px-5 min-w-[290px] max-w-[370px] z-[1000] text-[13px] pointer-events-none transition-colors duration-200" style={style}>
      <div className="text-[15px] font-bold text-[#111827] dark:text-white mb-3 pb-2.5 border-b border-[#f3f4f6] dark:border-gray-800 transition-colors duration-200">{node.label}</div>
      {visible.map(([key, value]) => (
        <div className="flex gap-2 mb-[5px] leading-[1.45]" key={key}>
          <span className="font-medium text-[#6b7280] dark:text-gray-400 min-w-[100px] shrink-0 text-[12px] transition-colors duration-200">{key}:</span>
          <span className={`text-[#111827] dark:text-gray-200 break-words flex-1 text-[12px] transition-colors duration-200${HIGHLIGHT_KEYS.has(key) ? " text-[#f59e0b] dark:text-[#f59e0b] font-semibold" : ""}`}>
            {String(value)}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <div className="italic text-[#9ca3af] dark:text-gray-500 text-[11px] mt-2 transition-colors duration-200">
          Additional {hidden} fields hidden for readability
        </div>
      )}
      <div className="mt-3 pt-2.5 border-t border-[#f3f4f6] dark:border-gray-800 font-semibold text-[#374151] dark:text-gray-300 text-[12px] transition-colors duration-200">Connections: {connections}</div>
    </div>
  );
}
