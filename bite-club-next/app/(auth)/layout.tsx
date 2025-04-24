export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <main className="p-4">{children}</main>;
}
