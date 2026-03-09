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

export function groupOrderItemsByParticipant<T extends GroupableOrderItem>(
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
