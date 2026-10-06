import { type CSSProperties, useState } from "react";
import { getTagHue } from "@/lib/tag-color";
import { cn } from "@/lib/utils";
import { badgeVariants } from "./ui/badge";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Trans, useTranslation } from "react-i18next";
import type { ClassValue } from "clsx";

/** Displays a tag with theme-aware colors derived from its name. */
export function TagBadge({ name, onClick, onRemove }: { name: string; onClick?: () => void; onRemove?: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { t } = useTranslation();
  const classes = cn(
    badgeVariants({ variant: "outline" }),
    "tag-color inline-flex items-center gap-1 border-transparent bg-[var(--tag-background)] text-[var(--tag-foreground)]",
    onClick && "hover:brightness-110",
  );
  return (
    <span className="inline-flex" style={{ "--tag-hue": getTagHue(name) } as CSSProperties}>
      <span className={classes}>
        {onClick ? (
          <button type="button" onClick={onClick} className="cursor-pointer">
            {name}
          </button>
        ) : (
          <span>{name}</span>
        )}
        {onRemove && (
          <Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("remove-tag", { tag: name })}
                onClick={(event) => event.stopPropagation()}
                className="-mr-2 inline-flex size-4 items-center justify-center rounded-full text-(--tag-foreground) hover:bg-black/10"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" onClick={(event) => event.stopPropagation()}>
              <p className="text-sm">
                <Trans
                  i18nKey="confirm-remove-tag"
                  values={{ tag: name }}
                  components={{ tag: <strong className="tag-color font-semibold text-[var(--tag-foreground)]" style={{ "--tag-hue": getTagHue(name) } as CSSProperties} /> }}
                />
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>
                  {t("rename-resource.cancel")}
                </Button>
                <Button
                  size="sm"
                  autoFocus
                  variant="destructive"
                  onClick={() => {
                    onRemove();
                    setConfirmOpen(false);
                  }}
                >
                  {t("remove")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </span>
    </span>
  );
}

/** Displays a tag name with its matching color indicator. */
export function TagName({ name, className }: { name: string; className?: ClassValue }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 align-bottom", className)}>
      <span aria-hidden="true" className="tag-color size-2 shrink-0 rounded-full bg-[var(--tag-dot)]" style={{ "--tag-hue": getTagHue(name) } as CSSProperties} />
      <span className="truncate">{name}</span>
    </span>
  );
}
