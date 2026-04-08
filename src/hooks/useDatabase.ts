import { useState, useEffect } from "react";
import { getDb } from "@/lib/db";

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await getDb();
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to connect to database"
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isReady, error };
}
