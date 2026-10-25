"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

import { revalidatePath } from "next/cache";
import { postContentToDiscord } from "@/actions/discord";
import { postContentToSlack } from "@/actions/slack";
import { postContentToNotion } from "@/actions/notion";
import { getLatestDriveFile } from "@/lib/google-drive";

// 1. Create a new Workflow
export async function onCreateWorkflow(name: string, description: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.create({
      data: {
        userId: user.id,
        name,
        description,
        // Default starting Trigger Node on canvas
        nodes: JSON.stringify([
          {
            id: "1",
            type: "custom",
            position: { x: 250, y: 100 },
            data: {
              title: "Google Drive Trigger",
              description: "Listen for new files in Drive",
              type: "Google Drive",
            },
          },
        ]),
        edges: JSON.stringify([]),
      },
    });

    revalidatePath("/dashboard/workflows");
    return { status: 200, message: "Workflow created successfully", workflow };
  } catch (error) {
    console.error("Error creating workflow:", error);
    return { status: 500, error: "Failed to create workflow" };
  }
}

// 2. Get all Workflows for the current user
export async function onGetWorkflows() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized", workflows: [] };

    const workflows = await db.workflow.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { status: 200, workflows };
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return { status: 500, error: "Failed to fetch workflows", workflows: [] };
  }
}

// 3. Get single Workflow by ID
export async function onGetWorkflow(id: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.findUnique({
      where: { id },
    });

    if (!workflow || workflow.userId !== user.id) {
      return { status: 404, error: "Workflow not found" };
    }

    return { status: 200, workflow };
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return { status: 500, error: "Failed to fetch workflow" };
  }
}

// 4. Save Canvas Nodes & Edges
export async function onSaveWorkflow(id: string, nodes: string, edges: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.update({
      where: { id, userId: user.id },
      data: { nodes, edges },
    });

    return { status: 200, message: "Flow saved successfully", workflow };
  } catch (error) {
    console.error("Error saving flow:", error);
    return { status: 500, error: "Failed to save flow" };
  }
}

// 5. Toggle Workflow Publish Status
export async function onPublishWorkflow(id: string, publish: boolean) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.update({
      where: { id, userId: user.id },
      data: { publish },
    });

    revalidatePath("/dashboard/workflows");
    return { status: 200, message: publish ? "Workflow published!" : "Workflow unpublished!", workflow };
  } catch (error) {
    console.error("Error publishing workflow:", error);
    return { status: 500, error: "Failed to publish workflow" };
  }
}

// 6. Delete Workflow
export async function onDeleteWorkflow(workflowId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    await db.workflow.delete({
      where: {
        id: workflowId,
        userId: user.id,
      },
    });

    revalidatePath("/dashboard/workflows");
    return { status: 200, message: "Workflow deleted successfully" };
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return { status: 500, error: "Failed to delete workflow" };
  }
}

