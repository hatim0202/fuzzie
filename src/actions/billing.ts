"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Get Current User's Plan & Remaining Credits
export async function onGetUserBilling() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const dbUser = await db.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        tier: true,
        credits: true,
        email: true,
      },
    });

    if (!dbUser) {
      return { status: 404, error: "User record not found" };
    }

    return {
      status: 200,
      tier: dbUser.tier || "Free",
      credits: dbUser.credits,
    };
  } catch (error) {
    console.error("Error fetching user billing info:", error);
    return { status: 500, error: "Failed to fetch billing details" };
  }
}

// 2. Upgrade User Tier & Set Plan Credits
export async function onUpgradeUserTier(tier: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Determine target credits based on chosen tier
    const planCredits =
      tier.toLowerCase() === "unlimited"
        ? 999999
        : tier.toLowerCase() === "pro"
        ? 10000
        : 100;

    const updatedUser = await db.user.upsert({
      where: {
        clerkId: user.id,
      },
      update: {
        tier,
        credits: planCredits,
      },
      create: {
        clerkId: user.id,
        email,
        name,
        profileImage: user.imageUrl,
        tier,
        credits: planCredits,
      },
    });

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");

    return {
      status: 200,
      message: `Successfully updated to ${tier} plan!`,
      tier: updatedUser.tier,
      credits: updatedUser.credits,
    };
  } catch (error) {
    console.error("Error upgrading user plan:", error);
    return { status: 500, error: "Failed to upgrade subscription plan" };
  }
}

// 3. Consume Credits upon Workflow Execution
export async function onConsumeCredits(amount: number = 10) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { credits: true, tier: true },
    });

    if (!dbUser) return { status: 404, error: "User not found" };

    // Unlimited tier has infinite credits
    if (dbUser.tier === "Unlimited") {
      return { status: 200, remainingCredits: "Unlimited" };
    }

    if (dbUser.credits < amount) {
      return {
        status: 402,
        error: "Insufficient credits! Please upgrade your plan in Billing.",
      };
    }

    const updated = await db.user.update({
      where: { clerkId: user.id },
      data: {
        credits: {
          decrement: amount,
        },
      },
    });

    return {
      status: 200,
      remainingCredits: updated.credits,
    };
  } catch (error) {
    console.error("Error consuming credits:", error);
    return { status: 500, error: "Failed to process credit deduction" };
  }
}
