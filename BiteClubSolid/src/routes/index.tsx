import ProtectedRoute from "~/components/ProtectedRoute";

export default function Home() {
    return (
        <ProtectedRoute>
            <main class="h-full">test</main>
        </ProtectedRoute>
    );
}
