import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Header() {
    return (
        <header className="flex items-center justify-between border-b border-gray-300">
            <img className="w-22 h-11" src="/app-logo.svg" alt="Logo" />
            <Avatar className="h-12 w-12">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>BR</AvatarFallback>
            </Avatar>
        </header>
    );
}
