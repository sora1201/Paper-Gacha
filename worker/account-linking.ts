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
  // Local credential users may be unverified while email delivery is disabled.
  // The trusted Google provider still has to supply the same verified email.
  requireLocalEmailVerified: false,
} as const;
