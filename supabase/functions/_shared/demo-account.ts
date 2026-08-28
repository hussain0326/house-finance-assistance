// Keep in sync with DEMO_ACCOUNT_EMAIL in src/app/core/auth/auth.service.ts
export const DEMO_ACCOUNT_EMAIL = "demo@homefinance.app";

export function isDemoAccount(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
