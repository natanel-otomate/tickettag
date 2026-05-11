"use client";

import { useState } from "react";
import ConfigPanel from "@/components/ConfigPanel";
import HistoryPanel from "@/components/HistoryPanel";

type Tab = "config" | "history";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("config");
  const [boardId, setBoardId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-bold text-lg tracking-tight">
            TicketTag
          </span>
          <span className="text-xs text-gray-400 font-normal mt-0.5">
            Sequential ID Generator
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab("config")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === "config"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Configuration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === "history"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              History
            </button>
          </div>

          <div className="p-6">
            {activeTab === "config" && (
              <ConfigPanel onBoardSelected={(id) => setBoardId(id)} />
            )}
            {activeTab === "history" && (
              <HistoryPanel boardId={boardId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}