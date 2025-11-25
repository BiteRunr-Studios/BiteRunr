// filename: src/lib/splitName.ts

/**
 * Splits a full "name" string into first and last name.
 * Handles spaces, dots, dashes, underscores, and CamelCase boundaries.
 * Falls back gracefully for single-word names.
 */
export function splitName(fullName: string | null | undefined): {
    firstName: string | null;
    lastName: string | null;
} {
    if (!fullName) return { firstName: null, lastName: null };

    // Trim and normalize whitespace
    let s = fullName.trim();

    // Insert spaces at camelCase / PascalCase boundaries (including diacritics)
    // e.g. "RyanSomers" -> "Ryan Somers"
    s = s.replace(/([a-zà-öø-ÿ])([A-ZÀ-ÖØ-Þ])/g, "$1 $2");

    // Replace common delimiters with spaces: dots, dashes, underscores
    s = s.replace(/[.\-_]+/g, " ");

    // Collapse multiple spaces
    s = s.replace(/\s+/g, " ").trim();

    // Remove honorifics/suffixes commonly seen, non-destructive if absent
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

    // Split into tokens and keep those containing letters
    const tokens = s
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .filter((t) => /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(t))
        .filter((t) => !STOP_WORDS.has(t.toLowerCase()));

    if (tokens.length === 0) return { firstName: null, lastName: null };

    // Title-case helper (preserves diacritics, normalizes common casing)
    const titleCase = (word: string) =>
        word.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase()); // uses Unicode property for letters

    const first = titleCase(tokens[0]);
    const last =
        tokens.length > 1 ? titleCase(tokens[tokens.length - 1]) : null;

    return { firstName: first, lastName: last };
}
