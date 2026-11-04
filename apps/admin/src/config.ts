/**
 * Endereço do jogo. Em produção o jogo e o painel estão no mesmo endereço
 * (o jogo em "/", o painel em "/admin"). Em desenvolvimento, o jogo roda na porta 5173.
 */
export const GAME_URL = import.meta.env.DEV ? "http://localhost:5173/" : `${window.location.origin}/`;
