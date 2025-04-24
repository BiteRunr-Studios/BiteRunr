import Header from "./Header";
import Navbar from "./Navbar";

export default function LayoutShell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Header />
            <main className="p-4">{children}</main>
            <Navbar />
        </>
    );
}
