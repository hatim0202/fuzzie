"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Send Message to Discord Webhook
export async function postContentToDiscord(content: string, webhookUrl: string) {
  try {
    if (!webhookUrl || !content) {
      return { status: 400, error: "Missing webhook URL or content" };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        embeds: [
          {
            title: "Fuzzie Automation Triggered",
            description: content,
            color: 0x6366f1, // Indigo color
            timestamp: new Date().toISOString(),
            footer: {
              text: "Automated via Fuzzie",
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { status: response.status, error: `Discord error: ${errorText}` };
    }

    return { status: 200, message: "Discord message sent successfully!" };
  } catch (error) {
    console.error("Error sending Discord webhook:", error);
    return { status: 500, error: "Failed to send message to Discord" };
  }
}

// 2. Save Global Discord Webhook in User Profile (Connections Page)
export async function onSaveUserDiscordWebhook(webhookUrl: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const updatedUser = await db.user.upsert({
      where: { clerkId: user.id },
      update: { discordWebhookUrl: webhookUrl.trim() },
      create: {
        clerkId: user.id,
        email,
        name,
        profileImage: user.imageUrl,
        discordWebhookUrl: webhookUrl.trim(),
      },
    });

    revalidatePath("/dashboard/connections");
    revalidatePath("/dashboard");

    return {
      status: 200,
      message: "Discord Webhook saved to your account successfully!",
      webhookUrl: updatedUser.discordWebhookUrl,
    };
  } catch (error) {
    console.error("Error saving global Discord webhook:", error);
    return { status: 500, error: "Failed to save Discord webhook" };
  }
}

// 3. Get Global Discord Webhook from User Profile
export async function onGetUserDiscordWebhook() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { discordWebhookUrl: true },
    });

    return {
      status: 200,
      webhookUrl: dbUser?.discordWebhookUrl || "",
    };
  } catch (error) {
    console.error("Error getting user Discord webhook:", error);
    return { status: 500, error: "Failed to get Discord webhook" };
  }
}

// 4. Save Discord Template & Webhook URL for a specific Workflow
export async function onSaveDiscordTemplate(
  workflowId: string,
  discordTemplate: string,
  discordWebhookUrl?: string
) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.update({
      where: {
        id: workflowId,
        userId: user.id,
      },
      data: {
        discordTemplate,
        discordWebhookUrl: discordWebhookUrl?.trim() || null,
      },
    });

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    return {
      status: 200,
      message: "Discord settings saved successfully",
      workflow,
    };
  } catch (error) {
    console.error("Error saving Discord template:", error);
    return { status: 500, error: "Failed to save Discord settings" };
  }
}

// 5. Get Discord Template & Effective Webhook URL for a Workflow
export async function onGetDiscordTemplate(workflowId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const [workflow, dbUser] = await Promise.all([
      db.workflow.findUnique({
        where: { id: workflowId, userId: user.id },
        select: { discordTemplate: true, discordWebhookUrl: true },
      }),
      db.user.findUnique({
        where: { clerkId: user.id },
        select: { discordWebhookUrl: true },
      }),
    ]);

    const effectiveWebhookUrl = workflow?.discordWebhookUrl || dbUser?.discordWebhookUrl || "";
    const isGlobal = !workflow?.discordWebhookUrl && Boolean(dbUser?.discordWebhookUrl);

    return {
      status: 200,
      discordTemplate: workflow?.discordTemplate || "",
      discordWebhookUrl: effectiveWebhookUrl,
      isGlobalConnected: isGlobal,
    };
  } catch (error) {
    console.error("Error getting Discord template:", error);
    return { status: 500, error: "Failed to get Discord settings" };
  }
}
