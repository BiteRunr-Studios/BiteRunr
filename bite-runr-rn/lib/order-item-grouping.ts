import { calculateSimilarity } from "./fuzzy-match";

export interface GroupableOrderItem {
    id: string;
    orderUserId: string;
    userName: string;
}

export interface OrderItemGroup<T extends GroupableOrderItem> {
    key: string;
    baseName: string;
    displayName: string;
    items: T[];
}

export interface ItemTextGroupableOrderItem extends GroupableOrderItem {
    text: string;
    sortOrder?: number;
    priceInCents?: number | null;
}

export interface OrderItemTextGroup<T extends ItemTextGroupableOrderItem> {
    key: string;
    displayName: string;
    normalizedText: string;
    items: T[];
    lineCount: number;
    peopleCount: number;
    sortOrder: number;
    subtotalInCents: number | null;
}

export interface AmbiguousOrderItemTextCluster<
    T extends ItemTextGroupableOrderItem,
> {
    key: string;
    groups: OrderItemTextGroup<T>[];
}

export interface OrderItemTextGroupingAnalysis<
    T extends ItemTextGroupableOrderItem,
> {
    signature: string;
    groups: OrderItemTextGroup<T>[];
    ambiguousClusters: AmbiguousOrderItemTextCluster<T>[];
}

export interface ResolvedOrderItemTextGroup {
    displayName: string;
    orderItemIds: string[];
}

export interface OrderSummaryTextSignatureLocation<
    T extends Pick<ItemTextGroupableOrderItem, "id" | "text">,
> {
    orderLocationId: string;
    lines: T[];
}

export type OrderItemTextGroupingResolutionSource = "deterministic" | "ai";

const STOP_WORDS = new Set(["and"]);

function normalizeDisplayText(text: string): string {
    return text.trim().replace(/\s+/g, " ");
}

function normalizeSizeTokens(text: string): string {
    return text
        .replace(/\bsm\b/g, "small")
        .replace(/\bmed\b/g, "medium")
        .replace(/\bmd\b/g, "medium")
        .replace(/\blg\b/g, "large")
        .replace(/\bxl\b/g, "extra large");
}

export function normalizeOrderItemText(text: string): string {
    return normalizeSizeTokens(
        text
            .trim()
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/(\d+)\s*"/g, "$1 in ")
            .replace(/(\d+)\s*[-]?\s*(?:inches|inch|in)\b/g, "$1 in")
            .replace(/\bw\/o\b/g, " without ")
            .replace(/\bw\//g, " with ")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
    );
}

function tokenizeNormalizedText(text: string): string[] {
    return text
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean);
}

function getNumericTokens(text: string): string[] {
    return tokenizeNormalizedText(text).filter((token) => /^\d+$/.test(token));
}

function getTokenSet(text: string): Set<string> {
    return new Set(
        tokenizeNormalizedText(text).filter((token) => !STOP_WORDS.has(token)),
    );
}

function tokenSetsOverlap(left: Set<string>, right: Set<string>): boolean {
    if (left.size === 0 || right.size === 0) {
        return false;
    }

    let overlap = 0;
    for (const token of left) {
        if (right.has(token)) {
            overlap += 1;
        }
    }

    const smallerSetSize = Math.min(left.size, right.size);
    return smallerSetSize > 0 && overlap / smallerSetSize >= 0.75;
}

function tokenSetsMatch(left: Set<string>, right: Set<string>): boolean {
    if (left.size !== right.size) {
        return false;
    }

    for (const token of left) {
        if (!right.has(token)) {
            return false;
        }
    }

    return true;
}

function numericTokensMatch(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    return left.every((token, index) => token === right[index]);
}

