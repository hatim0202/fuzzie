import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes jo bina login ke bhi access honi chahiye
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/clerk-webhook(.*)",
  "/api/auth/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Agar route public nahi hai, toh user ko protect/authenticate karo
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Next.js internals aur static files ko skip karo
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Hamesha API routes par run karo
    "/(api|trpc)(.*)",
  ],
};
