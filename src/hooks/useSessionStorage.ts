import { useState, useCallback } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      try {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (e) {
        console.warn(`Failed to save ${key} to sessionStorage`, e);
      }
      return valueToStore;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      window.sessionStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (e) {
      console.warn(`Failed to remove ${key} from sessionStorage`, e);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
