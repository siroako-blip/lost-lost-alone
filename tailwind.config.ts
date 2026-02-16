import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        card: {
          red: "#c53030",
          green: "#276749",
          blue: "#2b6cb0",
          white: "#4a5568",
          yellow: "#b7791f",
        },
      },
      boxShadow: {
        "card-select": "0 8px 20px -4px rgba(0,0,0,0.25), 0 0 0 2px rgba(59, 130, 246, 0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
