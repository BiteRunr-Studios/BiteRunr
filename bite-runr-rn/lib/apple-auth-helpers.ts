import * as SecureStore from "expo-secure-store";
import type * as AppleAuthentication from "expo-apple-authentication";

const PENDING_APPLE_NAME_KEY = "biterunr-auth-pending-apple-name";

export type PendingAppleName = {
  firstName?: string;
  lastName?: string;
};

export function appleCredentialNames(
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
): PendingAppleName | null {
  const firstName = fullName?.givenName?.trim();
  const lastName = fullName?.familyName?.trim();
  if (!firstName && !lastName) return null;
  return { firstName, lastName: lastName ?? "" };
}

export async function stashPendingAppleName(
  name: PendingAppleName,
): Promise<void> {
  if (!name.firstName && !name.lastName) return;
  await SecureStore.setItemAsync(PENDING_APPLE_NAME_KEY, JSON.stringify(name));
}

export async function getPendingAppleName(): Promise<PendingAppleName | null> {
  const raw = await SecureStore.getItemAsync(PENDING_APPLE_NAME_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingAppleName;
    if (!parsed.firstName && !parsed.lastName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingAppleName(): Promise<void> {
  await SecureStore.deleteItemAsync(PENDING_APPLE_NAME_KEY);
}
