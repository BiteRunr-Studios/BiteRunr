export type FieldState = {
    label: string;
    value: string;
    error: string | null;
    touched: boolean;
    show?: boolean;
};

export type FormState = {
    firstName?: FieldState;
    lastName?: FieldState;
    email: FieldState;
    password: FieldState;
};

export function createFormHandlers(
    form: FormState,
    setForm: React.Dispatch<React.SetStateAction<FormState>>
) {
    function onChange<K extends keyof FormState>(key: K, value: string) {
        setForm((prev) => {
            const next = { ...prev };
            next[key] = {
                ...prev[key]!,
                value,
                // only validate once touched
                error: prev[key]!.touched
                    ? validateField(key, value, prev)
                    : prev[key]!.error,
            };
            return next;
        });
    }

    function onBlur<K extends keyof FormState>(key: K) {
        // mark touched and validate
        setForm((prev) => {
            const next = { ...prev };
            const field = prev[key];
            if (field) {
                next[key] = {
                    ...field,
                    touched: true,
                    error: validateField(key, field.value, prev),
                };
            }
            return next;
        });
    }

    return { onChange, onBlur };
}

export function validateField(
    key: keyof FormState,
    value: string,
    form: FormState
): string | null {
    const field = form[key];
    if (!field) return null;
    if (!value.trim()) return `${field.label} is required`;
    if (key === "email" && !validateEmail(value)) return "Email is invalid";
    return null;
}

export function validateEmail(email: string) {
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

    return emailRegex.test(email.trim());
}