// 7. Execute Workflow Engine with Real API integrations & Credit Consumption
export async function onExecuteWorkflow(
  workflowId: string,
  triggerData: {
    fileName?: string;
    userEmail?: string;
    fileUrl?: string;
  } = {
    fileName: "Design_System_v2.pdf",
    userEmail: "user@fuzzie.io",
    fileUrl: "https://drive.google.com/file/d/123456/view",
  }
) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    // 1. Fetch user & check credits + global connection defaults
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: {
        credits: true,
        tier: true,
        discordWebhookUrl: true,
        slackWebhookUrl: true,
        notionAccessToken: true,
        notionDbId: true,
        googleAccessToken: true,
        googleEmail: true,
        googleFolderId: true,
      },
    });

    if (!dbUser) return { status: 404, error: "User not found" };

    const executionCost = 10;
    const isUnlimited = dbUser.tier === "Unlimited";

    if (!isUnlimited && dbUser.credits < executionCost) {
      return {
        status: 402,
        error: `Insufficient credits (${dbUser.credits} remaining). Please upgrade your plan in Billing!`,
        logs: [
          `❌ Execution halted: Insufficient credits.`,
          `💳 Current Balance: ${dbUser.credits} Credits (Requires ${executionCost} credits).`,
          `👉 Upgrade to Pro or Unlimited in the Billing tab to continue.`,
        ],
      };
    }

    const workflow = await db.workflow.findUnique({
      where: { id: workflowId, userId: user.id },
    });

    if (!workflow) return { status: 404, error: "Workflow not found" };

    const nodes = workflow.nodes ? JSON.parse(workflow.nodes) : [];
    const executionLogs: string[] = [];

    let activeFileName = triggerData.fileName || "Design_System_v2.pdf";
    let activeUserEmail = triggerData.userEmail || user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
    let activeFileUrl = triggerData.fileUrl || "https://fuzzie.io";

    // Attempt real Google Drive fetch if connected
    if (dbUser.googleAccessToken) {
      try {
        const targetFolder = workflow.googleFolderId || dbUser.googleFolderId || undefined;
        const liveResult = await getLatestDriveFile(dbUser.googleAccessToken, targetFolder);
        if (liveResult.file) {
          activeFileName = liveResult.file.name;
          activeFileUrl = liveResult.file.webViewLink || `https://drive.google.com/file/d/${liveResult.file.id}/view`;
          if (dbUser.googleEmail) {
            activeUserEmail = dbUser.googleEmail;
          }
          executionLogs.push(`📁 Google Drive: Live connection active (${dbUser.googleEmail})`);
          executionLogs.push(`🚀 Trigger: Live Drive upload detected → '${activeFileName}'`);
        } else {
          executionLogs.push(`🚀 Trigger: Google Drive event received for '${activeFileName}'`);
        }
      } catch {
        executionLogs.push(`🚀 Trigger: Google Drive event received for '${activeFileName}'`);
      }
    } else {
      executionLogs.push(`📁 Google Drive: Test mode trigger event for '${activeFileName}'`);
      executionLogs.push(`🚀 Trigger: Google Drive event received for '${activeFileName}'`);
    }

    // Helper: Replace template variables with real data
    const replaceVariables = (template: string) => {
      return template
        .replace(/{{file_name}}/g, activeFileName)
        .replace(/{{user_email}}/g, activeUserEmail)
        .replace(/{{file_url}}/g, activeFileUrl);
    };

    // Determine effective credentials (Workflow specific OR Global User defaults)
    const effectiveDiscordWebhook = workflow.discordWebhookUrl || dbUser.discordWebhookUrl || "";
    const effectiveSlackWebhook = workflow.slackWebhookUrl || dbUser.slackWebhookUrl || "";
    const effectiveNotionToken = workflow.notionAccessToken || dbUser.notionAccessToken || "";
    const effectiveNotionDb = workflow.notionDbId || dbUser.notionDbId || "";

    // Loop through each node on the canvas and execute real action
    for (const node of nodes) {
      const type = node.data?.type;

      // DISCORD NODE
      if (type === "Discord") {
        const rawTemplate = workflow.discordTemplate || "⚡ New file uploaded: {{file_name}} by {{user_email}}";
        const message = replaceVariables(rawTemplate);

        if (!effectiveDiscordWebhook) {
          executionLogs.push(`⚠️ Discord: Skipped - No webhook URL configured (Add in Connections or Node Settings)`);
        } else {
          try {
            const res = await postContentToDiscord(message, effectiveDiscordWebhook);
            if (res.status === 200) {
              executionLogs.push(`📢 Discord: Message delivered successfully -> "${message}"`);
            } else {
              executionLogs.push(`❌ Discord error: ${res.error}`);
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            executionLogs.push(`❌ Discord delivery failed: ${errMsg}`);
          }
        }
      }

      // SLACK NODE
      if (type === "Slack") {
        const rawTemplate = workflow.slackTemplate || "🚀 Team update: {{file_name}} uploaded to Drive.";
        const message = replaceVariables(rawTemplate);

        if (!effectiveSlackWebhook) {
          executionLogs.push(`⚠️ Slack: Skipped - No webhook URL configured (Add in Connections or Node Settings)`);
        } else {
          try {
            const res = await postContentToSlack(message, effectiveSlackWebhook);
            if (res.status === 200) {
              executionLogs.push(`💬 Slack: Message delivered successfully -> "${message}"`);
            } else {
              executionLogs.push(`❌ Slack error: ${res.error}`);
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            executionLogs.push(`❌ Slack delivery failed: ${errMsg}`);
          }
        }
      }

      // NOTION NODE
      if (type === "Notion") {
        const rawTemplate = workflow.notionTemplate || "File synced: {{file_name}}";
        const message = replaceVariables(rawTemplate);
        const title = `Fuzzie Sync: ${triggerData.fileName}`;

        if (!effectiveNotionToken || !effectiveNotionDb) {
          executionLogs.push(`⚠️ Notion: Skipped - Missing Notion Token or Database ID`);
        } else {
          try {
            const res = await postContentToNotion(title, message, effectiveNotionDb, effectiveNotionToken);
            if (res.status === 200) {
              executionLogs.push(`📝 Notion: Page created successfully in Database -> "${title}"`);
            } else {
              executionLogs.push(`❌ Notion error: ${res.error}`);
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            executionLogs.push(`❌ Notion write failed: ${errMsg}`);
          }
        }
      }
    }

    // Deduct credits if not unlimited
    if (!isUnlimited) {
      const updatedUser = await db.user.update({
        where: { clerkId: user.id },
        data: { credits: { decrement: executionCost } },
      });
      executionLogs.push(`💳 Credits: Deducted ${executionCost} credits. (Remaining Balance: ${updatedUser.credits})`);
    } else {
      executionLogs.push(`💳 Credits: Unlimited Tier (0 credits consumed).`);
    }

    executionLogs.push(`✅ Workflow '${workflow.name}' execution completed!`);

    return {
      status: 200,
      message: "Workflow executed successfully",
      logs: executionLogs,
    };
  } catch (error) {
    console.error("Execution engine error:", error);
    return { status: 500, error: "Failed to execute workflow" };
  }
}
