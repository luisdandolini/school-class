import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // O painel é servido em /admin (no Nginx e no dev).
  base: "/admin/",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": "http://localhost:3000" },
  },
});
