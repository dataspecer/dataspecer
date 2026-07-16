import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { Layout } from "./Layout";
import { EvolutionPage } from "./pages/evolution/evolution-page";
import { EvolutionOverviewPage } from "./pages/evolution/overview-page";

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/evolution", search: true });
  },
});

const evolutionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/evolution",
  component: EvolutionOverviewPage,
});

const evolutionReviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/evolution/review",
  component: EvolutionPage,
});

const routeTree = rootRoute.addChildren([indexRoute, evolutionRoute, evolutionReviewRoute]);

export const router = createRouter({
  routeTree,
  basepath: import.meta.env.VITE_BASE_PATH || "/",
});
