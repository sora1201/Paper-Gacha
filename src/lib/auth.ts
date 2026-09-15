export type AuthUser = { id: string; email: string; name?: string };
export type AuthSession = { user: AuthUser } | null;
async function authPost(path: string, body: unknown) {
  const response = await fetch(`/api/auth/${path}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) { const value = await response.json().catch(() => null) as { message?: string } | null; throw new Error(value?.message ?? `Authentication failed (${response.status})`); }
  return response.json().catch(() => null);
}
export async function getSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/get-session", { credentials: "include" });
  if (!response.ok) return null;
  return response.json() as Promise<AuthSession>;
}
export const signInEmail = (email: string, password: string) => authPost("sign-in/email", { email, password });
export const signUpEmail = (name: string, email: string, password: string) => authPost("sign-up/email", { name, email, password });
export const signOut = () => authPost("sign-out", {});
export const requestPasswordReset = (email: string) => authPost("request-password-reset", { email, redirectTo: `${location.origin}/settings` });
export const resetPassword = (token: string, newPassword: string) => authPost("reset-password", { token, newPassword });
export async function signInGoogle() {
  const result = await authPost("sign-in/social", { provider: "google", callbackURL: `${location.origin}/settings` }) as { url?: string } | null;
  if (result?.url) location.assign(result.url);
}
