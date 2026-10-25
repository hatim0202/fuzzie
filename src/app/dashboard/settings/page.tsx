import { redirect } from "next/navigation";
import { onAuthenticateUser } from "@/actions/user";
import SettingsDashboard from "@/components/settings/settings-dashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // 1. Authenticate and retrieve user data from PostgreSQL
  const authUser = await onAuthenticateUser();

  if (authUser.status === 403 || !authUser.user) {
    redirect("/sign-in");
  }

  const user = authUser.user;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Title & Subtitle */}
      <div className="border-b border-neutral-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage your account profile, subscription plan, and integration preferences.
        </p>
      </div>

      {/* Interactive Settings Dashboard */}
      <SettingsDashboard user={user} />
    </div>
  );
}
