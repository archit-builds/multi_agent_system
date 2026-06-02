import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — accessible to guests without signing in.
 *
 * - "/"               : home page (guests can search freely)
 * - "/sign-in(.*)"    : Clerk sign-in pages
 * - "/sign-up(.*)"    : Clerk sign-up pages
 * - "/api/research(.*)" : research stream (backend handles guest vs user logic)
 *
 * All other routes (e.g. /dashboard, /api/history) remain protected.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/research(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
