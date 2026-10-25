import DiscordConnectionCard from "@/components/connections/discord-connection";
import SlackConnectionCard from "@/components/connections/slack-connection";
import NotionConnectionCard from "@/components/connections/notion-connection";
import DriveConnectionCard from "@/components/connections/drive-connection";

export default function ConnectionsPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-neutral-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Connections</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Connect third-party apps to power your workflow automations.
        </p>
      </div>

      {/* Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* 1. Interactive Discord Webhook Card */}
        <DiscordConnectionCard />

        {/* 2. Interactive Slack Webhook Card */}
        <SlackConnectionCard />

        {/* 3. Interactive Notion API Card */}
        <NotionConnectionCard />

        {/* 4. Interactive Google Drive Trigger Card */}
        <DriveConnectionCard />
      </div>
    </div>
  );
}
