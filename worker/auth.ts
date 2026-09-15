import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "./auth-schema";
import { googleCallbackError, isGoogleCallback, normalizeGoogleCallbackResponse } from "./oauth-callback";
import { accountLinking } from "./account-linking";

export type AuthEnv = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ENABLE_EMAIL_VERIFICATION?: string;
  ENABLE_PASSWORD_RESET?: string;
};

async function sendEmail(env: AuthEnv, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    // Development remains usable without mail. Production flows are disabled below.
    console.warn(`Email not sent (${subject}) because RESEND_API_KEY/EMAIL_FROM is not configured.`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export function createAuth(env: AuthEnv, requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const origin = new URL(env.APP_ORIGIN ?? requestOrigin).origin;
  const authBaseURL = new URL(env.BETTER_AUTH_URL ?? origin).origin;
  const productionHttps = authBaseURL.startsWith("https://");
  const emailVerificationEnabled = env.ENABLE_EMAIL_VERIFICATION === "true" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  const passwordResetEnabled = env.ENABLE_PASSWORD_RESET === "true" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: authBaseURL,
    basePath: "/api/auth",
    trustedOrigins: [origin],
    account: { accountLinking },
    advanced: {
      useSecureCookies: productionHttps,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: productionHttps,
        sameSite: "lax",
        path: "/",
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailVerificationEnabled,
      sendResetPassword: passwordResetEnabled
        ? async ({ user, url }) => sendEmail(env, user.email, "Reset your Paper Gacha password", `<p><a href="${url}">Reset password</a></p>`)
        : undefined,
    },
    emailVerification: {
      sendOnSignUp: emailVerificationEnabled,
      sendVerificationEmail: emailVerificationEnabled
        ? async ({ user, url }) => sendEmail(env, user.email, "Verify your Paper Gacha email", `<p><a href="${url}">Verify email</a></p>`)
        : async () => undefined,
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    } : {},
  });
}

export async function handleAuth(request: Request, env: AuthEnv) {
  const origin = new URL(env.APP_ORIGIN ?? request.url).origin;
  try {
    const response = await createAuth(env, request.url).handler(request);
    return normalizeGoogleCallbackResponse(request, response, origin);
  } catch (error) {
    if (isGoogleCallback(request)) {
      console.error("Google OAuth callback failed", error);
      return googleCallbackError(origin);
    }
    throw error;
  }
}

export type AuthInstance = ReturnType<typeof createAuth>;
