"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import {
  X,
  Save,
  Loader2,
  Check,
  CheckCircle2,
  MessageSquare,
  Hash,
  FileText,
  HardDrive,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  onSaveDiscordTemplate,
  onGetDiscordTemplate,
} from "@/actions/discord";
import {
  onSaveSlackTemplate,
  onGetSlackTemplate,
} from "@/actions/slack";
import {
  onSaveNotionConfig,
  onGetNotionConfig,
} from "@/actions/notion";
import {
  onSaveDriveConfig,
  onGetDriveConfig,
  onGetDriveConnection,
  onGetDriveFiles,
} from "@/actions/drive";
import { ExternalLink, RefreshCw } from "lucide-react";

type Props = {
  node: Node | null;
  workflowId: string;
  onClose: () => void;
  onDeleteNode?: (nodeId: string) => void;
};

export default function NodeConfigDrawer({
  node,
  workflowId,
  onClose,
  onDeleteNode,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form States
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [showEditDiscordUrl, setShowEditDiscordUrl] = useState(false);
  const [discordTemplate, setDiscordTemplate] = useState("");

  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [showEditSlackUrl, setShowEditSlackUrl] = useState(false);
  const [slackTemplate, setSlackTemplate] = useState("");

  const [notionToken, setNotionToken] = useState("");
  const [notionDbId, setNotionDbId] = useState("");
  const [showEditNotion, setShowEditNotion] = useState(false);
  const [notionTemplate, setNotionTemplate] = useState("");

  const [driveFolderId, setDriveFolderId] = useState("");
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; webViewLink?: string }[]>([]);
  const [fetchingDriveFiles, setFetchingDriveFiles] = useState(false);

  const nodeType = (node?.data?.type as string) || "";

  // Fetch initial templates from DB when node opens
  useEffect(() => {
    if (!node || !workflowId) return;

    const fetchConfig = async () => {
      setLoading(true);
      setShowEditDiscordUrl(false);
      setShowEditSlackUrl(false);
      setShowEditNotion(false);

      try {
        if (nodeType === "Discord") {
          const res = await onGetDiscordTemplate(workflowId);
          if (res.status === 200) {
            setDiscordTemplate(res.discordTemplate || "");
            setDiscordWebhookUrl(res.discordWebhookUrl || "");
          }
        } else if (nodeType === "Slack") {
          const res = await onGetSlackTemplate(workflowId);
          if (res.status === 200) {
            setSlackTemplate(res.slackTemplate || "");
            setSlackWebhookUrl(res.slackWebhookUrl || "");
          }
        } else if (nodeType === "Notion") {
          const res = await onGetNotionConfig(workflowId);
          if (res.status === 200) {
            setNotionToken(res.notionAccessToken || "");
            setNotionDbId(res.notionDbId || "");
            setNotionTemplate(res.notionTemplate || "");
          }
        } else if (nodeType === "Google Drive") {
          const [cfg, conn] = await Promise.all([
            onGetDriveConfig(workflowId),
            onGetDriveConnection(),
          ]);
          if (cfg.status === 200) {
            setDriveFolderId(cfg.folderId || "");
          }
          setDriveConnected(conn.isConnected);
          setDriveEmail(conn.email);
        }
      } catch (err) {
        console.error("Failed to load node config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [node, workflowId, nodeType]);

  const handleFetchFiles = async () => {
    setFetchingDriveFiles(true);
    try {
      const res = await onGetDriveFiles(driveFolderId || undefined);
      if (res.status === 200) {
        setDriveFiles(res.files);
      }
    } catch {
      // ignore
    } finally {
      setFetchingDriveFiles(false);
    }
  };

  if (!node) return null;

  // Handle Save based on Node Type
  const handleSave = async () => {
    setSaving(true);
    try {
      if (nodeType === "Discord") {
        await onSaveDiscordTemplate(workflowId, discordTemplate, discordWebhookUrl);
        setShowEditDiscordUrl(false);
      } else if (nodeType === "Slack") {
        await onSaveSlackTemplate(workflowId, slackTemplate, slackWebhookUrl);
        setShowEditSlackUrl(false);
      } else if (nodeType === "Notion") {
        await onSaveNotionConfig(workflowId, notionToken, notionDbId, notionTemplate);
        setShowEditNotion(false);
      } else if (nodeType === "Google Drive") {
        await onSaveDriveConfig(workflowId, driveFolderId);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-4 top-20 bottom-4 w-96 z-20 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
            {nodeType === "Discord" && <MessageSquare className="w-5 h-5 text-indigo-400" />}
            {nodeType === "Slack" && <Hash className="w-5 h-5 text-emerald-400" />}
            {nodeType === "Notion" && <FileText className="w-5 h-5 text-amber-400" />}
            {nodeType === "Google Drive" && <HardDrive className="w-5 h-5 text-blue-400" />}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {(node.data?.title as string) || "Node Settings"}
            </h3>
            <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-medium">
              {nodeType} Configuration
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onDeleteNode && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Are you sure you want to delete this node?")) {
                  onDeleteNode(node.id);
                  onClose();
                }
              }}
              title="Delete Node"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 overflow-y-auto space-y-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
            <p className="text-xs">Loading configuration...</p>
          </div>
        ) : (
          <>
            {/* Dynamic Template Variables Banner */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Available Trigger Variables</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Use these dynamic tags inside your template messages:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <code className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-indigo-300">
                  {"{{file_name}}"}
                </code>
                <code className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-emerald-300">
                  {"{{user_email}}"}
                </code>
                <code className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-amber-300">
                  {"{{file_url}}"}
                </code>
              </div>
            </div>

            {/* 1. DISCORD NODE FORM */}
            {nodeType === "Discord" && (
              <div className="space-y-3.5">
                {/* Check if webhook exists & not in edit mode */}
                {discordWebhookUrl && !showEditDiscordUrl ? (
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Discord Webhook Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEditDiscordUrl(true)}
                        className="text-[11px] text-indigo-400 hover:underline font-medium"
                      >
                        Update URL
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-850">
                      {discordWebhookUrl.length > 40
                        ? `${discordWebhookUrl.slice(0, 30)}...${discordWebhookUrl.slice(-8)}`
                        : discordWebhookUrl}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-neutral-300">
                        Discord Webhook URL
                      </label>
                      {discordWebhookUrl && (
                        <button
                          type="button"
                          onClick={() => setShowEditDiscordUrl(false)}
                          className="text-[11px] text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Discord Message Template
                  </label>
                  <textarea
                    rows={4}
                    placeholder="E.g. 📁 New file uploaded: {{file_name}} by {{user_email}}"
                    value={discordTemplate}
                    onChange={(e) => setDiscordTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>
              </div>
            )}

            {/* 2. SLACK NODE FORM */}
            {nodeType === "Slack" && (
              <div className="space-y-3.5">
                {/* Check if slack webhook exists & not in edit mode */}
                {slackWebhookUrl && !showEditSlackUrl ? (
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Slack Webhook Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEditSlackUrl(true)}
                        className="text-[11px] text-emerald-400 hover:underline font-medium"
                      >
                        Update URL
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-850">
                      {slackWebhookUrl.length > 40
                        ? `${slackWebhookUrl.slice(0, 30)}...${slackWebhookUrl.slice(-8)}`
                        : slackWebhookUrl}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-neutral-300">
                        Slack Incoming Webhook URL
                      </label>
                      {slackWebhookUrl && (
                        <button
                          type="button"
                          onClick={() => setShowEditSlackUrl(false)}
                          className="text-[11px] text-neutral-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Slack Message Template
                  </label>
                  <textarea
                    rows={4}
                    placeholder="E.g. 🚀 Team update: {{file_name}} is ready!"
                    value={slackTemplate}
                    onChange={(e) => setSlackTemplate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3. NOTION NODE FORM */}
            {nodeType === "Notion" && (
              <div className="space-y-3.5">
                {notionToken && notionDbId && !showEditNotion ? (
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Notion Connected
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEditNotion(true)}
                        className="text-[11px] text-amber-400 hover:underline font-medium"
                      >
                        Update Credentials
                      </button>
                    </div>
                    <div className="space-y-1 text-[11px] font-mono bg-neutral-900 p-2 rounded border border-neutral-850">
                      <p className="text-neutral-400 truncate">
                        <span className="text-neutral-500">Token:</span> secret_••••••••••••{notionToken.slice(-4)}
                      </p>
                      <p className="text-neutral-400 truncate">
                        <span className="text-neutral-500">DB ID:</span> {notionDbId.slice(0, 8)}...{notionDbId.slice(-4)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-neutral-300">
                          Notion Integration Token
                        </label>
                        {notionToken && (
                          <button
                            type="button"
                            onClick={() => setShowEditNotion(false)}
                            className="text-[11px] text-neutral-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder="secret_xxxxxxxx..."
                        value={notionToken}
                        onChange={(e) => setNotionToken(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-300">
                        Notion Database ID
                      </label>
                      <input
                        type="text"
                        placeholder="Database ID (32 chars)..."
                        value={notionDbId}
                        onChange={(e) => setNotionDbId(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">
                    Notion Content Template
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Details: {{file_name}} synced."
                    value={notionTemplate}
                    onChange={(e) => setNotionTemplate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition resize-none"
                  />
                </div>
              </div>
            )}

            {/* 4. GOOGLE DRIVE NODE */}
            {nodeType === "Google Drive" && (
              <div className="space-y-4">
                {/* Connection Status Banner */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      Google Drive Trigger
                    </span>
                    {driveConnected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-800 text-neutral-400 border border-neutral-700">
                        Simulated Mode
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {driveConnected
                      ? `Connected to ${driveEmail || "Google Account"}. Triggers workflow on new uploads.`
                      : "Using simulated file events. Connect your Google account in Connections tab for live events."}
                  </p>
                  {!driveConnected && (
                    <a
                      href="/dashboard/connections"
                      className="text-[11px] text-blue-400 hover:underline inline-flex items-center gap-1 font-medium pt-1"
                    >
                      Connect in Connections page <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Folder ID Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                    <span>Watch Folder ID</span>
                    <span className="text-[10px] text-neutral-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j..."
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Leave blank to trigger on files uploaded to root Drive.
                  </p>
                </div>

                {/* Live Files Preview */}
                {driveConnected && (
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFetchFiles}
                      disabled={fetchingDriveFiles}
                      className="w-full py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      {fetchingDriveFiles ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          Fetching Drive Files...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          Preview Recent Files from Drive
                        </>
                      )}
                    </button>

                    {driveFiles.length > 0 && (
                      <div className="divide-y divide-neutral-850 rounded-xl border border-neutral-800 bg-neutral-950 max-h-36 overflow-y-auto">
                        {driveFiles.map((f) => (
                          <div key={f.id} className="p-2 flex items-center justify-between text-[11px]">
                            <span className="text-neutral-300 truncate max-w-[180px]">{f.name}</span>
                            {f.webViewLink && (
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline shrink-0 text-[10px]"
                              >
                                View
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Save Action */}
      <div className="p-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center gap-2">
        {onDeleteNode && (
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this node?")) {
                onDeleteNode(node.id);
                onClose();
              }
            }}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center transition"
            title="Delete this node from flow"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition shadow-lg disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving Settings...
            </>
          ) : saved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Saved to Workflow!
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Node Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
