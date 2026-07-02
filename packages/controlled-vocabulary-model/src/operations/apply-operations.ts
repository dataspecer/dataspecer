import { type EntityRecord, type EntityChange, diffEntities, generateEntityId } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import type { ControlledVocabulary } from "../concepts/controlled-vocabulary.ts";
import {
  DEFAULT_CONTROLLED_VOCABULARY,
  isCreateVocabularyOperation,
  isDeleteVocabularyOperation,
  isModifyVocabularyOperation,
  type VocabularyOperation,
} from "./operations.ts";

export function applyOperations(
  model: EntityRecord<ControlledVocabulary>,
  operations: VocabularyOperation[]
): EntityChange<ControlledVocabulary>[] {
  const updated: Record<string, ControlledVocabulary> = {};
  const removed: string[] = [];

  for (const operation of operations) {
    if (isCreateVocabularyOperation(operation)) {
      handleCreate(model, updated, operation.entity);
    } else if (isModifyVocabularyOperation(operation)) {
      handleModify(model, updated, removed, operation.vocabularyId, operation.entity);
    } else if (isDeleteVocabularyOperation(operation)) {
      handleDelete(model, updated, removed, operation.vocabularyId);
    } else {
      console.warn("Unknown vocabulary operation type:", (operation as Operation).type);
    }
  }

  const next = { ...model, ...updated };
  for (const id of removed) {
    delete next[id];
  }
  return diffEntities(model, next) as EntityChange<ControlledVocabulary>[];
}

function handleCreate(
  model: EntityRecord<ControlledVocabulary>,
  updated: Record<string, ControlledVocabulary>,
  entity: Partial<Omit<ControlledVocabulary, "type">>
): void {
  const id = entity.id ?? generateEntityId();
  updated[id] = {
    ...DEFAULT_CONTROLLED_VOCABULARY,
    ...entity,
    id,
    type: DEFAULT_CONTROLLED_VOCABULARY.type,
  };
}

function handleModify(
  model: EntityRecord<ControlledVocabulary>,
  updated: Record<string, ControlledVocabulary>,
  removed: string[],
  vocabularyId: string,
  patch: Partial<Omit<ControlledVocabulary, "id" | "type">>
): void {
  const existing = updated[vocabularyId] ?? model[vocabularyId];
  if (!existing || removed.includes(vocabularyId)) {
    console.warn(`modifyVocabulary: entity '${vocabularyId}' not found, operation skipped.`);
    return;
  }
  updated[vocabularyId] = { ...existing, ...patch };
}

function handleDelete(
  model: EntityRecord<ControlledVocabulary>,
  updated: Record<string, ControlledVocabulary>,
  removed: string[],
  vocabularyId: string
): void {
  const exists = vocabularyId in model || vocabularyId in updated;
  if (!exists || removed.includes(vocabularyId)) {
    console.warn(`deleteVocabulary: entity '${vocabularyId}' not found, operation skipped.`);
    return;
  }
  delete updated[vocabularyId];
  removed.push(vocabularyId);
}
