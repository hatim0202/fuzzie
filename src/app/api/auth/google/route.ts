import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getGoogleOAuthClient, GOOGLE_DRIVE_SCOPES } from "@/lib/google-drive";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const oauth2Client = getGoogleOAuthClient();
    if (!oauth2Client) {
      // If GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing, redirect with error
      return NextResponse.redirect(
        new URL(
          "/dashboard/connections?error=missing_google_keys",
          req.url
        )
      );
    }

    const state = Buffer.from(
      JSON.stringify({ userId: user.id, timestamp: Date.now() })
    ).toString("base64");

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE_DRIVE_SCOPES,
      prompt: "consent",
      state,
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    console.error("Error generating Google OAuth URL:", error);
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=google_oauth_failed", req.url)
    );
  }
}
