/**
 * Google is the only provider allowed to trigger Better Auth's implicit
 * same-email linking. Google verifies the email claim before Better Auth sees
 * the profile; credential and any future providers remain untrusted.
 */
export const accountLinking = {
  enabled: true,
  trustedProviders: ["google"],
  disableImplicitLinking: false,
  allowDifferentEmails: false,
} as const;
