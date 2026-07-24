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
    <nav style={{scrollbarWidth: "none"}} className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap text-sm text-muted-foreground">
      <a href={import.meta.env.VITE_MANAGER_URL ?? "/"} className="hover:text-foreground shrink-0">
        {t("breadcrumbs.home")}
      </a>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={index}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            {item.href && !isLast ? (
              <a href={item.href} className="hover:text-foreground shrink-0">
                {item.label}
              </a>
            ) : (
              <span className={cn("shrink-0", isLast && "text-foreground font-medium")}>
                {item.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
