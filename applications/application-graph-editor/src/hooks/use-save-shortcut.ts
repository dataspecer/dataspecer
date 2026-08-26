import { useEffect } from 'react';

/**
 * Binds Ctrl/Cmd+S to an immediate save.
 */
export function useSaveShortcut(saveAction: () => Promise<void>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
        return;
      }
      event.preventDefault();
      void saveAction().catch((caught: unknown) => {
        console.error(caught);
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveAction]);
}
