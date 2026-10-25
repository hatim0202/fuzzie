import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Workflow, Zap, Layers } from "lucide-react";
import { onAuthenticateUser } from "@/actions/user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // 1. Authenticate and sync user with PostgreSQL
  const authUser = await onAuthenticateUser();

  // 2. If not authenticated, redirect to sign-in
  if (authUser.status === 403 || !authUser.user) {
    redirect("/sign-in");
  }

  const user = authUser.user;

  // 3. Dynamic Monthly Credits calculation based on Tier
  const tier = user.tier || "Free";
  const isUnlimited = tier.toLowerCase() === "unlimited";
  const isPro = tier.toLowerCase() === "pro";

  const maxCredits = isUnlimited
    ? "Unlimited"
    : isPro
    ? "10,000"
    : "100";

  const creditsDisplay = isUnlimited
    ? "Unlimited"
    : `${user.credits?.toLocaleString() || 0} / ${maxCredits}`;

  // 4. Dynamic Connected Apps detection (both account-wide & workflow overrides)
  const isDiscordConnected = Boolean(
    user.discordWebhookUrl?.trim() ||
    user.workflows?.some((w) => Boolean(w.discordWebhookUrl?.trim()))
  );
  const isSlackConnected = Boolean(
    user.slackWebhookUrl?.trim() ||
    user.workflows?.some((w) => Boolean(w.slackWebhookUrl?.trim()))
  );
  const isNotionConnected = Boolean(
    user.notionAccessToken?.trim() ||
    user.workflows?.some((w) => Boolean(w.notionAccessToken?.trim()))
  );
  const isDriveConnected = Boolean(
    user.googleAccessToken?.trim() ||
    user.googleFolderId?.trim() ||
    user.workflows?.some((w) => Boolean(w.googleFolderId?.trim() || w.cronPath?.trim()))
  );

  const connectedAppsList: string[] = [];
  if (isDiscordConnected) connectedAppsList.push("Discord");
  if (isSlackConnected) connectedAppsList.push("Slack");
  if (isNotionConnected) connectedAppsList.push("Notion");
  if (isDriveConnected) connectedAppsList.push("Drive");

  const connectedCount = connectedAppsList.length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section with User's Name */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, {user.name || "Creator"} 
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Monitor your automations, active connections, and credit usage.
          </p>
        </div>

        <Link
          href="/dashboard/workflows"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </Link>
      </div>

      {/* Dynamic Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Workflows Card */}
        <Link
          href="/dashboard/workflows"
          className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700/80 transition space-y-3 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300 transition">Total Workflows</span>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:text-white transition">
              <Workflow className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{user.workflows?.length || 0}</p>
          <p className="text-xs text-neutral-500">Active automated triggers</p>
        </Link>

        {/* Real Credits Remaining Card */}
        <Link
          href="/dashboard/billing"
          className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700/80 transition space-y-3 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300 transition">Monthly Credits</span>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:text-white transition">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{creditsDisplay}</p>
          <p className="text-xs text-neutral-500">Tier: {tier}</p>
        </Link>

        {/* Connected Apps Card */}
        <Link
          href="/dashboard/connections"
          className="p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700/80 transition space-y-3 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300 transition">Connected Apps</span>
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:text-white transition">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{connectedCount}</p>
          <p className="text-xs text-neutral-500">
            {connectedCount === 0
              ? "Discord, Notion, Slack, Drive"
              : connectedAppsList.join(", ")}
          </p>
        </Link>
      </div>
    </div>
  );
}
