import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "./auth-schema";

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
  const origin = env.APP_ORIGIN ?? new URL(requestUrl).origin;
  const emailVerificationEnabled = env.ENABLE_EMAIL_VERIFICATION === "true" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  const passwordResetEnabled = env.ENABLE_PASSWORD_RESET === "true" && Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB, { schema: authSchema }), {
      provider: "sqlite",
      schema: authSchema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? origin,
    basePath: "/api/auth",
    trustedOrigins: [origin],
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

export type AuthInstance = ReturnType<typeof createAuth>;
