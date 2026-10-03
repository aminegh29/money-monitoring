import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

/** Reads an object passed to a form route as JSON, e.g. router.push({ pathname, params: { expense: JSON.stringify(e) } }). */
export function useJsonParam<T>(name: string): T | null {
  const params = useLocalSearchParams<Record<string, string>>();
  const raw = params[name];
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }, [raw]);
}
