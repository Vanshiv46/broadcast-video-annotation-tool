/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12161c",
        panel: "#1a1f27",
        accent: "#4f8bff",
        accent2: "#ff6b4a",
      },
    },
  },
  plugins: [],
}
