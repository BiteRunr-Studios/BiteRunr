/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a matrix to store distances
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1, // deletion
                    dp[i][j - 1] + 1, // insertion
                    dp[i - 1][j - 1] + 1, // substitution
                );
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
    // Normalize strings: lowercase and remove extra whitespace
    const normalized1 = str1.toLowerCase().trim().replace(/\s+/g, " ");
    const normalized2 = str2.toLowerCase().trim().replace(/\s+/g, " ");

    if (normalized1 === normalized2) return 1;
    if (normalized1.length === 0 || normalized2.length === 0) return 0;

    const distance = levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    return 1 - distance / maxLength;
}

/**
 * Check if one string contains significant parts of another
 */
function containsSubstantialMatch(str1: string, str2: string): boolean {
    const words1 = str1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
    const words2 = str2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

    // Check if any significant word from one exists in the other
    for (const word of words1) {
        if (words2.some((w) => w.includes(word) || word.includes(w))) {
            return true;
        }
    }
    return false;
}

export interface MatchCandidate {
    id: string;
    name: string;
    quantity: number;
}

export interface MatchResult {
    candidateId: string;
    candidateName: string;
    confidence: number;
}

/**
 * Find the best match for a receipt item name among order items
 */
export function findBestMatch(
    receiptItemName: string,
    candidates: MatchCandidate[],
): MatchResult | null {
    if (candidates.length === 0) return null;

    let bestMatch: MatchResult | null = null;
    let highestScore = 0;

    for (const candidate of candidates) {
        // Calculate similarity score
        let score = calculateSimilarity(receiptItemName, candidate.name);

        // Boost score if there's a substantial word match
        if (containsSubstantialMatch(receiptItemName, candidate.name)) {
            score = Math.min(1, score + 0.2);
        }

        if (score > highestScore) {
            highestScore = score;
            bestMatch = {
                candidateId: candidate.id,
                candidateName: candidate.name,
                confidence: score,
            };
        }
    }

    // Only return matches with reasonable confidence
    if (bestMatch && bestMatch.confidence >= 0.3) {
        return bestMatch;
    }

    return null;
}

/**
 * Auto-match receipt items to order items
 */
export function autoMatchReceiptItems(
    receiptItems: Array<{
        name: string;
        quantity: number;
        priceInCents: number | null;
    }>,
    orderItems: Array<{
        id: string;
        itemName: string;
        quantity: number;
        userName: string;
    }>,
): Array<{
    id: string;
    receiptItem: {
        name: string;
        quantity: number;
        priceInCents: number | null;
    };
    matchedOrderItemId: string | null;
    matchedItemName: string | null;
    matchedUserName: string | null;
    confidence: number;
}> {
    // Track which order items have been matched
    const matchedOrderItemIds = new Set<string>();

    return receiptItems.map((receiptItem, index) => {
        // Find candidates that haven't been matched yet
        const availableCandidates = orderItems
            .filter((oi) => !matchedOrderItemIds.has(oi.id))
            .map((oi) => ({
                id: oi.id,
                name: oi.itemName,
                quantity: oi.quantity,
                userName: oi.userName,
            }));

        const match = findBestMatch(receiptItem.name, availableCandidates);

        // Generate stable unique ID for this matched item
        const id = `receipt-item-${index}`;

        if (match) {
            matchedOrderItemIds.add(match.candidateId);
            const matchedItem = orderItems.find(
                (oi) => oi.id === match.candidateId,
            );
            return {
                id,
                receiptItem,
                matchedOrderItemId: match.candidateId,
                matchedItemName: match.candidateName,
                matchedUserName: matchedItem?.userName ?? null,
                confidence: match.confidence,
            };
        }

        return {
            id,
            receiptItem,
            matchedOrderItemId: null,
            matchedItemName: null,
            matchedUserName: null,
            confidence: 0,
        };
    });
}
