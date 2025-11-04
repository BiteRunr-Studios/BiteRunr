import { IonIcon } from "@ionic/react";
import { personCircleOutline } from "ionicons/icons";

const Input = () => {
    return (
        <div>
            <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-600"
            >
                Email address
            </label>
            <div className="mt-1">
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="Your Email"
                    className="block w-full px-5 py-3 text-base placeholder-gray-300 transition duration-500 ease-in-out transform border rounded-lg text-gray-600 bg-gray-50/5 focus:outline-none border-gray-200 focus:border-transparent focus:ring-2 focus:ring-white/5 focus:ring-offset-2 focus:ring-offset-gray-300"
                />
            </div>
        </div>
    );
};

export default Input;
