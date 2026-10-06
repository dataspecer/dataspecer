import { Logger } from "../../infrastructure/logger";
import { ArrayChange, CmeProviderEvent } from "../cme-provider";
import { createRegistry } from "../shared/registry";
import { CatalogItem } from "./catalog-model";

export const catalogItemRegistry =
  createRegistry<CatalogItemContribution>();

/**
 * Contribute a source of items into the catalog component.
 */
export interface CatalogItemContribution {

  id: string;

  createCatalogItemSource: (context: { logger: Logger }) => CatalogItemSource;

}

export interface CatalogItemSource {

  /**
   * @returns Items to be part of the catalog.
   */
  onProviderDidChange(event: CmeProviderEvent): ArrayChange<CatalogItem>;

}
