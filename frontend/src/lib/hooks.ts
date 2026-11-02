import { useCallback, useEffect, useState } from "react";

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Loads data when a page opens and exposes loading / error / reload states. */
export function useLoad<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fn().then(setData).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);
  return { data, setData, error, loading, reload: load };
}
