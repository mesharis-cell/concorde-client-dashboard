import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#f5f7fb",
        panel: "#ffffff",
        ink: "#0f172a",
      },
    },
  },
  plugins: [],
} satisfies Config;
