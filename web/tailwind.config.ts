// tailwind.config.js (or .ts)

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- This line tells Tailwind to scan your source files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
