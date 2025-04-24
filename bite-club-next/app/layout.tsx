import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "BiteRunr",
    description: "BiteRunr",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <meta name="theme-color" content="#ffffff" />
            </head>
            <body className="antialiased">{children}</body>
        </html>
    );
}
