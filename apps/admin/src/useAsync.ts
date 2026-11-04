import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "./api";

/**
 * Carrega dados de uma função assíncrona, com estado de carregando/erro e recarga.
 * `refreshMs`: recarrega sozinho nesse intervalo (ex.: lista de quem está online).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[], refreshMs?: number) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await run());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!refreshMs) return;
    // Recarga silenciosa (sem "Carregando..."), só quando a aba está visível.
    const id = setInterval(() => {
      if (document.visibilityState === "visible") run().then(setData, () => undefined);
    }, refreshMs);
    return () => clearInterval(id);
  }, [run, refreshMs]);

  return { data, error, loading, reload };
}
