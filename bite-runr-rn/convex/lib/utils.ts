/**
 * Splits a full name into firstName and lastName
 * Handles various formats like "John Doe", "JohnDoe", "john.doe", etc.
 */
export function splitName(fullName: string | null | undefined): {
    firstName: string | null;
    lastName: string | null;
} {
    if (!fullName) return { firstName: null, lastName: null };

    let s = fullName.trim();

    // Insert space between camelCase
    s = s.replace(/([a-zà-öø-ÿ])([A-ZÀ-ÖØ-Þ])/g, "$1 $2");
    // Replace separators with spaces
    s = s.replace(/[.\-_]+/g, " ");
    // Normalize whitespace
    s = s.replace(/\s+/g, " ").trim();

    const STOP_WORDS = new Set([
        "mr",
        "mrs",
        "ms",
        "dr",
        "prof",
        "sir",
        "jr",
        "sr",
        "ii",
        "iii",
        "iv",
    ]);

    const tokens = s
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .filter((t) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(t))
        .filter((t) => !STOP_WORDS.has(t.toLowerCase()));

    if (tokens.length === 0) return { firstName: null, lastName: null };

    const titleCase = (word: string) =>
        word.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase());

    const first = titleCase(tokens[0]);
    const last =
        tokens.length > 1 ? titleCase(tokens[tokens.length - 1]) : null;

    return { firstName: first, lastName: last };
}
