/** Design tokens from the StudyMind palette. Use these names everywhere. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F8F9FC",
        surface: "#FFFFFF",
        ink: "#171923",
        muted: "#6B7280",
        line: "#E8EAF0",
        accent: "#635BFF",
        soft: "#F0EEFF",
        ok: "#16A36A",
        bad: "#D93C3C",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
