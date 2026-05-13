// Single source of truth for platform fee calculation.
// Imported by both stripeConnect.ts (charge creation) and payments.ts (UI display).

export const APPLICATION_FEE_PERCENT = 0.05;
export const MINIMUM_APPLICATION_FEE = 100; // cents ($1.00)

export function calculatePlatformFee(amountCents: number): number {
  if (amountCents <= 0) return 0;
  return Math.max(
    MINIMUM_APPLICATION_FEE,
    Math.round(amountCents * APPLICATION_FEE_PERCENT),
  );
}
