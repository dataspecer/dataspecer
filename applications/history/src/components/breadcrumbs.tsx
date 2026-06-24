import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Breadcrumb trail for the currently open specification. The specification
 * name is shown as-is (the package iri taken from the URL) since no backend
 * lookup is implemented yet.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useTranslation();

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-hidden">
      <a href={import.meta.env.VITE_MANAGER_URL ?? "/"} className="hover:text-foreground shrink-0">
        {t("breadcrumbs.home")}
      </a>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={index}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {item.href && !isLast ? (
              <a href={item.href} className="hover:text-foreground truncate">
                {item.label}
              </a>
            ) : (
              <span className={cn("truncate", isLast && "text-foreground font-medium")}>
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
