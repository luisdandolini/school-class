import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // O painel é servido em /admin (no Nginx e no dev).
  base: "/admin/",
  plugins: [react()],
  server: {
    // Falha com aviso se a porta estiver ocupada (em vez de trocar de porta em silêncio).
    strictPort: true,
    port: 5174,
    proxy: { "/api": "http://localhost:3000" },
  },
});
