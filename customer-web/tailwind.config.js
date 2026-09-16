/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#1F4D2E",
        charcoal2: "#6e2e13",
        paper: "#939290",
        cream: "#FBF8F2",
        saffron: "#f79f1b",
        saffron2: "#ab670d",
        basil: "#2F5233",
        chili: "#C1443B",
        ink: "#2A2822",
        inkFaint: "#8A8578",
        line: "#E4DFD3",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