function chooseDisplayName(texts: string[]): string {
    const counts = new Map<string, number>();
    for (const text of texts) {
        const normalized = normalizeDisplayText(text);
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort((left, right) => {
            const countDelta = right[1] - left[1];
            if (countDelta !== 0) {
                return countDelta;
            }

            const lengthDelta = right[0].length - left[0].length;
            if (lengthDelta !== 0) {
                return lengthDelta;
            }

            return left[0].localeCompare(right[0]);
        })[0]?.[0] ?? "";
}

function sortParticipantGroups<T extends GroupableOrderItem>(
    groups: OrderItemGroup<T>[],
): OrderItemGroup<T>[] {
    return groups;
}

function buildParticipantGroups<T extends GroupableOrderItem>(
    orderItems: T[] | null | undefined,
): OrderItemGroup<T>[] {
    if (!orderItems || orderItems.length === 0) {
        return [];
    }

    const groupsInDisplayOrder: Array<{
        key: string;
        baseName: string;
        items: T[];
    }> = [];
    const groupByParticipantId = new Map<
        string,
        {
            key: string;
            baseName: string;
            items: T[];
        }
    >();

    for (const item of orderItems) {
        const existingGroup = groupByParticipantId.get(item.orderUserId);
        if (existingGroup) {
            existingGroup.items.push(item);
            continue;
        }

        const nextGroup = {
            key: item.orderUserId,
            baseName: item.userName,
            items: [item],
        };
        groupsInDisplayOrder.push(nextGroup);
        groupByParticipantId.set(item.orderUserId, nextGroup);
    }

    const groupsByBaseName = new Map<string, typeof groupsInDisplayOrder>();
    for (const group of groupsInDisplayOrder) {
        const existingGroups = groupsByBaseName.get(group.baseName);
        if (existingGroups) {
            existingGroups.push(group);
        } else {
            groupsByBaseName.set(group.baseName, [group]);
        }
    }

    const displayNameByParticipantId = new Map<string, string>();
    for (const [baseName, duplicateGroups] of groupsByBaseName.entries()) {
        if (duplicateGroups.length === 1) {
            displayNameByParticipantId.set(duplicateGroups[0].key, baseName);
            continue;
        }

        [...duplicateGroups]
            .sort((left, right) => left.key.localeCompare(right.key))
            .forEach((group, index) => {
                displayNameByParticipantId.set(
                    group.key,
                    `${baseName} (${index + 1})`,
                );
            });
    }

    return groupsInDisplayOrder.map((group) => ({
        key: group.key,
        baseName: group.baseName,
        displayName:
            displayNameByParticipantId.get(group.key) ?? group.baseName,
        items: group.items,
    }));
}

function buildTextGroup<T extends ItemTextGroupableOrderItem>(
    items: T[],
    inputOrderById: Map<string, number>,
    normalizedText: string,
    displayNameOverride?: string,
): OrderItemTextGroup<T> {
    const sortedItems = [...items].sort(
        (left, right) =>
            (inputOrderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
                (inputOrderById.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
            left.id.localeCompare(right.id),
    );
    const displayName =
        displayNameOverride ?? chooseDisplayName(sortedItems.map((item) => item.text));
    const peopleCount = new Set(sortedItems.map((item) => item.orderUserId)).size;
    const allItemsPriced = sortedItems.every(
        (item) =>
            item.priceInCents !== null && item.priceInCents !== undefined,
    );

    return {
        key: sortedItems
            .map((item) => item.id)
            .slice()
            .sort((left, right) => left.localeCompare(right))
            .join(":"),
        displayName,
        normalizedText,
        items: sortedItems,
        lineCount: sortedItems.length,
        peopleCount,
        sortOrder: Math.min(
            ...sortedItems.map(
                (item) => inputOrderById.get(item.id) ?? Number.MAX_SAFE_INTEGER,
            ),
        ),
        subtotalInCents: allItemsPriced
            ? sortedItems.reduce(
                  (sum, item) => sum + (item.priceInCents ?? 0),
                  0,
              )
            : null,
    };
}

function sortTextGroups<T extends ItemTextGroupableOrderItem>(
    groups: OrderItemTextGroup<T>[],
): OrderItemTextGroup<T>[] {
    return [...groups].sort((left, right) => {
        const lineCountDelta = right.lineCount - left.lineCount;
        if (lineCountDelta !== 0) {
            return lineCountDelta;
        }

        const sortOrderDelta = left.sortOrder - right.sortOrder;
        if (sortOrderDelta !== 0) {
            return sortOrderDelta;
        }

        return left.displayName.localeCompare(right.displayName);
    });
}

function buildAmbiguousClusters<T extends ItemTextGroupableOrderItem>(
    groups: OrderItemTextGroup<T>[],
): AmbiguousOrderItemTextCluster<T>[] {
    if (groups.length < 2) {
        return [];
    }

    const groupByKey = new Map(groups.map((group) => [group.key, group]));
    const adjacency = new Map<string, Set<string>>();
    const metadata = new Map(
        groups.map((group) => [
            group.key,
            {
                numericTokens: getNumericTokens(group.normalizedText),
                tokenSet: getTokenSet(group.normalizedText),
            },
        ]),
    );

    for (let index = 0; index < groups.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < groups.length; compareIndex += 1) {
            const left = groups[index];
            const right = groups[compareIndex];

            if (left.normalizedText === right.normalizedText) {
                continue;
            }

            const leftMetadata = metadata.get(left.key);
            const rightMetadata = metadata.get(right.key);
            if (!leftMetadata || !rightMetadata) {
                continue;
            }

            if (
                !numericTokensMatch(
                    leftMetadata.numericTokens,
                    rightMetadata.numericTokens,
                )
            ) {
                continue;
            }

            if (
                !tokenSetsOverlap(leftMetadata.tokenSet, rightMetadata.tokenSet)
            ) {
                continue;
            }

            const similarity = calculateSimilarity(
                left.normalizedText,
                right.normalizedText,
            );
            if (
                similarity < 0.72 &&
                !tokenSetsMatch(leftMetadata.tokenSet, rightMetadata.tokenSet)
            ) {
                continue;
            }

            const leftNeighbors = adjacency.get(left.key) ?? new Set<string>();
            const rightNeighbors = adjacency.get(right.key) ?? new Set<string>();
            leftNeighbors.add(right.key);
            rightNeighbors.add(left.key);
            adjacency.set(left.key, leftNeighbors);
            adjacency.set(right.key, rightNeighbors);
        }
    }

    const visited = new Set<string>();
    const clusters: AmbiguousOrderItemTextCluster<T>[] = [];

    for (const [groupKey, neighbors] of adjacency.entries()) {
        if (neighbors.size === 0 || visited.has(groupKey)) {
            continue;
        }

        const stack = [groupKey];
        const component = new Set<string>();

        while (stack.length > 0) {
            const currentKey = stack.pop();
            if (!currentKey || visited.has(currentKey)) {
                continue;
            }

            visited.add(currentKey);
            component.add(currentKey);

            for (const neighbor of adjacency.get(currentKey) ?? []) {
                if (!visited.has(neighbor)) {
                    stack.push(neighbor);
                }
            }
        }

        if (component.size < 2) {
            continue;
        }

        const clusterGroups = [...component]
            .map((key) => groupByKey.get(key))
            .filter((group): group is OrderItemTextGroup<T> => !!group)
            .sort((left, right) => left.sortOrder - right.sortOrder);

        clusters.push({
            key: clusterGroups.map((group) => group.key).join("::"),
            groups: clusterGroups,
        });
    }

    return clusters.sort((left, right) => {
        const leftSortOrder = left.groups[0]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightSortOrder =
            right.groups[0]?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return leftSortOrder - rightSortOrder;
    });
}

export function buildOrderItemTextGroupingSignature<
    T extends Pick<ItemTextGroupableOrderItem, "id" | "text">,
>(orderItems: T[] | null | undefined): string {
    return [...(orderItems ?? [])]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((item) => `${item.id}:${normalizeDisplayText(item.text)}`)
        .join("|");
}

export function buildOrderSummaryTextSignature<
    T extends Pick<ItemTextGroupableOrderItem, "id" | "text">,
>(
    locations:
        | OrderSummaryTextSignatureLocation<T>[]
        | null
        | undefined,
): string {
    return [...(locations ?? [])]
        .sort((left, right) =>
            left.orderLocationId.localeCompare(right.orderLocationId),
        )
        .map(
            (location) =>
                `${location.orderLocationId}[${buildOrderItemTextGroupingSignature(
                    location.lines,
                )}]`,
        )
        .join("||");
}

export function analyzeOrderItemTextGroups<
    T extends ItemTextGroupableOrderItem,
>(
    orderItems: T[] | null | undefined,
): OrderItemTextGroupingAnalysis<T> {
    const inputItems = orderItems ?? [];
    const inputOrderById = new Map(
        inputItems.map((item, index) => [item.id, index]),
    );
    const groupedItems = new Map<string, T[]>();

    for (const item of inputItems) {
        const normalizedText = normalizeOrderItemText(item.text);
        const existingItems = groupedItems.get(normalizedText);
        if (existingItems) {
            existingItems.push(item);
        } else {
            groupedItems.set(normalizedText, [item]);
        }
    }

    const groups = sortTextGroups(
        [...groupedItems.entries()].map(([normalizedText, items]) =>
            buildTextGroup(items, inputOrderById, normalizedText),
        ),
    );

    return {
        signature: buildOrderItemTextGroupingSignature(inputItems),
        groups,
        ambiguousClusters: buildAmbiguousClusters(groups),
    };
}

export function groupOrderItemsByParticipant<T extends GroupableOrderItem>(
    orderItems: T[] | null | undefined,
): OrderItemGroup<T>[] {
    return sortParticipantGroups(buildParticipantGroups(orderItems));
}

export function groupOrderItemsByItemText<
    T extends ItemTextGroupableOrderItem,
>(
    orderItems: T[] | null | undefined,
): OrderItemTextGroup<T>[] {
    return analyzeOrderItemTextGroups(orderItems).groups;
}

export function materializeResolvedOrderItemTextGroups<
    T extends ItemTextGroupableOrderItem,
>(
    orderItems: T[] | null | undefined,
    resolvedGroups: ResolvedOrderItemTextGroup[] | null | undefined,
): OrderItemTextGroup<T>[] {
    const inputItems = orderItems ?? [];
    if (inputItems.length === 0) {
        return [];
    }

    if (!resolvedGroups || resolvedGroups.length === 0) {
        return groupOrderItemsByItemText(inputItems);
    }

    const inputOrderById = new Map(
        inputItems.map((item, index) => [item.id, index]),
    );
    const itemById = new Map(inputItems.map((item) => [item.id, item]));
    const consumedItemIds = new Set<string>();
    const groups: OrderItemTextGroup<T>[] = [];

    for (const resolvedGroup of resolvedGroups) {
        const items = resolvedGroup.orderItemIds
            .map((orderItemId) => itemById.get(orderItemId))
            .filter((item): item is T => !!item);
        if (items.length === 0) {
            continue;
        }

        items.forEach((item) => consumedItemIds.add(item.id));
        groups.push(
            buildTextGroup(
                items,
                inputOrderById,
                normalizeOrderItemText(resolvedGroup.displayName),
                normalizeDisplayText(resolvedGroup.displayName),
            ),
        );
    }

    const remainingItems = inputItems.filter(
        (item) => !consumedItemIds.has(item.id),
    );
    if (remainingItems.length > 0) {
        groups.push(...groupOrderItemsByItemText(remainingItems));
    }

    return sortTextGroups(groups);
}
