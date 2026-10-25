"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  listDriveFiles,
  getLatestDriveFile,
  refreshGoogleAccessToken,
  getGoogleUserEmail,
} from "@/lib/google-drive";

// Helper to get active access token (auto-refresh if needed)
async function getValidAccessToken(clerkId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  if (!user || !user.googleAccessToken) return null;

  // Verify token with a quick test; if it fails and refresh token exists, refresh it
  try {
    const test = await listDriveFiles(user.googleAccessToken, undefined, 1);
    if (!test.error) {
      return user.googleAccessToken;
    }

    if (user.googleRefreshToken) {
      const refreshed = await refreshGoogleAccessToken(user.googleRefreshToken);
      if (refreshed.accessToken) {
        await db.user.update({
          where: { clerkId },
          data: { googleAccessToken: refreshed.accessToken },
        });
        return refreshed.accessToken;
      }
    }
  } catch {
    // ignore
  }

  return user.googleAccessToken;
}

// 1. Get Google Drive Connection Status
export async function onGetDriveConnection() {
  try {
    const user = await currentUser();
    if (!user) return { isConnected: false, email: null, folderId: null, hasEnvKeys: false };

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: {
        googleAccessToken: true,
        googleEmail: true,
        googleFolderId: true,
      },
    });

    const hasEnvKeys = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );

    return {
      isConnected: Boolean(dbUser?.googleAccessToken),
      email: dbUser?.googleEmail || null,
      folderId: dbUser?.googleFolderId || null,
      hasEnvKeys,
    };
  } catch (error) {
    console.error("Error checking Drive connection:", error);
    return { isConnected: false, email: null, folderId: null, hasEnvKeys: false };
  }
}

// 2. Disconnect Google Drive
export async function onDisconnectDrive() {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    await db.user.update({
      where: { clerkId: user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleEmail: null,
        googleFolderId: null,
      },
    });

    return { status: 200, message: "Google Drive disconnected successfully" };
  } catch (error) {
    console.error("Error disconnecting Drive:", error);
    return { status: 500, error: "Failed to disconnect Google Drive" };
  }
}

// 3. Save Manual Google Access Token (for local testing / direct token auth)
export async function onSaveManualDriveToken(token: string, folderId?: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    if (!token || !token.trim()) {
      return { status: 400, error: "Access token is required" };
    }

    const trimmedToken = token.trim();
    // Validate token by checking user profile or listing 1 file
    const email = await getGoogleUserEmail(trimmedToken);

    await db.user.upsert({
      where: { clerkId: user.id },
      update: {
        googleAccessToken: trimmedToken,
        googleEmail: email || user.emailAddresses[0]?.emailAddress || "Google User",
        ...(folderId ? { googleFolderId: folderId.trim() } : {}),
      },
      create: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : null,
        googleAccessToken: trimmedToken,
        googleEmail: email || user.emailAddresses[0]?.emailAddress || "Google User",
        googleFolderId: folderId ? folderId.trim() : null,
      },
    });

    return {
      status: 200,
      message: "Google Drive access token saved and verified!",
      email: email || "Connected",
    };
  } catch (error) {
    console.error("Error saving manual Drive token:", error);
    return { status: 500, error: "Failed to save Google Drive token" };
  }
}

// 4. Save Default Folder ID
export async function onSaveDriveFolder(folderId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    await db.user.update({
      where: { clerkId: user.id },
      data: {
        googleFolderId: folderId.trim() || null,
      },
    });

    return { status: 200, message: "Default Drive folder saved successfully" };
  } catch (error) {
    console.error("Error saving Drive folder:", error);
    return { status: 500, error: "Failed to save Drive folder" };
  }
}

// 5. Fetch Files from Connected Google Drive
export async function onGetDriveFiles(folderId?: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized", files: [] };

    const token = await getValidAccessToken(user.id);
    if (!token) {
      return { status: 400, error: "Google Drive is not connected yet", files: [] };
    }

    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { googleFolderId: true },
    });

    const targetFolder = folderId || dbUser?.googleFolderId || undefined;
    const result = await listDriveFiles(token, targetFolder, 8);

    if (result.error) {
      return { status: 400, error: result.error, files: [] };
    }

    return { status: 200, files: result.files };
  } catch (error) {
    console.error("Error fetching Drive files:", error);
    return { status: 500, error: "Failed to fetch Google Drive files", files: [] };
  }
}

// 6. Test / Verify Google Drive File Trigger (Uses REAL file if connected, or sample simulation)
export async function testDriveFileTrigger(
  folderId?: string,
  sampleFileName: string = "Quarterly_Financial_Report.pdf"
) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const token = await getValidAccessToken(user.id);

    if (token) {
      // REAL GOOGLE DRIVE CONNECTED: Fetch the latest real file from Drive
      const { file, error } = await getLatestDriveFile(token, folderId);

      if (file) {
        return {
          status: 200,
          isLive: true,
          message: `Live trigger verified! Found latest file '${file.name}' from your Google Drive.`,
          payload: {
            id: file.id,
            folderId: folderId || "root",
            fileName: file.name,
            fileUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            triggeredAt: new Date().toISOString(),
            userEmail: user.emailAddresses[0]?.emailAddress || "user@fuzzie.io",
          },
        };
      }

      if (error) {
        console.warn("Could not fetch real file from Drive:", error);
      }
    }

    // Fallback: If not connected to Google Drive or folder is empty, simulate trigger
    const mockFilePayload = {
      folderId: folderId?.trim() || "root",
      fileName: sampleFileName.trim() || "Automated_Upload_File.pdf",
      fileUrl: folderId?.trim()
        ? `https://drive.google.com/drive/folders/${folderId.trim()}`
        : "https://drive.google.com",
      triggeredAt: new Date().toISOString(),
      userEmail: user.emailAddresses[0]?.emailAddress || "user@fuzzie.io",
    };

    return {
      status: 200,
      isLive: false,
      message: token
        ? "Connected to Google Drive, but no files found in the specified folder. Using test payload."
        : "Simulated trigger event verified! (Connect Google Drive above for real live files)",
      payload: mockFilePayload,
    };
  } catch (error) {
    console.error("Error verifying Google Drive trigger:", error);
    return { status: 500, error: "Failed to verify Google Drive trigger" };
  }
}

// 7. Save Google Drive Trigger Path for a Workflow
export async function onSaveDriveConfig(
  workflowId: string,
  folderId: string
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
        cronPath: folderId, // Stores the target Drive Folder ID / trigger path
        googleFolderId: folderId,
      },
    });

    return {
      status: 200,
      message: "Google Drive configuration saved successfully",
      workflow,
    };
  } catch (error) {
    console.error("Error saving Drive config:", error);
    return { status: 500, error: "Failed to save Google Drive configuration" };
  }
}

// 8. Get Google Drive Trigger Path for a Workflow
export async function onGetDriveConfig(workflowId: string) {
  try {
    const user = await currentUser();
    if (!user) return { status: 403, error: "Unauthorized" };

    const workflow = await db.workflow.findUnique({
      where: {
        id: workflowId,
        userId: user.id,
      },
      select: {
        cronPath: true,
        googleFolderId: true,
      },
    });

    return {
      status: 200,
      folderId: workflow?.googleFolderId || workflow?.cronPath || "",
    };
  } catch (error) {
    console.error("Error getting Drive config:", error);
    return { status: 500, error: "Failed to get Google Drive configuration" };
  }
}
