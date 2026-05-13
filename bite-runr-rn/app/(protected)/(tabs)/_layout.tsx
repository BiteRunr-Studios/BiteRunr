import {
  NativeTabs,
  Label,
  Icon,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
  return (
    <NativeTabs
      tintColor="#FF8800"
      backgroundColor="transparent"
      indicatorColor="transparent"
      rippleColor="transparent"
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon
          sf="house.fill"
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="groups">
        <Label>Runs</Label>
        <Icon
          sf="bag.fill"
          androidSrc={<VectorIcon family={Ionicons} name="bag-handle" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Label>Account</Label>
        <Icon
          sf="person.fill"
          androidSrc={<VectorIcon family={Ionicons} name="person" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
