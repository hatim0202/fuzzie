"use client";

import { useState, useEffect } from "react";
import { FileText, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { postContentToNotion, onSaveUserNotionConfig, onGetUserNotionConfig } from "@/actions/notion";

export default function NotionConnectionCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [title, setTitle] = useState("Automated Task from Fuzzie");
  const [content, setContent] = useState("New entry synchronized via Fuzzie visual automation.");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true); // loading saved config
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load saved global Notion settings from user account on mount
  useEffect(() => {
    const loadSavedNotion = async () => {
      try {
        const res = await onGetUserNotionConfig();
        if (res.status === 200) {
          // Always set state (even empty strings) so `isConnected` is accurate
          setAccessToken(res.accessToken ?? "");
          setDatabaseId(res.databaseId ?? "");
        }
      } catch (err) {
        console.error("Failed to load saved Notion config:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadSavedNotion();
  }, []);

  const handleTestNotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !databaseId) {
      setStatus({ type: "error", text: "Please provide both Notion Integration Secret and Database ID" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Save globally to User Account and get the persisted values back
      const saveRes = await onSaveUserNotionConfig(accessToken.trim(), databaseId.trim());
      if (saveRes.status === 200) {
        // Update state from server response so UI reflects persisted values
        setAccessToken(saveRes.notionAccessToken ?? accessToken.trim());
        setDatabaseId(saveRes.notionDbId ?? databaseId.trim());
      }

      // 2. Test create record
      const res = await postContentToNotion(title, content, databaseId.trim(), accessToken.trim());
      if (res.status === 200) {
        setStatus({ type: "success", text: "Notion connection saved & record created in your database!" });
      } else {
        setStatus({ type: "success", text: "Notion config saved to account! (Test alert: " + (res.error || "failed") + ")" });
      }
    } catch {
      setStatus({ type: "error", text: "An unexpected error occurred while connecting to Notion" });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !configLoading && Boolean(accessToken && databaseId);

  return (
    <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition">
      <div className="flex items-start gap-5">
        {/* Notion Icon */}
        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
          <FileText className="w-6 h-6 text-amber-400" />
        </div>

        {/* Info & Action */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Notion</h3>
                {configLoading ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-500 text-[10px] font-semibold">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Checking...
                  </span>
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Create database entries and sync pages automatically with your workflows.
              </p>
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            >
              {isOpen ? "Close" : isConnected ? "Update" : "Connect"}
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Collapsible Notion Testing Panel */}
          {isOpen && (
            <form onSubmit={handleTestNotion} className="mt-4 pt-4 border-t border-neutral-800/60 space-y-4">
              {/* Access Token Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                  <span>Internal Integration Secret (API Key)</span>
                  <a
                    href="https://www.notion.so/profile/integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    Create token <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="password"
                  placeholder={accessToken ? "••••••••••••••••••••••••" : "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              {/* Database ID Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Notion Database ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2b9b7a42a0484eb3b519f71c49b08f88"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              {/* Test Title & Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Test Entry Title
                </label>
                <input
                  type="text"
                  placeholder="Title of test record"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Test Entry Content
                </label>
                <textarea
                  rows={2}
                  placeholder="Body content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition resize-none"
                  required
                />
              </div>

              {/* Status Banner */}
              {status && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                    status.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{status.text}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating in Notion...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Save & Test Connection
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
