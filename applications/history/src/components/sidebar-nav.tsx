import { GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Sub-pages of the history application. Evolution is the only one implemented
 * so far; further sub-pages (e.g. for reviewing already applied changes) can
 * be added to this list.
 */
const subPages = [
  { to: "/evolution", labelKey: "nav.evolution", icon: GitBranch },
];

export function SidebarNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <nav className="w-56 shrink-0 space-y-1">
      {subPages.map(({ to, labelKey, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          search={(prev: Record<string, unknown>) => prev}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            pathname === to && "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
