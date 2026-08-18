import { EntityIdentifier } from "@dataspecer/core/entity-model";
import { ModelIdentifier } from "@dataspecer/core/model";
import { LanguageString } from "../../shared/types";
import { LucideIcon } from "lucide-react";

export interface CatalogItem {

  identifier: string;

  /**
   * Entity identifier may not be uniq as entities in Dataspecer do not
   * have a uniq identifier.
   */
  entityIdentifier: EntityIdentifier;

  /**
   * Model this entity comes from.
   */
  model: ModelIdentifier;

  /**
   * Catalog item type.
   */
  type: CatalogItemType;

  /**
   * IRI of the represented item if any.
   */
  iri: string | null;

  /**
   * Label to show to the user.
   */
  label: LanguageString;

}

/**
 * Represents a shared information about particular item type.
 */
export interface CatalogItemType {

  identifier: string;

  icon: LucideIcon;

  iconColor: string;

  actions: CatalogItemAction[];

}

export interface CatalogItemAction {

  identifier: string;

  icon: LucideIcon;

  iconColor: string;

  label: LanguageString;

}
