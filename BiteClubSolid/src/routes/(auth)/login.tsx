import { useAuth } from "@solid-mediakit/auth/client";
import { onMount } from "solid-js";
import { Meta } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";

export default function Home() {
    const auth = useAuth();
    const navigate = useNavigate();

    onMount(() => {
        if (auth.status() === "authenticated") {
            navigate("/", { replace: true });
        }
    });

    return (
        <>
            <Meta name="theme-color" content="#ff8904" id="theme-color-meta" />
            <main class="h-full">
                <img class="-mt-1" src="signUpIcon.png" />
                <div class="flex flex-col items-center justify-center gap-4">
                    <h2 class="text-xl mt-2">Login</h2>
                    <button
                        onClick={() =>
                            auth.signIn("github", { redirectTo: "/" })
                        }
                        class="btn btn-primary">
                        Sign in
                    </button>
                </div>
            </main>
        </>
    );
}
