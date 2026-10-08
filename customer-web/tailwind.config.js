/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#1C1B19",
        charcoal2: "#26241F",
        paper: "#F7F5F1",
        cream: "#FBF8F2",
        saffron: "#E8A33D",
        saffron2: "#C97F1F",
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
