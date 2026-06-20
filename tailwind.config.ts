import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette extracted from the reference image (Kombo Warna)
        bg: "#ECEBE6",        // warm off-white background
        surface: "#E3E1D9",   // slightly darker secondary surface
        ink: "#2B2B2E",       // near-black charcoal — primary text + structure
        gold: "#A07E4A",      // tan / gold accent
        "gold-dark": "#7A5E33",
        "ink-soft": "#54524F", // muted body text
        line: "#D4D1C8",      // hairline borders
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        shell: "1240px",
      },
      zIndex: {
        nav: "50",
        overlay: "40",
        base: "10",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
