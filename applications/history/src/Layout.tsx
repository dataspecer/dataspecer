import { Outlet, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Breadcrumbs } from "@/components/breadcrumbs";
// import { SidebarNav } from "@/components/sidebar-nav";
import { GithubLink } from "@/components/github-link";
import { LanguageToggle } from "@/components/language-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import { ModelStoreProvider, useModelStore } from "@/contexts/model-store-context";
import { useProjectTitle } from "@/hooks/use-project-title";

const subPageLabelKeys: Record<string, string> = {
  "/evolution": "nav.evolution",
};

export function Layout() {
  const location = useLocation();
  const packageIri = (location.search as Record<string, unknown>).packageIri as string | undefined;

  return (
    <ModelStoreProvider packageIri={packageIri}>
      <LayoutContent />
    </ModelStoreProvider>
  );
}

function LayoutContent() {
  const { t } = useTranslation();
  const location = useLocation();
  const pathname = location.pathname;
  const packageIri = (location.search as Record<string, unknown>).packageIri as string | undefined;
  const searchString = new URLSearchParams(location.search as Record<string, string>).toString();
  const subPageLabelKey = subPageLabelKeys[pathname];
  const { isLoading } = useModelStore();
  const projectTitle = useProjectTitle(packageIri);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <strong>Dataspecer</strong> {t("app-name")}
          </div>
          <div className="flex gap-2">
            <GithubLink />
            <ModeToggle />
            <LanguageToggle />
          </div>
        </div>
      </header>
      <div className="container flex flex-col gap-1 pt-4">
        <Breadcrumbs
          items={[
            {
              label: projectTitle ?? packageIri ?? t("breadcrumbs.no-specification"),
              href: subPageLabelKey ? pathname + (searchString ? `?${searchString}` : "") : undefined,
            },
            ...(subPageLabelKey ? [{ label: t(subPageLabelKey) }] : []),
          ]}
        />
      </div>
      <main className="container flex flex-1 items-start gap-6 py-6">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          </div>
        ) : (
          <>
            {/* Side panel has a single entry for now, hidden until there is more than one sub-page. */}
            {/* <SidebarNav /> */}
            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
