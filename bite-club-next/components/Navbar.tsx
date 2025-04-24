"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import Icon from "./Icon";

interface NavItem {
    icon: React.ReactNode;
    label: string;
    href: string;
}

export default function Navbar() {
    const pathname = usePathname();

    const navItems: NavItem[] = [
        {
            icon: <Icon name="Home" />,
            label: "Home",
            href: "/",
        },
        {
            icon: <Icon name="CirclePlus" />,
            label: "Add",
            href: "/order",
        },
        {
            icon: <Icon name="UsersRound" />,
            label: "Friends",
            href: "/friends",
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full border-t border-gray-300 bg-background">
            <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
                {navItems.map((item) => {
                    // Check if the current path matches the item's href
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);

                    return (
                        <NavButton
                            key={item.label.toLowerCase()}
                            item={item}
                            isActive={isActive}
                        />
                    );
                })}
            </div>
        </div>
    );
}

interface NavButtonProps {
    item: NavItem;
    isActive: boolean;
}

function NavButton({ item, isActive }: NavButtonProps) {
    return (
        <Link
            href={item.href}
            className="flex flex-col items-center justify-center">
            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md",
                    isActive ? "text-primary" : "text-muted-foreground"
                )}>
                {item.icon}
            </div>
            <span
                className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                )}>
                {item.label}
            </span>
        </Link>
    );
}
