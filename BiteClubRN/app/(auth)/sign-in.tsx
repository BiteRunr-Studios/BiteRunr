import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

export default function Page() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");

    // Handle the submission of the sign-in form
    const onSignInPress = async () => {
        if (!isLoaded) {
            console.log("Sign in attempted before Clerk was loaded");
            return;
        }

        // Start the sign-in process using the email and password provided
        try {
            const signInAttempt = await signIn.create({
                identifier: emailAddress,
                password,
            });

            // If sign-in process is complete, set the created session as active
            // and redirect the user
            if (signInAttempt.status === "complete") {
                await setActive({ session: signInAttempt.createdSessionId });
                router.replace("/");
            } else {
                // If the status isn't complete, check why. User might need to
                // complete further steps.
                console.error(JSON.stringify(signInAttempt, null, 2));
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2));
        }
    };

    return (
        <View>
            <View style={styles.container}>
                <Image
                    style={styles.image}
                    source={require("@/assets/signUpIcon.png")}
                />
            </View>
            <Text style={styles.title}>Sign in</Text>
            <TextInput
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Enter email"
                onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
            />
            <TextInput
                value={password}
                placeholder="Enter password"
                secureTextEntry={true}
                onChangeText={(password) => setPassword(password)}
            />
            <TouchableOpacity onPress={onSignInPress}>
                <Text>Continue</Text>
            </TouchableOpacity>
            <View style={{ display: "flex", flexDirection: "row", gap: 3 }}>
                <Text>Don't have an account?</Text>
                <Link href="/sign-up">
                    <Text>Sign up</Text>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    image: {
        width: "100%",
        height: 350,
        resizeMode: "cover",
    },
    title: {
        width: "100%",
        textAlign: "center",
        paddingVertical: 12,
        fontSize: 22,
    },
});
