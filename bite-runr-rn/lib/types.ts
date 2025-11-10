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

export interface Order {
    id: string;
    name: string;
    creator_id: string;
    comments: string | null;
    status: OrderStatus;
    paused: boolean;
    created_at: Date;
    updated_at: Date;
    order_items: OrderItem[] | null;
    order_users: OrderUser[] | null;
    order_locations: OrderLocation[] | null;
    creator: UserProfile | null;
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
