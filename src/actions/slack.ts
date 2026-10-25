"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Send Message to Slack Incoming Webhook
export async function postContentToSlack(content: string, webhookUrl: string) {
  try {
    if (!webhookUrl || !content) {
      return { status: 400, error: "Missing Slack webhook URL or message content" };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: content,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Fuzzie Automation Alert*\n${content}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Triggered at ${new Date().toLocaleTimeString()} via *Fuzzie*`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { status: response.status, error: `Slack error: ${errorText}` };
    }

    return { status: 200, message: "Slack message sent successfully!" };
  } catch (error) {
    console.error("Error sending Slack webhook:", error);
    return { status: 500, error: "Failed to send message to Slack" };
  }
}

// 2. Save Global Slack Webhook in User Profile (Connections Page)
export async function onSaveUserSlackWebhook(webhookUrl: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const updatedUser = await db.user.upsert({
      where: { clerkId: user.id },
      update: { slackWebhookUrl: webhookUrl.trim() },
      create: {
        clerkId: user.id,
        email,
        name,
        profileImage: user.imageUrl,
        slackWebhookUrl: webhookUrl.trim(),
      },
    });

    revalidatePath("/dashboard/connections");
    revalidatePath("/dashboard");

    return {
      status: 200,
      message: "Slack Webhook saved to your account successfully!",
      webhookUrl: updatedUser.slackWebhookUrl,
    };
  } catch (error) {
    console.error("Error saving global Slack webhook:", error);
    return { status: 500, error: "Failed to save Slack webhook" };
  }
}

// 3. Get Global Slack Webhook from User Profile
export async function onGetUserSlackWebhook() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { slackWebhookUrl: true },
    });

    return {
      status: 200,
      webhookUrl: dbUser?.slackWebhookUrl || "",
    };
  } catch (error) {
    console.error("Error getting user Slack webhook:", error);
    return { status: 500, error: "Failed to get Slack webhook" };
  }
}

// 4. Save Slack Template & Webhook URL for a specific Workflow
export async function onSaveSlackTemplate(
  workflowId: string,
  slackTemplate: string,
  slackWebhookUrl?: string
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
        slackTemplate,
        slackWebhookUrl: slackWebhookUrl?.trim() || null,
      },
    });

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    return {
      status: 200,
      message: "Slack settings saved successfully",
      workflow,
    };
  } catch (error) {
    console.error("Error saving Slack template:", error);
    return { status: 500, error: "Failed to save Slack settings" };
  }
}

// 5. Get Slack Template & Effective Webhook URL for a Workflow
export async function onGetSlackTemplate(workflowId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const [workflow, dbUser] = await Promise.all([
      db.workflow.findUnique({
        where: { id: workflowId, userId: user.id },
        select: { slackTemplate: true, slackWebhookUrl: true },
      }),
      db.user.findUnique({
        where: { clerkId: user.id },
        select: { slackWebhookUrl: true },
      }),
    ]);

    const effectiveWebhookUrl = workflow?.slackWebhookUrl || dbUser?.slackWebhookUrl || "";
    const isGlobal = !workflow?.slackWebhookUrl && Boolean(dbUser?.slackWebhookUrl);

    return {
      status: 200,
      slackTemplate: workflow?.slackTemplate || "",
      slackWebhookUrl: effectiveWebhookUrl,
      isGlobalConnected: isGlobal,
    };
  } catch (error) {
    console.error("Error getting Slack template:", error);
    return { status: 500, error: "Failed to get Slack settings" };
  }
}
