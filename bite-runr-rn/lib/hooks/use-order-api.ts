import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useFriends() {
    const data = useQuery(api.friends.list);
    return {
        data: data?.map((friend) => ({
            id: friend.id,
            first_name: friend.firstName,
            last_name: friend.lastName,
            avatar_url: friend.avatarUrl,
        })) ?? [],
        isLoading: data === undefined,
    };
}

export function useCreateOrder() {
    const createOrder = useMutation(api.orders.create);
    const [isPending, setIsPending] = useState(false);

    return {
        mutateAsync: async (orderData: {
            name: string;
            comments: string | null;
            locationNames: string[];
            friendIds: string[];
        }) => {
            setIsPending(true);
            try {
                return await createOrder({
                    name: orderData.name,
                    comments: orderData.comments ?? undefined,
                    locationNames: orderData.locationNames,
                    friendIds: orderData.friendIds as Id<"users">[],
                });
            } finally {
                setIsPending(false);
            }
        },
        isPending,
    };
}
