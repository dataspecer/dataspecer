import { Logger } from "../../infrastructure/logger";
import { ArrayChange } from "../cme-provider";
import { createRegistry } from "../shared/registry";
import { CatalogItem } from "./catalog-model";

export const catalogItemRegistry =
  createRegistry<CatalogItemContribution>();

export interface CatalogItemContribution {

  id: string;

  createCatalogItemSource: (context: { logger: Logger }) => CatalogItemSource;

}

export interface CatalogItemSource {

  /**
   * Called when there is change in a provider.
   * Return a list of entities to show in the catalog.
   */
  onProviderDidChange(event: { type: string }): ArrayChange<CatalogItem>;

}
