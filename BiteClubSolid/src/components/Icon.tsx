import { icons, type LucideProps } from "lucide-solid";
import { splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

interface IconProps extends LucideProps {
    name: keyof typeof icons;
}

const Icon = (props: IconProps) => {
    const [local, others] = splitProps(props, ["name"]);

    return <Dynamic component={icons[local.name]} {...others} />;
};

export default Icon;
