import { onGetUserBilling } from "@/actions/billing";
import BillingDashboardClient from "@/components/billing/billing-dashboard";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  // Fetch active user subscription and credits from DB
  const billingInfo = await onGetUserBilling();

  const currentTier = billingInfo.status === 200 ? billingInfo.tier : "Free";
  const currentCredits = billingInfo.status === 200 ? (billingInfo.credits ?? 100) : 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="border-b border-neutral-800 pb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight">Billing & Plans</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage your subscription tier, view credit usage, and scale your automations.
        </p>
      </div>

      {/* Interactive Client Billing Component */}
      <BillingDashboardClient
        initialTier={currentTier || "Free"}
        initialCredits={currentCredits}
      />
    </div>
  );
}
