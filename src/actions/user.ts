"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function onAuthenticateUser() {
  try {
    // 1. Get currently authenticated Clerk user
    const user = await currentUser();

    if (!user || !user.id) {
      return { status: 403, error: "User not authenticated" };
    }

    // 2. Check if user exists in PostgreSQL, or create them
    const userExist = await db.user.upsert({
      where: {
        clerkId: user.id,
      },
      update: {
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        profileImage: user.imageUrl,
      },
      create: {
        clerkId: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.emailAddresses[0].emailAddress,
        profileImage: user.imageUrl,
        credits: 100,
        tier: "Free",
      },
      include: {
        workflows: true,
      },
    });

    if (userExist) {
      return { status: 200, user: userExist };
    }

    return { status: 400, error: "Failed to authenticate user" };
  } catch (error) {
    console.error("Authentication Error:", error);
    return { status: 500, error: "Internal Server Error" };
  }
}

// 3. Update User Profile Name
export async function onUpdateUserProfile(name: string) {
  try {
    const user = await currentUser();
    if (!user || !user.id) {
      return { status: 403, error: "User not authenticated" };
    }

    if (!name || !name.trim()) {
      return { status: 400, error: "Name cannot be empty" };
    }

    const updatedUser = await db.user.update({
      where: {
        clerkId: user.id,
      },
      data: {
        name: name.trim(),
      },
    });

    return {
      status: 200,
      message: "Profile updated successfully!",
      user: updatedUser,
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { status: 500, error: "Failed to update user profile" };
  }
}

