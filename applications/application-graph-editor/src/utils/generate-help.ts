const STORAGE_KEY = 'graph-editor.hide-generate-help';

/** Returns true unless the user asked not to show the generate help again. */
export function shouldShowGenerateHelp(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return true;
  }
}

export function hideGenerateHelp(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    return;
  }
}
