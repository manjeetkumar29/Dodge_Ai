import React, { useEffect, useRef, useState, useCallback } from "react";


function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code style="background:#e5e7eb;padding:1px 5px;border-radius:3px;font-size:11px">$1</code>')
    .replace(/\n/g, "<br/>");
}

// Grey person icon SVG
function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="#9ca3af" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Message({ msg, onSend }) {
  const [showCypher, setShowCypher] = useState(false);

  return (
    <div className={`flex flex-col max-w-[95%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
      {msg.role === "user" && (
        <div className="flex items-center gap-2 mb-[5px]">
          <span className="text-[12px] font-semibold text-[#6b7280] dark:text-gray-400">You</span>
          <div className="w-[26px] h-[26px] rounded-full bg-[#e5e7eb] dark:bg-gray-800 text-[#6b7280] dark:text-gray-400 flex items-center justify-center text-[13px] shrink-0">
            <PersonIcon />
          </div>
        </div>
      )}
      {msg.role === "assistant" && (
        <div className="flex items-center gap-2 mb-[5px]">
          <div className="w-[26px] h-[26px] rounded-full bg-[#111827] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">D</div>
          <span className="text-[12px] font-semibold text-[#6b7280] dark:text-gray-400">Dodge AI</span>
        </div>
      )}
      <div
        className={`px-[14px] py-[10px] rounded-[12px] text-[13px] leading-[1.55] transition-colors duration-200 ${msg.role === "user" ? "bg-[#111827] dark:bg-blue-600 text-white rounded-br-[4px]" : "bg-[#f3f4f6] dark:bg-gray-800 text-[#111827] dark:text-gray-100 border border-[#e5e7eb] dark:border-gray-700 rounded-bl-[4px]"} ${msg.error ? "bg-[#fff0f0] border-[#ffdddd] text-[#c00]" : ""}`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
      {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
        <div className="flex flex-col gap-[6px] mt-2 w-full">
          {msg.followUpQuestions.map((q, idx) => (
            <button
              key={idx}
              className="bg-white dark:bg-gray-900 border border-[#e5e7eb] dark:border-gray-700 text-[#4b5563] dark:text-gray-300 py-2 px-3 rounded-lg text-[12px] text-left cursor-pointer transition-all duration-150 shadow-sm leading-[1.4] hover:bg-[#f9fafb] dark:hover:bg-gray-800 hover:border-[#d1d5db] dark:hover:border-gray-600 hover:text-[#111827] dark:hover:text-white"
              onClick={() => onSend(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      {msg.cypher && (
        <>
          <span className="text-[11px] text-[#9ca3af] dark:text-gray-500 cursor-pointer mt-[6px] underline px-1 hover:text-[#374151] dark:hover:text-gray-300" onClick={() => setShowCypher((prev) => !prev)}>
            {showCypher ? "Hide" : "Show"} Cypher query
          </span>
          {showCypher && <pre className="bg-[#f3f4f6] dark:bg-gray-950 border border-[#e5e7eb] dark:border-gray-800 text-gray-800 dark:text-gray-300 p-2 text-[11px] mt-[6px] rounded-[6px] whitespace-pre-wrap break-all max-h-[150px] overflow-y-auto">{msg.cypher}</pre>}
        </>
      )}
      <span className="text-[10px] text-[#d1d5db] mt-1 px-1">{formatTime(msg.timestamp)}</span>
    </div>
  );
}

export default function ChatPanel({ messages, loading, onSend, onClear }) {
  const [input, setInput] = useState("");
  const [width, setWidth] = useState(400);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "ew-resize";
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = "default";
    }
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = (textOverride) => {
    const textToSend = typeof textOverride === "string" ? textOverride : input;
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    if (textToSend === input) setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 bg-white dark:bg-gray-900 border-l border-[#e5e7eb] dark:border-gray-800 transition-colors duration-200 flex flex-col h-full relative" style={{ width }}>
      <div 
        className="absolute left-0 top-0 bottom-0 w-[6px] cursor-ew-resize bg-transparent z-10 transition-colors duration-200 hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/10" 
        onMouseDown={startResizing}
        title="Drag to resize chat"
      />
      {/* Header */}
      <div className="py-[14px] px-[18px] border-b border-[#e5e7eb] dark:border-gray-800">
        <div className="font-bold text-[14px] text-[#111827] dark:text-white">Chat with Graph</div>
        <div className="text-[12px] text-[#9ca3af] dark:text-gray-400 mt-[1px]">Order to Cash</div>
      </div>

      {/* Agent info row */}
      <div className="flex items-center gap-3 py-[14px] px-[18px] border-b border-[#e5e7eb] dark:border-gray-800">
        <div className="w-[38px] h-[38px] rounded-full bg-[#111827] dark:bg-blue-600 transition-colors duration-200 text-white flex items-center justify-center font-bold text-[16px] shrink-0">D</div>
        <div>
          <div className="font-bold text-[13px] text-[#111827] dark:text-white">Dodge AI</div>
          <div className="text-[11px] text-[#9ca3af] dark:text-gray-400 mt-[1px]">Graph Agent</div>
        </div>
        <button className="ml-auto bg-transparent border border-[#e5e7eb] dark:border-gray-700 text-[#9ca3af] px-[10px] py-1 rounded-[6px] text-[11px] cursor-pointer transition-colors duration-150 hover:bg-[#f3f4f6] dark:hover:bg-gray-800 hover:text-[#374151] dark:hover:text-white" onClick={onClear}>
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 py-5 px-[18px] overflow-y-auto flex flex-col gap-[18px]">
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} onSend={handleSend} />
        ))}
        {loading && (
          <div className="flex flex-col max-w-[95%] self-start items-start">
            <div className="flex items-center gap-2 mb-[5px]">
              <div className="w-[26px] h-[26px] rounded-full bg-[#111827] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">D</div>
              <span className="text-[12px] font-semibold text-[#6b7280] dark:text-gray-400">Dodge AI</span>
            </div>
            <div className="flex gap-1 py-[10px] px-[14px]">
              <div className="w-[7px] h-[7px] rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-[7px] h-[7px] rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-[7px] h-[7px] rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 py-[10px] px-[18px] text-[12px] text-[#6b7280] dark:text-gray-400 bg-[#f9fafb] dark:bg-gray-800/50 border-y border-[#e5e7eb] dark:border-gray-800 transition-colors duration-200">
        <div className={`w-2 h-2 rounded-full shrink-0 ${loading ? "bg-[#f59e0b] animate-pulse" : "bg-[#22c55e]"}`} />
        {loading ? "Dodge AI is thinking..." : "Dodge AI is awaiting instructions"}
      </div>

      {/* Input area */}
      <div className="py-[14px] px-[18px] bg-white dark:bg-gray-900 transition-colors duration-200 flex items-end gap-[10px] border-t border-[#e5e7eb] dark:border-gray-800">
        <textarea
          ref={textareaRef}
          className="flex-1 py-[10px] px-[14px] rounded-lg border border-[#d1d5db] dark:border-gray-700 text-[13px] leading-[1.5] resize-none bg-white dark:bg-gray-800 text-[#111827] dark:text-white placeholder:text-[#9ca3af] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#6b7280] dark:focus:border-gray-500 focus:ring-2 focus:ring-[#6b7280]/10 dark:focus:ring-gray-500/20 transition-colors duration-200"
          placeholder="Analyze anything"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button className="py-[9px] px-[18px] bg-[#374151] dark:bg-blue-600 rounded-lg text-white text-[13px] font-medium cursor-pointer transition-colors duration-150 whitespace-nowrap hover:bg-[#111827] dark:hover:bg-blue-500 disabled:bg-[#d1d5db] dark:disabled:bg-gray-700 disabled:cursor-not-allowed" onClick={handleSend} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
