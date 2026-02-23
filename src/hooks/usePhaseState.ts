import { useState, useEffect, useCallback } from "react";
import { subscribeToFileChanges } from "./useWebSocket";
import type { PhaseName, PhaseState } from "../types";

interface UsePhaseStateResult {
  data: PhaseState | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseContentResult {
  content: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches phase state from REST API and auto-refetches
 * when the server broadcasts a file_changed event for that phase.
 */
export function usePhaseState(phase: PhaseName): UsePhaseStateResult {
  const [data, setData] = useState<PhaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phase/${phase}/state`);
      if (!res.ok) {
        if (res.status === 404) {
          setData(null);
          return;
        }
        // Extract the actual error message from the response body
        let errMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error) errMsg = body.error;
        } catch {
          // ignore parse failure, use default message
        }
        throw new Error(errMsg);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [phase]);

  // Fetch on mount and when phase changes
  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Re-fetch when file_changed fires for this phase
  useEffect(() => {
    return subscribeToFileChanges((changedPhase) => {
      if (changedPhase === phase) {
        fetchState();
      }
    });
  }, [phase, fetchState]);

  return { data, loading, error, refetch: fetchState };
}

/**
 * Fetches meta.json and auto-refetches on changes.
 */
export function useMeta() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/meta");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent — meta will be set via appStore on project open
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    return subscribeToFileChanges((phase) => {
      if (phase === "meta") {
        fetchMeta();
      }
    });
  }, [fetchMeta]);

  return { data, loading, refetch: fetchMeta };
}

/**
 * Fetches a phase's artifact markdown and auto-refetches on file changes.
 */
export function useArtifact(phase: PhaseName): UseContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArtifact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phase/${phase}/artifact`);
      if (!res.ok) {
        if (res.status === 404) {
          setContent(null);
          return;
        }
        let errMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error) errMsg = body.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }
      const json = await res.json();
      setContent(json.content ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [phase]);

  useEffect(() => {
    fetchArtifact();
  }, [fetchArtifact]);

  useEffect(() => {
    return subscribeToFileChanges((changedPhase) => {
      if (changedPhase === phase || changedPhase === "artifacts") {
        fetchArtifact();
      }
    });
  }, [phase, fetchArtifact]);

  return { content, loading, error };
}

/**
 * Fetches a phase's review report markdown and auto-refetches on file changes.
 */
export function useReview(phase: PhaseName): UseContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phase/${phase}/review`);
      if (!res.ok) {
        if (res.status === 404) {
          setContent(null);
          return;
        }
        let errMsg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body.error) errMsg = body.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }
      const json = await res.json();
      setContent(json.content ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [phase]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  useEffect(() => {
    return subscribeToFileChanges((changedPhase) => {
      if (changedPhase === phase) {
        fetchReview();
      }
    });
  }, [phase, fetchReview]);

  return { content, loading, error };
}
