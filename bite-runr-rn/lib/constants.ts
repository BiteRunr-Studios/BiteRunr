import tokens from "@/tokens.json";

const hsl = (value: string) => `hsl(${value})`;

export const NAV_THEME = {
    light: {
        primary: hsl(tokens.lightVars.primary),
        background: hsl(tokens.lightVars.background),
        card: hsl(tokens.lightVars.card),
        text: hsl(tokens.lightVars.foreground),
        border: hsl(tokens.lightVars.border),
        notification: hsl(tokens.lightVars.destructive),
    },
    dark: {
        primary: hsl(tokens.darkVars.primary),
        background: hsl(tokens.darkVars.background),
        card: hsl(tokens.darkVars.card),
        text: hsl(tokens.darkVars.foreground),
        border: hsl(tokens.darkVars.border),
        notification: hsl(tokens.darkVars.destructive),
    },
};
