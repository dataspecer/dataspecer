// FROZEN: src-v2 should be merged back into src/.
// Do not implement new features into this package.
import { catalogItemRegistry } from "./core/catalog";
import {
  cmeProvidersRegistry,
  cmeListenersRegistry,
} from "./core/cme-provider";
import {
  entityViewDetailRegistry,
  entityViewPreviewRegistry,
} from "./core/entity-view";
import { headerRegionRegistry } from "./core/header";
import {
  createCmeEntityDataProvider,
  createJsonEntityDetailContribution,
} from "./features/entity-json-view";
import {
  createCmePackageProvider,
} from "./features/package-model";
import {
  PackageHeaderRegion,
} from "./features/visual-model/visual-model-header-region";
import {
  createCmeVocabularyProvider,
  createVocabularyCatalogItemSource,
} from "./features/vocabulary-model";
import {
  createCmeProfileProvider,
  createCmeProfileAggregateProvider,
} from "./features/profile-model";
import { createCmeVisualProvider } from "./features/visual-model";
// Application commands self-register on import.
import "./features/application/commands";
import { ApplicationHeaderActions } from "./features/application";

cmeProvidersRegistry.register({
  id: "cme-package-provider",
  createCmeProvider: createCmePackageProvider,
});

headerRegionRegistry.register({
  id: "cme-package-header-region",
  slot: "start",
  component: PackageHeaderRegion,
});

headerRegionRegistry.register({
  id: "application-header-actions",
  slot: "end",
  component: ApplicationHeaderActions,
});

cmeProvidersRegistry.register({
  id: "cme-vocabulary-provider",
  createCmeProvider: createCmeVocabularyProvider,
});

catalogItemRegistry.register({
  id: "vocabulary-catalog-item-source",
  createCatalogItemSource: createVocabularyCatalogItemSource,
});

cmeProvidersRegistry.register({
  id: "cme-profile-provider",
  createCmeProvider: createCmeProfileProvider,
});

cmeProvidersRegistry.register({
  id: "cme-profile-aggregate-provider",
  createCmeProvider: createCmeProfileAggregateProvider,
});

cmeProvidersRegistry.register({
  id: "cme-visual-provider",
  createCmeProvider: createCmeVisualProvider,
});

cmeProvidersRegistry.register({
  id: "cme-entity-data-provider",
  createCmeProvider: createCmeEntityDataProvider,
});

// Catch-all fallback: register any feature-specific EntityDetailContribution
// before this one so entityViewDetailRegistry.list() finds it first.
entityViewDetailRegistry.register(createJsonEntityDetailContribution());

// This is a little meta. Entity-view contributions need provider events even
// while unmounted, so we expose each entity-view registry as a listener source.
cmeListenersRegistry.register({
  id: "entity-view-detail",
  listCmeListener: () => entityViewDetailRegistry.list(),
});
cmeListenersRegistry.register({
  id: "entity-view-preview",
  listCmeListener: () => entityViewPreviewRegistry.list(),
});
