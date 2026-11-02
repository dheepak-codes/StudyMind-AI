import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development, "/api/..." requests are forwarded to the FastAPI server,
// so the browser never has CORS problems while you code.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
});
