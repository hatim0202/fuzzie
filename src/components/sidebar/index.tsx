"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Workflow, 
  Settings, 
  Layers, 
  CreditCard, 
  Zap 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { onGetUserBilling } from "@/actions/billing";

const menuOptions = [
  { name: "Dashboard", Component: LayoutDashboard, href: "/dashboard" },
  { name: "Workflows", Component: Workflow, href: "/dashboard/workflows" },
  { name: "Connections", Component: Layers, href: "/dashboard/connections" },
  { name: "Billing", Component: CreditCard, href: "/dashboard/billing" },
  { name: "Settings", Component: Settings, href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [billing, setBilling] = useState<{ credits: number; tier: string } | null>(null);

  useEffect(() => {
    onGetUserBilling().then((res) => {
      if (res.status === 200) {
        setBilling({ credits: res.credits ?? 100, tier: res.tier || "Free" });
      }
    });
  }, [pathname]);

  const isUnlimited = (billing?.tier || "").toLowerCase() === "unlimited";
  const maxCredits = isUnlimited
    ? "Unlimited"
    : (billing?.tier || "").toLowerCase() === "pro"
    ? "10,000"
    : "100";

  const creditsDisplay = billing
    ? isUnlimited
      ? "Unlimited"
      : `${billing.credits.toLocaleString()} / ${maxCredits}`
    : "100 / 100";

  return (
    <aside className="w-64 border-r border-neutral-800/80 bg-neutral-950/95 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-neutral-800/60 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white">
          <Zap className="w-5 h-5 fill-white" />
        </div>
        <div>
          <h2 className="font-bold text-white text-base leading-none">Fuzzie</h2>
          <span className="text-xs text-neutral-500">Automation Studio</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuOptions.map((menu) => {
          const Icon = menu.Component;
          const isActive = pathname === menu.href;

          return (
            <Link
              key={menu.name}
              href={menu.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150",
                isActive
                  ? "bg-neutral-800 text-white shadow-sm border border-neutral-700/50"
                  : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900/60"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-neutral-400")} />
              <span>{menu.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile / Status Section */}
      <div className="p-4 border-t border-neutral-800/60 space-y-3">
        <Link
          href="/dashboard/billing"
          className="p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900/90 border border-neutral-800/80 text-xs text-neutral-400 flex items-center justify-between transition group"
        >
          <span className="group-hover:text-neutral-300 transition">Credits Remaining</span>
          <span className="font-semibold text-white">{creditsDisplay}</span>
        </Link>

        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-xs text-neutral-400">Account</span>
          <UserButton />
        </div>
      </div>
    </aside>
  );
}
