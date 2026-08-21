import {
  CaseSensitive, CheckSquare, ChevronDown, ChevronRight, Copy, LucideIcon,
  MoreHorizontal, Search, File, Tag, WholeWord, X,
} from "lucide-react";

import { CatalogItem, CatalogItemSource } from "../../core/catalog";
import { CatalogItemType } from "../../core/catalog/catalog-model";
import { ArrayChange, noChangeArray } from "../../core/cme-provider";
import {
  CmeVocabularyClass, CmeVocabularyGeneralization, CmeVocabularyRelation,
} from "./cme-vocabulary-model";
import {
  CmeVocabularyChangeEvent,
  isCmeVocabularyChangeEvent,
} from "./cme-vocabulary-provider";

export function createVocabularyCatalogItemSource(): CatalogItemSource {
  return {
    onProviderDidChange(event) {
      if (isCmeVocabularyChangeEvent(event)) {
        return onCmeVocabularyChangeEvent(event)
      }
      return noChangeArray;
    },
  };
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

const VocabularyClassCatalogItemType : CatalogItemType = {
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

const VocabularyRelationshipCatalogItemType : CatalogItemType = {
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

const VocabularyGeneralizationCatalogItemType : CatalogItemType = {
  identifier: "vocabulary-generalization",
  icon: File,
  iconColor: "#c084fc",
  actions: [],
};
