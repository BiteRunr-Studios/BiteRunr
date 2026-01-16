import Icon, { IconName } from "../common/icon";

export const TabBarIcon = (props: { name: IconName; color: string }) => {
    return <Icon name={props.name} size={24} color={props.color} />;
};
