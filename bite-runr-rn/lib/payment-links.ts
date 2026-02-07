import { Linking } from "react-native";

export function getPaypalUrl(
    handle: string,
    amountInCents: bigint | number,
    note?: string,
): string {
    const amount = (Number(amountInCents) / 100).toFixed(2);
    const cleanHandle = handle.replace(/^[@/]/, "").trim();
    return `https://paypal.me/${encodeURIComponent(cleanHandle)}/${amount}`;
}

export async function openPaypalLink(
    handle: string,
    amountInCents: bigint | number,
    note?: string,
): Promise<boolean> {
    const url = getPaypalUrl(handle, amountInCents, note);

    try {
        await Linking.openURL(url);
        return true;
    } catch {
        return false;
    }
}
