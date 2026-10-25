"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { postContentToDiscord, onSaveUserDiscordWebhook, onGetUserDiscordWebhook } from "@/actions/discord";

export default function DiscordConnectionCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [message, setMessage] = useState("Hello from Fuzzie Automation!");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load saved global Discord Webhook from user account
  useEffect(() => {
    const loadSavedWebhook = async () => {
      try {
        const res = await onGetUserDiscordWebhook();
        if (res.status === 200) {
          setWebhookUrl(res.webhookUrl ?? "");
        }
      } catch (err) {
        console.error("Failed to load saved Discord webhook:", err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadSavedWebhook();
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl || !webhookUrl.trim()) {
      setStatus({ type: "error", text: "Please enter a valid Discord Webhook URL" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Save globally to User Account
      await onSaveUserDiscordWebhook(webhookUrl.trim());

      // 2. Send test message to verify
      const res = await postContentToDiscord(message, webhookUrl.trim());
      if (res.status === 200) {
        setStatus({
          type: "success",
          text: "Discord Webhook saved & verified! Test message sent to your channel.",
        });
      } else {
        setStatus({
          type: "success",
          text: "Discord Webhook saved to your account! (Test alert: " + (res.error || "failed") + ")",
        });
      }
    } catch {
      setStatus({ type: "error", text: "An unexpected error occurred while saving Discord connection" });
    } finally {
      setLoading(false);
    }
  };

  const isConnected = !configLoading && Boolean(webhookUrl && webhookUrl.trim().length > 0);

  return (
    <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition">
      <div className="flex items-start gap-5">
        {/* Discord Icon */}
        <div className="p-3 rounded-xl border bg-indigo-500/10 border-indigo-500/20">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
        </div>

        {/* Info & Action */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Discord</h3>
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
                Send automated alerts and notifications to any Discord channel via webhooks.
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

          {/* Collapsible Webhook Testing Panel */}
          {isOpen && (
            <form onSubmit={handleSaveAndTest} className="mt-4 pt-4 border-t border-neutral-800/60 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                  <span>Discord Webhook URL</span>
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    How to get URL <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Test Message Content
                </label>
                <textarea
                  rows={2}
                  placeholder="Type a message to send..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition resize-none"
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
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Connection & Testing...
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
