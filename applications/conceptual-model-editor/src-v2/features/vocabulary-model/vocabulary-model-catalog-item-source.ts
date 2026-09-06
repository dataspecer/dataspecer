import { File, Tag } from "lucide-react";

import {
  CatalogItem, CatalogItemContribution, CatalogItemSource,
} from "../../core/catalog";
import { CatalogItemType } from "../../core/catalog/catalog-model";
import {
  ArrayChange, CmeListenerSource, noChangeArray,
} from "../../core/cme-provider";
import {
  CmeVocabularyClass, CmeVocabularyGeneralization, CmeVocabularyRelation,
} from "./cme-vocabulary-model";
import {
  CmeVocabularyChangeEvent,
  CmeVocabularyStateEvent,
  isCmeVocabularyChangeEvent,
  isCmeVocabularyStateEvent,
} from "./cme-vocabulary-provider";
import { Registry } from "../../core/shared/registry";

export function registerVocabularyCatalogItemSource(
  catalogItemRegistry: Registry<CatalogItemContribution>,
  cmeListenersRegistry: Registry<CmeListenerSource>,
) {
  catalogItemRegistry.register({
    id: "vocabulary-catalog-item-source",
    createCatalogItemSource: createVocabularyCatalogItemSource,
  });

}

export function createVocabularyCatalogItemSource(): CatalogItemSource {
  return {
    onProviderDidChange(event) {
      if (isCmeVocabularyChangeEvent(event)) {
        return onCmeVocabularyChangeEvent(event)
      }
      if (isCmeVocabularyStateEvent(event)) {
        return onCmeVocabularyStateEvent(event)
      }
      return noChangeArray;
    },
  };
}

/**
 * A state event carries the full current vocabulary. We emit every item as
 * "created"; the catalog deduplicates by identifier, so replaying this event
 * onto a late-mounted catalog rebuilds the list without duplicating rows.
 */
function onCmeVocabularyStateEvent(
  event: CmeVocabularyStateEvent,
): ArrayChange<CatalogItem> {
  const created: CatalogItem[] = [
    ...event.classes.map(createClassCatalogItem),
    ...event.relationships.map(createRelationshipCatalogItem),
    ...event.generalizations.map(createGeneralizationCatalogItem),
  ];
  return { created, changed: [], removed: [] };
}

function onCmeVocabularyChangeEvent(
  event: CmeVocabularyChangeEvent,
): ArrayChange<CatalogItem> {
  // Created
  const created: CatalogItem[] = [
    ...event.classes.created.map(createClassCatalogItem),
    ...event.relationships.created.map(createRelationshipCatalogItem),
    ...event.generalizations.created.map(createGeneralizationCatalogItem),
  ];
  // Changed
  const changed: CatalogItem[] = [
    ...event.classes.changed.map(createClassCatalogItem),
    ...event.relationships.changed.map(createRelationshipCatalogItem),
    ...event.generalizations.changed.map(createGeneralizationCatalogItem),
  ];
  // Removed
  const removed: string[] = [
    ...event.classes.removed,
    ...event.relationships.removed,
    ...event.generalizations.removed,
  ];
  return { created, changed, removed };
}

function createClassCatalogItem(
  value: CmeVocabularyClass,
): CatalogItem {
  const entity = value.entity;
  return {
    identifier: value.id,
    model: value.model,
    type: VocabularyClassCatalogItemType,
    entityIdentifier: entity.id,
    iri: entity.iri,
    label: entity.name,
  }
}

const VocabularyClassCatalogItemType: CatalogItemType = {
  identifier: "vocabulary-class",
  icon: File,
  iconColor: "#f2b84b",
  actions: [],
};

function createRelationshipCatalogItem(
  value: CmeVocabularyRelation,
): CatalogItem {
  const entity = value.entity;
  const range = value.rangeEnd;
  return {
    identifier: value.id,
    model: value.model,
    type: VocabularyRelationshipCatalogItemType,
    entityIdentifier: entity.id,
    iri: range?.iri ?? null,
    label: range?.name ?? {},
  }
}

const VocabularyRelationshipCatalogItemType: CatalogItemType = {
  identifier: "vocabulary-relationship",
  icon: Tag,
  iconColor: "#60a5fa",
  actions: [],
};

function createGeneralizationCatalogItem(
  value: CmeVocabularyGeneralization,
): CatalogItem {
  const entity = value.entity;
  return {
    identifier: value.id,
    model: value.model,
    type: VocabularyGeneralizationCatalogItemType,
    entityIdentifier: entity.id,
    iri: entity.iri,
    label: {},
  }
}

const VocabularyGeneralizationCatalogItemType: CatalogItemType = {
  identifier: "vocabulary-generalization",
  icon: File,
  iconColor: "#c084fc",
  actions: [],
};
