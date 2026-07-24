import { CircleAlert } from "lucide-react";

/** Inline error message shown when a fetch or action fails, so a failure is never silently swallowed into the console. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <CircleAlert className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
