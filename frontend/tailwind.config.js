/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

const config = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
};

export default config;
