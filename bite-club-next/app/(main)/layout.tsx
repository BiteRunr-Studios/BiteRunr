import LayoutShell from "@/components/LayoutShell";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="p-4">
            <LayoutShell>{children}</LayoutShell>
        </main>
    );
}
