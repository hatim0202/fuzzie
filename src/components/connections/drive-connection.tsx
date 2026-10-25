"use client";

import { useState, useEffect } from "react";
import {
  HardDrive,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  KeyRound,
  RefreshCw,
  LogOut,
  FileText,
  FolderOpen,
} from "lucide-react";
import {
  onGetDriveConnection,
  onDisconnectDrive,
  onSaveManualDriveToken,
  onSaveDriveFolder,
  onGetDriveFiles,
  testDriveFileTrigger,
} from "@/actions/drive";

interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export default function DriveConnectionCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [folderId, setFolderId] = useState("");
  const [hasEnvKeys, setHasEnvKeys] = useState(true);

  // Manual token input state
  const [manualToken, setManualToken] = useState("");
  const [showManualInput, setShowManualInput] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("error") === "missing_google_keys";
  });

  // Files list
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [fetchingFiles, setFetchingFiles] = useState(false);

  // Action states
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google_status");
    const err = params.get("error");
    if (googleStatus === "connected") {
      return {
        type: "success",
        text: "Google Drive connected successfully via OAuth!",
      };
    } else if (err) {
      if (err === "missing_google_keys") {
        return {
          type: "error",
          text: "Google OAuth credentials (GOOGLE_CLIENT_ID & SECRET) are not configured in .env yet. You can also paste an Access Token directly below.",
        };
      }
      return {
        type: "error",
        text: `Google OAuth error: ${err}`,
      };
    }
    return null;
  });

  useEffect(() => {
    // Clean up query params if present
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_status") || params.get("error")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    const loadConnection = async () => {
      try {
        const res = await onGetDriveConnection();
        setIsConnected(res.isConnected);
        setGoogleEmail(res.email);
        setHasEnvKeys(res.hasEnvKeys);
        if (res.folderId) {
          setFolderId(res.folderId);
        }
      } catch {
        // ignore
      } finally {
        setInitialLoading(false);
      }
    };

    loadConnection();
  }, []);

  // Fetch live files from Google Drive
  const handleFetchFiles = async () => {
    setFetchingFiles(true);
    setStatus(null);
    try {
      const res = await onGetDriveFiles(folderId || undefined);
      if (res.status === 200) {
        setFiles(res.files);
        if (res.files.length === 0) {
          setStatus({
            type: "success",
            text: "Connected! No files found in the specified folder/Drive.",
          });
        }
      } else {
        setStatus({ type: "error", text: res.error || "Failed to fetch files" });
      }
    } catch {
      setStatus({ type: "error", text: "Error fetching Google Drive files" });
    } finally {
      setFetchingFiles(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Drive?")) return;
    setLoading(true);
    try {
      const res = await onDisconnectDrive();
      if (res.status === 200) {
        setIsConnected(false);
        setGoogleEmail(null);
        setFiles([]);
        setStatus({ type: "success", text: "Google Drive disconnected" });
      } else {
        setStatus({ type: "error", text: res.error || "Failed to disconnect" });
      }
    } catch {
      setStatus({ type: "error", text: "Error disconnecting Drive" });
    } finally {
      setLoading(false);
    }
  };

  // Save manual token
  const handleSaveManualToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setLoading(true);
    setStatus(null);
    try {
      const res = await onSaveManualDriveToken(manualToken, folderId);
      if (res.status === 200) {
        setIsConnected(true);
        setGoogleEmail(res.email || "Connected");
        setShowManualInput(false);
        setManualToken("");
        setStatus({ type: "success", text: res.message });
        handleFetchFiles();
      } else {
        setStatus({ type: "error", text: res.error || "Failed to save token" });
      }
    } catch {
      setStatus({ type: "error", text: "Unexpected error validating token" });
    } finally {
      setLoading(false);
    }
  };

  // Test Trigger
  const handleTestTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (folderId.trim()) {
        await onSaveDriveFolder(folderId);
      }

      const res = await testDriveFileTrigger(folderId);
      if (res.status === 200) {
        setStatus({
          type: "success",
          text: res.message,
        });
      } else {
        setStatus({ type: "error", text: res.error || "Failed to verify Drive trigger" });
      }
    } catch {
      setStatus({ type: "error", text: "An unexpected error occurred while verifying Google Drive trigger" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition">
      <div className="flex items-start gap-5">
        {/* Google Drive Icon */}
        <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20">
          <HardDrive className="w-6 h-6 text-blue-400" />
        </div>

        {/* Info & Action */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Google Drive</h3>
                {initialLoading ? (
                  <span className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse" />
                ) : isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-800/80 text-neutral-400 border border-neutral-700/60">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Trigger workflows automatically when new files are uploaded to Google Drive.
              </p>
              {isConnected && googleEmail && (
                <p className="text-xs text-neutral-300 font-medium mt-1">
                  Account: <span className="text-blue-400">{googleEmail}</span>
                </p>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            >
              {isOpen ? "Close" : "Configure"}
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
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

          {/* Collapsible Drive Configuration Panel */}
          {isOpen && (
            <div className="mt-4 pt-4 border-t border-neutral-800/60 space-y-4">
              {/* Connected Action Buttons / Connect Button */}
              {isConnected ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchFiles}
                    disabled={fetchingFiles}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-xs font-semibold transition"
                  >
                    {fetchingFiles ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    View Drive Files
                  </button>

                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition"
                  >
                    Open Drive <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition ml-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <a
                    href="/api/auth/google"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20"
                  >
                    <HardDrive className="w-4 h-4" />
                    Connect Google Account (OAuth)
                  </a>

                  {!hasEnvKeys && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                      <p className="font-semibold">💡 Google OAuth keys not yet in .env.local</p>
                      <p className="text-neutral-400">
                        Add <code className="text-amber-200">GOOGLE_CLIENT_ID</code> and{" "}
                        <code className="text-amber-200">GOOGLE_CLIENT_SECRET</code> to your .env file, or paste an Access Token directly below.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 inline-flex items-center gap-1 font-medium transition"
                  >
                    <KeyRound className="w-3 h-3" />
                    {showManualInput ? "Hide Direct Token Input" : "Or Enter Google Access Token Manually"}
                  </button>

                  {showManualInput && (
                    <form onSubmit={handleSaveManualToken} className="space-y-2 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
                      <label className="text-xs font-medium text-neutral-300">
                        Google Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="ya29.a0AfH6SM..."
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition"
                      >
                        {loading ? "Validating..." : "Save Token"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Live Files Display (If fetched) */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    Live Files Detected in Google Drive
                  </h4>
                  <div className="divide-y divide-neutral-850 rounded-xl border border-neutral-800/80 bg-neutral-900/50 max-h-48 overflow-y-auto">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 flex items-center justify-between text-xs hover:bg-neutral-800/40 transition"
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-medium text-neutral-200 truncate">{file.name}</span>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:underline shrink-0 flex items-center gap-0.5"
                          >
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger Settings & Test Trigger Form */}
              <form onSubmit={handleTestTrigger} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                    <span>Target Folder ID (Optional — leave empty to watch entire Drive)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j..."
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-neutral-500">
                    If set, workflows will trigger on uploads to this specific folder ID.
                  </p>
                </div>

                {/* Submit / Test Trigger Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing Trigger...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      {isConnected
                        ? "Test Trigger with Live Drive File"
                        : "Test Simulated Trigger"}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
