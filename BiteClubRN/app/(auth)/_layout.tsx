import { Redirect, Slot } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthRoutesLayout() {
    const { isSignedIn } = useAuth();

    if (isSignedIn) {
        return <Redirect href={"/"} />;
    }

    return (
        <SafeAreaView>
            <Slot />
        </SafeAreaView>
    );
}
