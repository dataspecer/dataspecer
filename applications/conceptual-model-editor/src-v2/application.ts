// This is the composition root.
// This is the ONLY file allowed to import feature modules directly,
// purely to trigger their registration into the core registries.
import { catalogItemRegistry } from "./core/catalog";
import { cmeProvidersRegistry } from "./core/cme-provider";
import { headerRegionRegistry } from "./core/header";
import {
  createCmePackageProvider,
} from "./features/package-model";
import {
  PackageHeaderRegion,
} from "./features/package-model/package-header-region";
import {
  createCmeVocabularyProvider,
  createVocabularyCatalogItemSource,
} from "./features/vocabulary-model";

cmeProvidersRegistry.register({
  id: "cme-package-provider",
  create: createCmePackageProvider,
});

headerRegionRegistry.register({
  id: "cme-package-header-region",
  component: PackageHeaderRegion,
});

cmeProvidersRegistry.register({
  id: "cme-vocabulary-provider",
  create: createCmeVocabularyProvider,
});

catalogItemRegistry.register({
  id: "vocabulary-catalog-item-source",
  createCatalogItemSource: createVocabularyCatalogItemSource,
});
