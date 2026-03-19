/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171a20",
        mint: "#8a7753",
        sand: "#d4cec2",
        sky: "#e3ddd1",
      },
      boxShadow: {
        card: "0 8px 26px rgba(10, 12, 16, 0.22)",
      },
    },
  },
  plugins: [],
};
