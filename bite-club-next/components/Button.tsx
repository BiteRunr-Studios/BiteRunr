import * as Icons from "lucide-react";
import Icon from "./Icon";
import { ButtonHTMLAttributes } from "react";

const iconNames = Object.keys(Icons).filter((key) => {
    const icon = Icons[key as keyof typeof Icons];
    return (
        (typeof icon === "object" || typeof icon === "function") &&
        "displayName" in icon
    );
}) as Array<keyof typeof Icons>;

type IconName = (typeof iconNames)[number];

type Props = {
    label: string;
    lucideIconName?: IconName;
    isDisabled?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
    label,
    lucideIconName,
    isDisabled = false,
    ...rest
}: Props) {
    return (
        <button className={`btn ${rest.className}`} disabled={isDisabled}>
            {lucideIconName ?? <Icon name={lucideIconName!} />}
            {label}
        </button>
    );
}
