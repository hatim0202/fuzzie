"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { onUpgradeUserTier } from "@/actions/billing";

type Props = {
  initialTier: string;
  initialCredits: number;
};

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Ideal for testing workflows and personal automations.",
    credits: 100,
    features: [
      "100 Free Execution Credits",
      "Up to 3 Active Workflows",
      "Standard Discord & Slack Nodes",
      "Community Support",
    ],
    popular: false,
    cta: "Current Plan",
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "Built for power users and growing automation pipelines.",
    credits: 10000,
    features: [
      "10,000 Monthly Credits",
      "Unlimited Visual Workflows",
      "All Integrations (Notion, Google Drive)",
      "Faster Pipeline Execution",
      "Priority Email Support",
    ],
    popular: true,
    cta: "Upgrade to Pro",
  },
  {
    name: "Unlimited",
    price: "$99",
    period: "per month",
    description: "Enterprise grade automation for scale and heavy workloads.",
    credits: 999999,
    features: [
      "Unlimited Execution Credits",
      "Unlimited Workflows & Runs",
      "Custom Webhooks & Realtime Sync",
      "24/7 Dedicated Support",
      "99.9% Uptime SLA",
    ],
    popular: false,
    cta: "Upgrade to Unlimited",
  },
];

export default function BillingDashboardClient({
  initialTier,
  initialCredits,
}: Props) {
  const [currentTier, setCurrentTier] = useState(initialTier);
  const [credits, setCredits] = useState(initialCredits);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpgrade = async (planName: string) => {
    if (currentTier.toLowerCase() === planName.toLowerCase()) return;

    setLoadingTier(planName);
    setMessage(null);

    try {
      const res = await onUpgradeUserTier(planName);
      if (res.status === 200) {
        setCurrentTier(res.tier || planName);
        if (res.credits !== undefined) setCredits(res.credits);
        setMessage(`🎉 Plan updated to ${planName}! Credits set to ${res.credits !== undefined ? res.credits.toLocaleString() : planName}.`);
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setLoadingTier(null);
    }
  };

  const isUnlimited = currentTier.toLowerCase() === "unlimited";
  const maxCredits = isUnlimited ? 999999 : currentTier.toLowerCase() === "pro" ? 10000 : 100;
  const creditPercent = isUnlimited ? 100 : Math.min(Math.round((credits / maxCredits) * 100), 100);

  return (
    <div className="space-y-10">
      {/* 1. Account Usage & Active Plan Summary Card */}
      <div className="p-8 rounded-3xl bg-neutral-950/80 border border-neutral-800/80 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Current Subscription
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {currentTier} Plan
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isUnlimited ? "Unlimited Credits" : `${credits.toLocaleString()} Credits Available`}
            </h2>
            <p className="text-xs text-neutral-400">
              Credits reset every billing cycle. Each workflow run consumes credits based on connected nodes.
            </p>
          </div>

          {/* Quick Credit Meter */}
          <div className="w-full md:w-72 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Credit Balance</span>
              <span className="font-bold text-white">
                {isUnlimited ? "∞ Infinite" : `${credits} / ${maxCredits}`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {message && (
          <div className="mt-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* 2. Pricing Plans Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold text-white">Choose the Right Plan for You</h3>
          <p className="text-xs text-neutral-400">
            Scale your workflow automation with transparent pricing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {pricingPlans.map((plan) => {
            const isCurrent = currentTier.toLowerCase() === plan.name.toLowerCase();
            const isLoading = loadingTier === plan.name;

            return (
              <div
                key={plan.name}
                className={`p-7 rounded-3xl flex flex-col justify-between relative transition-all duration-200 ${
                  plan.popular
                    ? "bg-neutral-900/90 border-2 border-indigo-500/50 shadow-2xl shadow-indigo-500/10"
                    : "bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <h4 className="font-bold text-white text-lg">{plan.name}</h4>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-neutral-400">/{plan.period}</span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2 border-t border-neutral-850">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs text-neutral-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upgrade Button */}
                <div className="pt-8">
                  <button
                    onClick={() => handleUpgrade(plan.name)}
                    disabled={isCurrent || isLoading}
                    className={`w-full py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-neutral-900 text-neutral-400 border border-neutral-800 cursor-default"
                        : plan.popular
                        ? "bg-white text-black hover:bg-neutral-200 shadow-xl"
                        : "bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Active Plan"
                    ) : (
                      <>
                        <span>{plan.cta}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
