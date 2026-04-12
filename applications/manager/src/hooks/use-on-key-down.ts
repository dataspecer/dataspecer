import { useEffect, useRef } from "react";

export function useOnKeyDown(handler: (event: KeyboardEvent) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const handler = (event: KeyboardEvent) => ref.current(event);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);
}
