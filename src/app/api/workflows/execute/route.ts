import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { getLatestDriveFile } from "@/lib/google-drive";

// Helper to post to Discord
async function postDiscord(message: string, webhookUrl: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
  return res.ok;
}

// Helper to post to Slack
async function postSlack(message: string, webhookUrl: string) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
  return res.ok;
}

// Helper to post to Notion
async function postNotion(
  title: string,
  content: string,
  databaseId: string,
  accessToken: string
) {
  const formattedDbId = databaseId.replace(/-/g, "");
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: formattedDbId },
      properties: {
        title: [{ text: { content: title || "New Fuzzie Automation Task" } }],
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: content || "Automated record created via Fuzzie" } },
            ],
          },
        },
      ],
    }),
  });
  return res.ok;
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { workflowId, triggerData } = await req.json();

  const encoder = new TextEncoder();

  // Helper to encode a log line as NDJSON
  const encodeLine = (log: string) =>
    encoder.encode(JSON.stringify({ log }) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      const send = (log: string) => {
        controller.enqueue(encodeLine(log));
      };

      try {
        // 1. Fetch user
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

        if (!dbUser) {
          send("❌ Error: User not found");
          controller.close();
          return;
        }

        const executionCost = 10;
        const isUnlimited = dbUser.tier === "Unlimited";

        if (!isUnlimited && dbUser.credits < executionCost) {
          send(`❌ Execution halted: Insufficient credits.`);
          send(`💳 Current Balance: ${dbUser.credits} Credits (Requires ${executionCost}).`);
          send(`👉 Upgrade to Pro or Unlimited in the Billing tab.`);
          controller.enqueue(encodeLine("__DONE__"));
          controller.close();
          return;
        }

        // 2. Fetch workflow
        const workflow = await db.workflow.findUnique({
          where: { id: workflowId, userId: user.id },
        });

        if (!workflow) {
          send("❌ Error: Workflow not found");
          controller.close();
          return;
        }

        const nodes = workflow.nodes ? JSON.parse(workflow.nodes) : [];

        let fileName = triggerData?.fileName || "Design_System_v2.pdf";
        let userEmail = triggerData?.userEmail || user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
        let fileUrl = triggerData?.fileUrl || "https://fuzzie.io";
        let isRealDriveFile = false;

        // Check if user has real Google Drive connected
        if (dbUser.googleAccessToken) {
          try {
            const targetFolder = workflow.googleFolderId || dbUser.googleFolderId || undefined;
            const liveResult = await getLatestDriveFile(dbUser.googleAccessToken, targetFolder);
            if (liveResult.file) {
              fileName = liveResult.file.name;
              fileUrl = liveResult.file.webViewLink || `https://drive.google.com/file/d/${liveResult.file.id}/view`;
              if (dbUser.googleEmail) {
                userEmail = dbUser.googleEmail;
              }
              isRealDriveFile = true;
            }
          } catch (driveErr) {
            console.warn("Could not retrieve live Drive file:", driveErr);
          }
        }

        const replaceVariables = (template: string) =>
          template
            .replace(/{{file_name}}/g, fileName)
            .replace(/{{user_email}}/g, userEmail)
            .replace(/{{file_url}}/g, fileUrl);

        // Effective credentials
        const effectiveDiscordWebhook = workflow.discordWebhookUrl || dbUser.discordWebhookUrl || "";
        const effectiveSlackWebhook = workflow.slackWebhookUrl || dbUser.slackWebhookUrl || "";
        const effectiveNotionToken = workflow.notionAccessToken || dbUser.notionAccessToken || "";
        const effectiveNotionDb = workflow.notionDbId || dbUser.notionDbId || "";

        if (isRealDriveFile) {
          send(`📁 Google Drive: Live connection active (${dbUser.googleEmail})`);
          send(`🚀 Trigger: Real Drive upload detected → '${fileName}'`);
        } else {
          send(`📁 Google Drive: Test mode trigger event for '${fileName}'`);
        }

        // Small delay to make it feel real-time
        await new Promise((r) => setTimeout(r, 400));

        // 3. Loop nodes
        for (const node of nodes) {
          const type = node.data?.type;

          if (type === "Discord") {
            const msg = replaceVariables(
              workflow.discordTemplate || "⚡ New file uploaded: {{file_name}} by {{user_email}}"
            );
            if (!effectiveDiscordWebhook) {
              send(`⚠️ Discord: Skipped — No webhook configured`);
            } else {
              send(`📢 Discord: Sending message to channel...`);
              await new Promise((r) => setTimeout(r, 600));
              const ok = await postDiscord(msg, effectiveDiscordWebhook);
              if (ok) {
                send(`✅ Discord: Message delivered → "${msg}"`);
              } else {
                send(`❌ Discord: Delivery failed`);
              }
            }
            await new Promise((r) => setTimeout(r, 300));
          }

          if (type === "Slack") {
            const msg = replaceVariables(
              workflow.slackTemplate || "🚀 Team update: {{file_name}} uploaded to Drive."
            );
            if (!effectiveSlackWebhook) {
              send(`⚠️ Slack: Skipped — No webhook configured`);
            } else {
              send(`💬 Slack: Sending message to workspace...`);
              await new Promise((r) => setTimeout(r, 600));
              const ok = await postSlack(msg, effectiveSlackWebhook);
              if (ok) {
                send(`✅ Slack: Message delivered → "${msg}"`);
              } else {
                send(`❌ Slack: Delivery failed`);
              }
            }
            await new Promise((r) => setTimeout(r, 300));
          }

          if (type === "Notion") {
            const rawTemplate = workflow.notionTemplate || "File synced: {{file_name}}";
            const content = replaceVariables(rawTemplate);
            const title = `Fuzzie Sync: ${fileName}`;

            if (!effectiveNotionToken || !effectiveNotionDb) {
              send(`⚠️ Notion: Skipped — Missing Token or Database ID`);
            } else {
              send(`📝 Notion: Creating page in database...`);
              await new Promise((r) => setTimeout(r, 600));
              const ok = await postNotion(title, content, effectiveNotionDb, effectiveNotionToken);
              if (ok) {
                send(`✅ Notion: Page created → "${title}"`);
              } else {
                send(`❌ Notion: Failed to create page`);
              }
            }
            await new Promise((r) => setTimeout(r, 300));
          }

          if (type === "Google Drive") {
            send(`📁 Google Drive: Trigger node — monitoring for new file uploads`);
            await new Promise((r) => setTimeout(r, 300));
          }
        }

        // 4. Deduct credits
        if (!isUnlimited) {
          const updatedUser = await db.user.update({
            where: { clerkId: user.id },
            data: { credits: { decrement: executionCost } },
          });
          await new Promise((r) => setTimeout(r, 300));
          send(`💳 Credits: Deducted ${executionCost} → Remaining: ${updatedUser.credits}`);
        } else {
          send(`💳 Credits: Unlimited Tier (0 credits consumed)`);
        }

        await new Promise((r) => setTimeout(r, 300));
        send(`✅ Workflow '${workflow.name}' completed!`);

        // Signal done
        controller.enqueue(encodeLine("__DONE__"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encodeLine(`❌ Fatal error: ${msg}`));
        controller.enqueue(encodeLine("__DONE__"));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
