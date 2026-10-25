import { google } from "googleapis";

export function getGoogleOAuthClient(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const callbackUrl = redirectUri || `${baseUrl}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
}

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

/**
 * Fetch files from user's Google Drive using access token
 */
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  pageSize: number = 10
): Promise<{ files: DriveFileInfo[]; error?: string }> {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth });

    let q = "trashed = false";
    if (folderId && folderId.trim()) {
      q += ` and '${folderId.trim()}' in parents`;
    }

    const res = await drive.files.list({
      q,
      pageSize,
      fields: "files(id, name, mimeType, modifiedTime, webViewLink, size)",
      orderBy: "modifiedTime desc",
    });

    const files = (res.data.files || []).map((f) => ({
      id: f.id || "",
      name: f.name || "Untitled",
      mimeType: f.mimeType || "application/octet-stream",
      modifiedTime: f.modifiedTime || undefined,
      webViewLink: f.webViewLink || undefined,
      size: f.size || undefined,
    }));

    return { files };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error listing Drive files:", errorMessage);
    return { files: [], error: errorMessage };
  }
}

/**
 * Fetch the single most recent file from user's Google Drive
 */
export async function getLatestDriveFile(
  accessToken: string,
  folderId?: string
): Promise<{ file: DriveFileInfo | null; error?: string }> {
  const result = await listDriveFiles(accessToken, folderId, 1);
  if (result.error) {
    return { file: null, error: result.error };
  }
  return { file: result.files[0] || null };
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string | null; error?: string }> {
  try {
    const oauth2Client = getGoogleOAuthClient();
    if (!oauth2Client) {
      return { accessToken: null, error: "Google OAuth credentials not configured" };
    }

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return { accessToken: credentials.access_token || null };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Error refreshing Google access token:", errorMessage);
    return { accessToken: null, error: errorMessage };
  }
}

/**
 * Get user profile/email from access token
 */
export async function getGoogleUserEmail(
  accessToken: string
): Promise<string | null> {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: "v2", auth });
    const { data } = await oauth2.userinfo.get();
    return data.email || null;
  } catch (err) {
    console.error("Error getting Google user email:", err);
    return null;
  }
}
