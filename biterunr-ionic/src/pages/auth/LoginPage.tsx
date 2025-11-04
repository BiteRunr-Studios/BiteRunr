import { useEffect, useState } from "react";
import {
    IonButton,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonPage,
} from "@ionic/react";

import { supabase } from "../../supabaseClient";
import Input from "../../components/Input";

export function LoginPage() {
    // email field
    const [email, setEmail] = useState("");
    const [isEmailValid, setIsEmailValid] = useState<boolean>();
    const [isEmailTouched, setIsEmailTouched] = useState(false);
    const validateEmail = (value: string) =>
        value.match(
            /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        ) !== null;

    useEffect(() => {
        if (email === "") {
            setIsEmailValid(undefined);
        } else {
            setIsEmailValid(validateEmail(email));
        }
    }, [email]);

    // password field
    const [password, setPassword] = useState("");
    const [isPasswordValid, setIsPasswordValid] = useState<boolean>();
    const [isPasswordTouched, setIsPasswordTouched] = useState(false);
    const validatePassword = (value: string): boolean => {
        return value.trim().length > 0;
    };
    useEffect(() => {
        if (password === "") {
            setIsPasswordValid(undefined);
        } else {
            setIsPasswordValid(validatePassword(password));
        }
    }, [password]);

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsEmailValid(validateEmail(email));
        setIsPasswordValid(validatePassword(password));

        if (isEmailValid && isPasswordValid) console.log("valid fields");
        else console.error("Invalid Fields");
    };

    return (
        <IonPage>
            <IonContent>
                <form onSubmit={handleLogin}>
                    {/* <div className="mbsc-col-12 mbsc-col-md-6 mbsc-col-lg-3">
                        <Input
                            label="Town"
                            inputStyle="box"
                            labelStyle="floating"
                            placeholder="Enter your town"
                        />
                    </div> */}
                    <IonInput
                        className={`${isEmailValid && "ion-valid"} ${
                            isEmailValid === false && "ion-invalid"
                        } ${isEmailTouched && "ion-touched"}`}
                        label="Email"
                        fill="outline"
                        labelPlacement="floating"
                        // errorText="Invalid email"
                        value={email}
                        name="email"
                        onIonChange={(e) => setEmail(e.detail.value ?? "")}
                        onIonBlur={() => setIsEmailTouched(true)}
                    ></IonInput>
                    <IonInput
                        className={`${isPasswordValid && "ion-valid"} ${
                            isPasswordValid === false && "ion-invalid"
                        } ${isPasswordTouched && "ion-touched"}`}
                        label="Password"
                        fill="outline"
                        labelPlacement="floating"
                        // errorText="Invalid Password"
                        value={password}
                        name="password"
                        onIonChange={(e) => setPassword(e.detail.value ?? "")}
                        onIonBlur={() => setIsPasswordTouched(true)}
                        type="password"
                    ></IonInput>
                    <IonButton expand="block" type="submit">
                        Login
                    </IonButton>
                </form>
            </IonContent>
        </IonPage>
    );
}
