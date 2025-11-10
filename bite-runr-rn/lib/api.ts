import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export type FetchOptions<TBody = unknown> = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: TBody;
    headers?: Record<string, string>;
    requireAuth?: boolean;
};

/**
 * Generic fetch wrapper with authentication and error handling
 * @param url - The API endpoint (relative to API_URL or absolute URL)
 * @param options - Fetch options including method, body, headers
 * @returns Promise with typed response data
 */
export async function apiFetch<TResponse, TBody = unknown>(
    url: string,
    options: FetchOptions<TBody> = {}
): Promise<TResponse> {
    const {
        method = "GET",
        body,
        headers = {},
        requireAuth = true,
    } = options;

    // Get authenticated user if required
    if (requireAuth) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(`Auth error: ${error.message}`);
        if (!data.user?.id) throw new Error("No authenticated user");
    }

    // Build full URL if it's a relative path
    const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

    // Prepare request options
    const requestOptions: RequestInit = {
        method,
        headers: {
            "Accept": "application/json",
            ...(body && { "Content-Type": "application/json" }),
            ...headers,
        },
    };

    // Add body if present
    if (body) {
        requestOptions.body = JSON.stringify(body);
    }

    // Make the request
    const res = await fetch(fullUrl, requestOptions);

    // Handle errors
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `API request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
        );
    }

    // Parse and return JSON response
    const json = (await res.json()) as TResponse;
    return json;
}
