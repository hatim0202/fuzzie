"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import {
  User,
  ShieldCheck,
  Copy,
  Check,
  Calendar,
  Zap,
  Layers,
  ArrowUpRight,
  HardDrive,
  MessageSquare,
  Hash,
  FileText,
  LogOut,
  Save,
  Loader2,
  Sparkles,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { onUpdateUserProfile } from "@/actions/user";

type UserData = {
  id: string;
  clerkId: string;
  name: string | null;
  email: string;
  profileImage: string | null;
  tier: string | null;
  credits: number;
  createdAt: Date | string;
  discordWebhookUrl: string | null;
  slackWebhookUrl: string | null;
  notionAccessToken: string | null;
  notionDbId: string | null;
  googleAccessToken: string | null;
  googleEmail: string | null;
  googleFolderId: string | null;
};

export default function SettingsDashboard({ user }: { user: UserData }) {
  const [name, setName] = useState(user.name || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preference toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoSaveLogs, setAutoSaveLogs] = useState(true);

  const isUnlimited = (user.tier || "Free").toLowerCase() === "unlimited";
  const maxCredits = isUnlimited
    ? "Unlimited"
    : (user.tier || "Free").toLowerCase() === "pro"
    ? "10,000"
    : "100";

  const numMax = isUnlimited ? 999999 : (user.tier || "Free").toLowerCase() === "pro" ? 10000 : 100;
  const creditPercent = isUnlimited ? 100 : Math.min(Math.round((user.credits / numMax) * 100), 100);

  // Formatted join date
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.clerkId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await onUpdateUserProfile(name);
      if (res.status === 200) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        setError(res.error || "Failed to update profile");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const connections = [
    {
      name: "Discord",
      icon: MessageSquare,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      connected: Boolean(user.discordWebhookUrl?.trim()),
      detail: user.discordWebhookUrl ? "Webhook Connected" : "Not configured",
    },
    {
      name: "Slack",
      icon: Hash,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      connected: Boolean(user.slackWebhookUrl?.trim()),
      detail: user.slackWebhookUrl ? "Webhook Connected" : "Not configured",
    },
    {
      name: "Notion",
      icon: FileText,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      connected: Boolean(user.notionAccessToken?.trim()),
      detail: user.notionAccessToken ? "API Key Connected" : "Not configured",
    },
    {
      name: "Google Drive",
      icon: HardDrive,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      connected: Boolean(user.googleAccessToken?.trim() || user.googleFolderId?.trim()),
      detail: user.googleEmail ? user.googleEmail : user.googleAccessToken ? "OAuth Connected" : "Not configured",
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. User Profile Details Card */}
      <div className="p-8 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 backdrop-blur-xl space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-neutral-800/80 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-neutral-700/60 bg-neutral-900 flex items-center justify-center shrink-0 shadow-inner">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name || "User"}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-neutral-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {user.name || "Fuzzie Creator"}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  Authenticated
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900/60 px-3.5 py-2 rounded-xl border border-neutral-800">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>Member since {memberSince}</span>
          </div>
        </div>

        {/* Profile Editing Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Display Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition"
                  required
                />
              </div>
            </div>

            {/* Email (Read-only Clerk email) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Email Address</label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900/40 border border-neutral-800/60 text-xs text-neutral-400 cursor-not-allowed"
                />
                <span className="absolute right-3 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* Account ID / Clerk UID */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-semibold text-neutral-300">Account ID (Clerk Reference)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={user.clerkId}
                readOnly
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900/40 border border-neutral-800/60 font-mono text-xs text-neutral-400 select-all"
              />
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition flex items-center gap-1.5 shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Message Banner */}
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Profile name updated successfully!</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving || name.trim() === user.name}
              className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Subscription & Credit Quotas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Plan Card */}
        <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                Active Subscription
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {user.tier || "Free"} Plan
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">
              {isUnlimited ? "Unlimited Automation Credits" : `${user.credits.toLocaleString()} Credits Available`}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Automations consume credits when executing node actions. Upgrades take effect immediately.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-neutral-400">Monthly Usage</span>
              <span className="text-white">
                {isUnlimited ? "Unlimited" : `${user.credits.toLocaleString()} / ${maxCredits}`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${creditPercent}%` }}
              />
            </div>

            <Link
              href="/dashboard/billing"
              className="mt-2 w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
            >
              <span>Manage Plan in Billing</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Connected Services Quick Glance */}
        <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Connected Integrations
              </span>
              <span className="text-xs text-neutral-500">
                {connections.filter((c) => c.connected).length} of 4 Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {connections.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.name}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-850 flex items-center gap-2.5"
                  >
                    <div className={`p-2 rounded-xl border ${c.color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">{c.name}</p>
                      <p className={`text-[10px] font-medium truncate ${c.connected ? "text-emerald-400" : "text-neutral-500"}`}>
                        {c.connected ? "Connected" : "Inactive"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Link
            href="/dashboard/connections"
            className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition mt-2"
          >
            <span>Manage All Connections</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 3. Studio Preferences & Danger Zone */}
      <div className="p-6 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 space-y-6 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider text-neutral-400">
          Preferences & Session
        </h3>

        <div className="divide-y divide-neutral-850">
          {/* Theme setting */}
          <div className="py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Interface Appearance
              </p>
              <p className="text-xs text-neutral-400">
                Fuzzie Studio is tuned for high-contrast dark mode to reduce eye strain during workflow building.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300">
              Midnight Dark
            </span>
          </div>

          {/* Workflow notification preference */}
          <div className="py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                Execution Alerts
              </p>
              <p className="text-xs text-neutral-400">
                Receive notifications when workflow execution encounters an error.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`w-11 h-6 rounded-full transition relative p-0.5 ${
                emailAlerts ? "bg-indigo-600" : "bg-neutral-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  emailAlerts ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Streaming Log preservation */}
          <div className="py-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Detailed Execution Telemetry
              </p>
              <p className="text-xs text-neutral-400">
                Retain full step-by-step logs for node-level debugging.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoSaveLogs(!autoSaveLogs)}
              className={`w-11 h-6 rounded-full transition relative p-0.5 ${
                autoSaveLogs ? "bg-indigo-600" : "bg-neutral-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoSaveLogs ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Sign Out */}
          <div className="pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-rose-400 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </p>
              <p className="text-xs text-neutral-400">
                End your active authentication session on this device.
              </p>
            </div>
            <SignOutButton>
              <button className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold transition">
                Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
