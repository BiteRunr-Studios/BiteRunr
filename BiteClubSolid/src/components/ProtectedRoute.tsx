import { JSX, Show, onMount } from "solid-js";
import { useAuth } from "@solid-mediakit/auth/client";
import { useNavigate } from "@solidjs/router";

type ProtectedRouteProps = {
    children: JSX.Element;
};

export default function ProtectedRoute(props: ProtectedRouteProps) {
    const auth = useAuth();
    const navigate = useNavigate();

    onMount(() => {
        if (auth.status() === "unauthenticated") {
            navigate("/login", { replace: true });
        }
    });

    return (
        <Show
            when={auth.status() === "authenticated"}
            fallback={<div>Loading or redirecting...</div>}>
            {props.children}
        </Show>
    );
}
