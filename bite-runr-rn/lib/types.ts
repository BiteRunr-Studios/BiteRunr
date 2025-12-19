export interface OrderSummary {
    id: string;
    name: string;
    creator_id: string;
    comments: string | null;
    status: OrderStatus;
    paused: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface OrderUserDTO {
    id: string;
    user_id: string;
    order_id: string;
    status: "ordering" | "done" | string;
    settlement_status: "unpaid" | "paid" | "partial" | string;
    amount_owed: string; // "2.00"
    created_at: string; // ISO
    updated_at: string; // ISO
    user: Profile | null;
}

export interface UserOrderDetails {
    order: OrderSummary;
    order_users: OrderUserDTO[];
    items_count: number;
    people_count: number;
}
export type UserProfileType = {
    id: string;
    email: string;
    profile: {
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
    } | null;
};

export interface Order {
    id: string;
    name: string;
    creator_id: string;
    comments: string | null;
    status: OrderStatus;
    paused: boolean;
    created_at: Date;
    updated_at: Date;
    orderItems: OrderItem[] | null;
    orderUsers: OrderUser[] | null;
    orderLocations: OrderLocation[] | null;
    creator: UserProfile | null;
    items_count: number | null;
}

export interface OrderItem {
    id: string;
    order_location_id: string;
    user_id: string;
    name: string;
    comments: string | null;
    quantity: number;
    created_at: Date;
    updated_at: Date;
    order_location: OrderLocation | null;
    user: UserProfile | null;
}

export interface OrderLocation {
    id: string;
    order_id: string;
    location_id: string;
    created_at: Date;
    updated_at: Date;
    order: Order | null;
    location: Location | null;
    order_items: OrderItem[] | null;
}

export interface Location {
    id: string;
    name: string;
    address: string;
    order_locations: OrderLocation[] | null;
}

export interface UserProfile {
    id: string;
    email: string;
    profile: Profile | null;
}

export interface Profile {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface OrderUser {
    id: string;
    user_id: string;
    order_id: string;
    status: "ordering" | "done" | string;
    created_at: Date;
    updated_at: Date;
    order: Order | null;
    user: Profile | null;
}

export enum OrderStatus {
    Created = "created",
    Completed = "completed",
    Active = "active",
    Cancelled = "cancelled",
}

export interface AwaitingOrdersDTO {
    count: number;
    order_users: AwaitingOrderUserDTO[];
    order: AwaitingOrderDTO;
    order_locations: AwaitingOrderLocationDTO[];
}

export interface AwaitingOrderUserDTO {
    id: string;
    user_id: string;
    order_id: string;
    status: string;
    amount_owed: number;
    created_at: string; // ISO
    updated_at: string; // ISO
    user: Profile;
}

export interface AwaitingOrderDTO {
    id: string;
    name: string;
    creator_id: string;
    comments: string | null;
    status: OrderStatus;
    paused: boolean;
    created_at: string; // ISO
    updated_at: string; // ISO
}

export interface AwaitingOrderLocationDTO {
    id: string;
    order_id: string;
    location_id: string;
    created_at: string; // ISO
    updated_at: string; // ISO
}

export interface AwaitingOrderRequest {
    order_id: string;
}

export interface Friend {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
}

export interface CreateOrderRequest {
    name: string;
    comments: string | null;
    status: "active";
    paused: boolean;
    creator_id: string;
    order_locations: {
        order_id: string | null;
        location_id: string;
    }[];
    order_users: {
        order_id: string | null;
        user_id: string;
    }[];
}

export interface SelectItemsOrderLocationDTO {
    location_id: string;
    order_location_id: string;
    location_name: string;
}

export interface SelectItemsOrderUserLocationItemDTO {
    id: string;
    order_location_id: string;
    order_user_id: string;
    item_id: string;
    comments: string | null;
    quantity: number;
    created_at: string | null;
    updated_at: string | null;
    item: SelectItemsItemDTO;
}

export interface SelectItemsItemDTO {
    id: string;
    name: string;
    location_id: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface SelectItemsOrderStatus {
    status: "done" | "ordering";
}

export interface SelectItemsAddExistingItemDTO {
    orderLocationId: string;
    orderUserId: string;
    itemId: string;
    comments: string | null;
    quantity: number;
}
