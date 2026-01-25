import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useLocations() {
    const data = useQuery(api.locations.list);
    return {
        data: data?.map((loc) => ({
            id: loc._id,
            name: loc.name,
        })) ?? [],
        isLoading: data === undefined,
    };
}

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
            locationIds: string[];
            friendIds: string[];
        }) => {
            setIsPending(true);
            try {
                return await createOrder({
                    name: orderData.name,
                    comments: orderData.comments ?? undefined,
                    locationIds: orderData.locationIds as Id<"locations">[],
                    friendIds: orderData.friendIds as Id<"users">[],
                });
            } finally {
                setIsPending(false);
            }
        },
        isPending,
    };
}
