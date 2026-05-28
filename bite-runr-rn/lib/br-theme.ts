export const BR = {
  orange: "#FF6A1F",
  orangeDeep: "#E8551A",
  orangeSoft: "#FFE7D4",
  orangeTint: "#FFF1E2",

  paper: "#FFF7EE",
  paper2: "#FCEFE0",
  card: "#FFFFFF",
  ink: "#1A1410",
  ink2: "#4A3C32",
  ink3: "#8A7A6E",
  line: "rgba(26, 20, 16, 0.08)",
  line2: "rgba(26, 20, 16, 0.14)",

  mint: "#2EBE7B",
  mintSoft: "#DDF5E8",
  mintInk: "#1B6B43",
  lilac: "#6E5BFF",
  lilacSoft: "#E6E2FF",
  lilacInk: "#3A2DC2",
  coral: "#FF4D6D",
  coralSoft: "#FFE0E6",
  coralInk: "#B82340",
  yolk: "#FFC542",
  yolkSoft: "#FFF1C4",
} as const;

export const BR_RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

export const BR_FONT = {
  display: "BricolageGrotesque_700Bold",
  displayMedium: "BricolageGrotesque_500Medium",
  displaySemibold: "BricolageGrotesque_600SemiBold",
  displayExtraBold: "BricolageGrotesque_800ExtraBold",
  mono: "JetBrainsMono_500Medium",
  monoSemibold: "JetBrainsMono_600SemiBold",
  monoBold: "JetBrainsMono_700Bold",
} as const;

/**
 * `style` presets for Text / TextInput with NativeWind className.
 * Use these instead of Tailwind `font-bold` / `font-semibold` — RN ignores
 * custom fontFamily when fontWeight is set separately.
 */
export const BR_FONT_STYLE = {
  display: { fontFamily: BR_FONT.display },
  displayMedium: { fontFamily: BR_FONT.displayMedium },
  displaySemibold: { fontFamily: BR_FONT.displaySemibold },
  displayExtraBold: { fontFamily: BR_FONT.displayExtraBold },
  mono: { fontFamily: BR_FONT.mono },
  monoSemibold: { fontFamily: BR_FONT.monoSemibold },
  monoBold: { fontFamily: BR_FONT.monoBold },
} as const;

export const BR_SHADOW = {
  card: {
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 3,
  },
  pop: {
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
  primary: {
    shadowColor: "#FF6A1F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  mint: {
    shadowColor: "#2EBE7B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

const palette: [string, string][] = [
  [BR.orangeSoft, "#B85A1F"],
  [BR.lilacSoft, BR.lilacInk],
  [BR.mintSoft, BR.mintInk],
  [BR.coralSoft, BR.coralInk],
  [BR.paper2, "#7A4A20"],
];

export function avatarColors(name: string): { bg: string; fg: string } {
  const idx = (name.charCodeAt(0) || 0) % palette.length;
  const [bg, fg] = palette[idx];
  return { bg, fg };
}
