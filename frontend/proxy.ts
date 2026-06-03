import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Public routes — accessible without a Clerk session cookie.
 *
 * IMPORTANT: Next.js middleware runs BEFORE rewrites. All /api/* routes
 * are proxied to FastAPI which handles its own JWT auth via Bearer token.
 * Clerk middleware must NOT intercept them — it uses cookies, not Bearer
 * tokens, so it would block every authenticated API call with a 404/redirect.
 *
 * Page-level protection:
 * - "/history" and "/history/:id" are protected — guests are redirected to sign-in
 *
 * API-level protection is handled entirely by FastAPI (get_current_user).
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",       // ALL API routes — FastAPI handles auth internally
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
