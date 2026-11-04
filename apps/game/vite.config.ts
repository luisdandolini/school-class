import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    // Em dev, /api vai para o backend local (em produção quem faz isso é o Nginx).
    proxy: { "/api": "http://localhost:3000" },
  },
  build: {
    // Phaser é grande; evita o aviso de chunk acima de 500 kB.
    chunkSizeWarningLimit: 2000,
  },
});
