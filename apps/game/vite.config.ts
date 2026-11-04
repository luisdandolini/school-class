import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // Falha com aviso se a porta estiver ocupada (em vez de trocar de porta em silêncio).
    strictPort: true,
    port: 5173,
    // Em dev, /api vai para o backend local (em produção quem faz isso é o Nginx).
    proxy: { "/api": "http://localhost:3000" },
  },
  build: {
    // main.ts usa await no nível do módulo (checa a sessão antes de iniciar o jogo).
    target: "es2022",
    // Phaser é grande; evita o aviso de chunk acima de 500 kB.
    chunkSizeWarningLimit: 2000,
  },
});
