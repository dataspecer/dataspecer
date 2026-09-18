import { type CSSProperties } from "react";
import { getTagHue } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import { Badge, badgeVariants } from "./ui/badge";

/** Displays a tag with theme-aware colors derived from its name. */
export function TagBadge({ name, onClick }: { name: string, onClick?: () => void }) {
  if (onClick) {
    return <button type="button" onClick={onClick}
      className={cn(badgeVariants({ variant: "outline" }), "tag-color cursor-pointer border-transparent bg-[var(--tag-background)] text-[var(--tag-foreground)] hover:brightness-110")}
      style={{ "--tag-hue": getTagHue(name) } as CSSProperties}>{name}</button>;
  }
  return <Badge variant="outline" className="tag-color border-transparent bg-[var(--tag-background)] text-[var(--tag-foreground)]"
    style={{ "--tag-hue": getTagHue(name) } as CSSProperties}>{name}</Badge>;
}

/** Displays a tag name with its matching color indicator. */
export function TagName({ name }: { name: string }) {
  return <span className="inline-flex min-w-0 items-center gap-2">
    <span aria-hidden="true" className="tag-color size-2 shrink-0 rounded-full bg-[var(--tag-dot)]"
      style={{ "--tag-hue": getTagHue(name) } as CSSProperties} />
    <span className="truncate">{name}</span>
  </span>;
}
