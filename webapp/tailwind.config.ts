import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        celo: { green: "#35D07F", gold: "#FBCC5C", dark: "#2E3338" },
      },
    },
  },
  plugins: [],
};
export default config;
