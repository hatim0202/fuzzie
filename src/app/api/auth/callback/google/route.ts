import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getGoogleOAuthClient, getGoogleUserEmail } from "@/lib/google-drive";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("Google OAuth error in callback:", error);
    return NextResponse.redirect(
      new URL(`/dashboard/connections?error=${error || "no_code"}`, req.url)
    );
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const oauth2Client = getGoogleOAuthClient();
    if (!oauth2Client) {
      return NextResponse.redirect(
        new URL("/dashboard/connections?error=missing_google_keys", req.url)
      );
    }

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token || null;
    const refreshToken = tokens.refresh_token || null;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/dashboard/connections?error=no_access_token", req.url)
      );
    }

    // Retrieve the Google user's email
    const googleEmail = await getGoogleUserEmail(accessToken);

    // Save tokens and Google email to user in db
    await db.user.upsert({
      where: { clerkId: user.id },
      update: {
        googleAccessToken: accessToken,
        ...(refreshToken ? { googleRefreshToken: refreshToken } : {}),
        googleEmail: googleEmail || user.emailAddresses[0]?.emailAddress || null,
      },
      create: {
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : null,
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleEmail: googleEmail || user.emailAddresses[0]?.emailAddress || null,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/connections?google_status=connected", req.url)
    );
  } catch (err) {
    console.error("Error exchanging Google OAuth code:", err);
    return NextResponse.redirect(
      new URL("/dashboard/connections?error=token_exchange_failed", req.url)
    );
  }
}
