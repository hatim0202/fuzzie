"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// 1. Create a new Page/Item in a Notion Database
export async function postContentToNotion(
  title: string,
  content: string,
  databaseId: string,
  accessToken: string
) {
  try {
    if (!accessToken || !databaseId) {
      return { status: 400, error: "Missing Notion Access Token or Database ID" };
    }

    // Format Database ID (remove dashes if user entered standard uuid)
    const formattedDbId = databaseId.replace(/-/g, "");

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: {
          database_id: formattedDbId,
        },
        properties: {
          // Notion default database title property
          title: [
            {
              text: {
                content: title || "New Fuzzie Automation Task",
              },
            },
          ],
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: content || "Automated record created via Fuzzie",
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      return {
        status: response.status,
        error: errorJson.message || "Failed to create record in Notion",
      };
    }

    const data = await response.json();
    return {
      status: 200,
      message: "Notion page created successfully!",
      pageId: data.id,
    };
  } catch (error) {
    console.error("Error creating Notion page:", error);
    return { status: 500, error: "Failed to connect to Notion API" };
  }
}

// 2. Save Global Notion Configuration in User Profile (Connections Page)
export async function onSaveUserNotionConfig(
  accessToken: string,
  databaseId: string
) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress || "user@fuzzie.io";
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    const formattedDbId = databaseId.replace(/-/g, "").trim();

    const updatedUser = await db.user.upsert({
      where: { clerkId: user.id },
      update: {
        notionAccessToken: accessToken.trim(),
        notionDbId: formattedDbId,
      },
      create: {
        clerkId: user.id,
        email,
        name,
        profileImage: user.imageUrl,
        notionAccessToken: accessToken.trim(),
        notionDbId: formattedDbId,
      },
    });

    revalidatePath("/dashboard/connections");
    revalidatePath("/dashboard");

    return {
      status: 200,
      message: "Notion configuration saved to your account successfully!",
      notionAccessToken: updatedUser.notionAccessToken,
      notionDbId: updatedUser.notionDbId,
    };
  } catch (error) {
    console.error("Error saving global Notion config:", error);
    return { status: 500, error: "Failed to save Notion configuration" };
  }
}

// 3. Get Global Notion Configuration from User Profile
export async function onGetUserNotionConfig() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { notionAccessToken: true, notionDbId: true },
    });

    return {
      status: 200,
      accessToken: dbUser?.notionAccessToken || "",
      databaseId: dbUser?.notionDbId || "",
    };
  } catch (error) {
    console.error("Error getting user Notion config:", error);
    return { status: 500, error: "Failed to get Notion configuration" };
  }
}

// 4. Save Notion Configuration & Template for a Workflow
export async function onSaveNotionConfig(
  workflowId: string,
  accessToken: string,
  databaseId: string,
  notionTemplate: string
) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const formattedDbId = databaseId.replace(/-/g, "").trim();

    const workflow = await db.workflow.update({
      where: {
        id: workflowId,
        userId: user.id,
      },
      data: {
        notionAccessToken: accessToken.trim(),
        notionDbId: formattedDbId,
        notionTemplate,
      },
    });

    revalidatePath(`/dashboard/workflows/${workflowId}`);
    return {
      status: 200,
      message: "Notion configuration saved successfully",
      workflow,
    };
  } catch (error) {
    console.error("Error saving Notion config:", error);
    return { status: 500, error: "Failed to save Notion configuration" };
  }
}

// 5. Get Notion Configuration for a Workflow
export async function onGetNotionConfig(workflowId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const [workflow, dbUser] = await Promise.all([
      db.workflow.findUnique({
        where: { id: workflowId, userId: user.id },
        select: {
          notionAccessToken: true,
          notionDbId: true,
          notionTemplate: true,
        },
      }),
      db.user.findUnique({
        where: { clerkId: user.id },
        select: { notionAccessToken: true, notionDbId: true },
      }),
    ]);

    const effectiveToken = workflow?.notionAccessToken || dbUser?.notionAccessToken || "";
    const effectiveDbId = workflow?.notionDbId || dbUser?.notionDbId || "";

    return {
      status: 200,
      notionAccessToken: effectiveToken,
      notionDbId: effectiveDbId,
      notionTemplate: workflow?.notionTemplate || "",
      isGlobalConnected: !workflow?.notionAccessToken && Boolean(dbUser?.notionAccessToken),
    };
  } catch (error) {
    console.error("Error getting Notion config:", error);
    return { status: 500, error: "Failed to get Notion configuration" };
  }
}
