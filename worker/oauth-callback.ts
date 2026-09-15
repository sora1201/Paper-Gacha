const googleCallbackPath = "/api/auth/callback/google";

export function isGoogleCallback(request: Request) {
  return new URL(request.url).pathname === googleCallbackPath;
}

export function oauthSettingsUrl(origin: string, error?: string) {
  const url = new URL("/settings", origin);
  if (error) url.searchParams.set("authError", error);
  return url.toString();
}

/**
 * Better Auth normally returns a redirect itself. This guard only normalizes a
 * callback response that has no Location (or an error), while preserving every
 * response header, including Set-Cookie from the newly-created session.
 */
export function normalizeGoogleCallbackResponse(request: Request, response: Response, appOrigin: string) {
  if (!isGoogleCallback(request)) return response;

  const headers = new Headers(response.headers);
  const location = headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    const destination = new URL(location, appOrigin);
    if (destination.origin === new URL(appOrigin).origin && destination.pathname === "/settings") return response;
    headers.set("location", oauthSettingsUrl(appOrigin, "oauth_callback_failed"));
    return new Response(null, { status: 302, headers });
  }

  headers.set("location", oauthSettingsUrl(appOrigin, response.ok ? undefined : "oauth_callback_failed"));
  // A redirect body is unnecessary and can otherwise expose an internal error.
  return new Response(null, { status: 302, headers });
}

export function googleCallbackError(appOrigin: string) {
  return Response.redirect(oauthSettingsUrl(appOrigin, "oauth_callback_failed"), 302);
}
