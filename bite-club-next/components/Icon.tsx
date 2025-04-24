import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import React from "react";

type LucideIconComponent = React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

const iconNames = Object.keys(Icons).filter((key) => {
    const icon = Icons[key as keyof typeof Icons];
    return (
        (typeof icon === "object" || typeof icon === "function") &&
        "displayName" in icon
    );
}) as Array<keyof typeof Icons>;

type IconName = (typeof iconNames)[number];

interface LucideIconProps extends LucideProps {
    name: IconName;
}

const Icon: React.FC<LucideIconProps> = ({ name, ...rest }) => {
    const IconComponent = Icons[name] as LucideIconComponent | undefined;
    if (!IconComponent) return null;
    return <IconComponent {...rest} />;
};

export default Icon;
