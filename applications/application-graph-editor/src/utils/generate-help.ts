const STORAGE_KEY = "graph-editor.hide-generate-help";

/** True unless the user asked not to show the generate help again. */
export function shouldShowGenerateHelp(): boolean {
  return localStorage.getItem(STORAGE_KEY) === null;
}

export function hideGenerateHelp(): void {
  localStorage.setItem(STORAGE_KEY, "1");
}
