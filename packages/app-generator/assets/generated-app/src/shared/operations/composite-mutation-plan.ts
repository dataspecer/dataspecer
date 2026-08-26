import { compositionEntities } from '../forms/form-draft.ts';
import { resolveControl } from '../forms/form-model.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  rootEntityTarget,
  type EntityTarget,
} from '../forms/entity-target.ts';
import { compactMultilingualValue, isMultilingualField } from '../forms/multilingual-value.ts';
import { joinFieldPath } from '../forms/field-path.ts';
import {
  effectiveFields,
  hasSelectedBranchEvidence,
  selectedSpecialization,
} from '../forms/specialization.ts';
import {
  fieldValues,
  isEntityRecord,
  isEmptyValue,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
  type FieldDescriptor,
} from '../types/aggregate.ts';

interface MutationStep {
  target: EntityTarget;
  id: string;
}

interface UpsertMutationStep extends MutationStep {
  kind: 'create' | 'update';
  payload: EntityRecord;
  specializationIri?: string;
}

interface DeleteMutationStep extends MutationStep {
  kind: 'delete';
}

export type CompositeMutationStep = UpsertMutationStep | DeleteMutationStep;

/** Plans child creates before the parent writes links to them. */
export function buildCompositeCreatePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord,
): CompositeMutationStep[] {
  const steps: CompositeMutationStep[] = [];
  collectCreateSteps(payload, rootEntityTarget(aggregate), aggregateRegistry, steps);
  return steps;
}

export function buildCompositeUpdatePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord,
  original: EntityRecord,
): CompositeMutationStep[] {
  const upserts: CompositeMutationStep[] = [];
  const removals: CompositeMutationStep[] = [];
  collectUpdateSteps(
    payload,
    original,
    rootEntityTarget(aggregate),
    aggregateRegistry,
    upserts,
    removals,
  );
  // Upserts create children before updating their parent links. Removed children are deleted only
  // after their edited parent has stopped referencing them.
  return [...upserts, ...removals];
}

export function buildCompositeDeletePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord,
  cascadePaths: readonly string[],
): CompositeMutationStep[] {
  // only configured cascade paths are followed, with every descendant placed before its owner
  const steps: CompositeMutationStep[] = [];
  collectCascadeDeleteSteps(
    payload,
    rootEntityTarget(aggregate),
    aggregateRegistry,
    new Set(cascadePaths),
    '',
    steps,
  );
  return steps;
}

function collectCreateSteps(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  steps: CompositeMutationStep[],
): void {
  const specializationIri = requireMutationSpecialization(entity, target);
  visitCompositionChildren(entity, target, aggregateRegistry, (child, childTarget) => {
    collectCreateSteps(child, childTarget, aggregateRegistry, steps);
  });
  steps.push({
    kind: 'create',
    target,
    payload: serializeEntity(entity, target, 'create'),
    ...(specializationIri ? { specializationIri } : {}),
    id: requireEntityId(entity, target.name),
  });
}

function collectUpdateSteps(
  entity: EntityRecord,
  original: EntityRecord | undefined,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  upserts: CompositeMutationStep[],
  removals: CompositeMutationStep[],
): void {
  const specializationIri = requireMutationSpecialization(entity, target, original);
  for (const field of effectiveFields(target, entity)) {
    if (!isCompositionField(field)) {
      continue;
    }
    const childTarget = requireCompositionTarget(target, field, aggregateRegistry);
    const currentChildren = compositionEntities(entity[field.propertyName], field);
    const originalChildren = compositionEntities(original?.[field.propertyName], field);
    const originalById = new Map(
      originalChildren
        .map((child) => [entityId(child), child] as const)
        .filter((entry): entry is [string, EntityRecord] => entry[0] !== null),
    );
    const currentIds = new Set<string>();

    for (const child of currentChildren) {
      const id = entityId(child);
      if (id) {
        currentIds.add(id);
      }
      collectUpdateSteps(
        child,
        id ? originalById.get(id) : undefined,
        childTarget,
        aggregateRegistry,
        upserts,
        removals,
      );
    }

    for (const child of originalChildren) {
      const id = entityId(child);
      if (id && !currentIds.has(id)) {
        collectDeleteSteps(child, childTarget, aggregateRegistry, removals);
      }
    }
  }

  const kind = original ? 'update' : 'create';
  upserts.push({
    kind,
    target,
    payload: serializeEntity(entity, target, kind),
    ...(specializationIri ? { specializationIri } : {}),
    id: requireEntityId(entity, target.name),
  });
}

function collectDeleteSteps(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  removals: CompositeMutationStep[],
): void {
  requireMutationSpecialization(entity, target, entity, 'remove');
  visitCompositionChildren(entity, target, aggregateRegistry, (child, childTarget) => {
    collectDeleteSteps(child, childTarget, aggregateRegistry, removals);
  });
  const id = entityId(entity);
  if (id) {
    removals.push({ kind: 'delete', target, id });
  }
}

function collectCascadeDeleteSteps(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  cascadePaths: ReadonlySet<string>,
  pathPrefix: string,
  removals: CompositeMutationStep[],
): void {
  requireMutationSpecialization(entity, target, entity, 'remove');
  for (const field of effectiveFields(target, entity)) {
    const fieldPath = joinFieldPath(pathPrefix, field.path);
    if (!cascadePaths.has(fieldPath) || !isCompositionField(field)) {
      continue;
    }

    const childTarget = requireCompositionTarget(target, field, aggregateRegistry);
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      collectCascadeDeleteSteps(
        child,
        childTarget,
        aggregateRegistry,
        cascadePaths,
        fieldPath,
        removals,
      );
    }
  }

  removals.push({
    kind: 'delete',
    target,
    id: requireEntityId(entity, target.name),
  });
}

function visitCompositionChildren(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  visit: (entity: EntityRecord, target: EntityTarget) => void,
): void {
  for (const field of effectiveFields(target, entity)) {
    if (!isCompositionField(field)) {
      continue;
    }
    const childTarget = requireCompositionTarget(target, field, aggregateRegistry);
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      visit(child, childTarget);
    }
  }
}

function requireCompositionTarget(
  owner: EntityTarget,
  field: FieldDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
): EntityTarget {
  const target = resolveCompositionTarget(owner, field, aggregateRegistry);
  if (!target) {
    throw new Error(`Composition target for "${field.label}" is unavailable.`);
  }
  return target;
}

function serializeEntity(
  entity: EntityRecord,
  target: EntityTarget,
  mode: 'create' | 'update',
): EntityRecord {
  const payload: EntityRecord = { id: requireEntityId(entity, target.name) };
  for (const field of effectiveFields(target, entity)) {
    if (resolveControl(field) === 'unsupported') {
      continue;
    }
    const multilingual = isMultilingualField(field);
    if (multilingual && !Object.hasOwn(entity, field.propertyName)) {
      // an absent multilingual property is untouched, a present empty map clears it
      continue;
    }
    const fieldValue = entity[field.propertyName];
    if (multilingual) {
      const value = compactMultilingualValue(fieldValue);
      if (Object.keys(value).length === 0) {
        if (mode === 'update') {
          payload[field.propertyName] = null;
        }
      } else {
        payload[field.propertyName] = value;
      }
      continue;
    }

    const value = isCompositionField(field)
      ? compositionReferences(fieldValue, field)
      : field.kind === 'association'
        ? aggregationReferences(fieldValue, field)
        : field.many
          ? fieldValues(fieldValue, field).filter((entry) => !isEmptyValue(entry))
          : fieldValue;

    if (isEmptyValue(value)) {
      if (mode === 'update') {
        payload[field.propertyName] = field.many ? [] : null;
      }
    } else {
      payload[field.propertyName] = value;
    }
  }
  return payload;
}

function requireMutationSpecialization(
  entity: EntityRecord,
  target: EntityTarget,
  original?: EntityRecord,
  operation: 'save' | 'remove' = 'save',
): string | undefined {
  if (!target.specializations?.length) {
    return undefined;
  }
  const action = operation === 'save' ? 'saved' : 'removed';
  const selected = selectedSpecialization(target, entity);
  if (!selected) {
    if (original) {
      throw new Error(
        `The stored specialization of "${target.name}" cannot be identified, ` +
          `so it cannot be ${action}.`,
      );
    }
    throw new Error(`Select one specialization for "${target.name}" before saving.`);
  }
  if (!hasSelectedBranchEvidence(target, entity, selected)) {
    if (operation === 'remove') {
      throw new Error(
        `The stored specialization of "${target.name}" has no identifying branch value, ` +
          'so it cannot be removed.',
      );
    }
    throw new Error(
      `Enter a value in at least one field unique to "${selected.label}" before saving.`,
    );
  }
  if (!original) {
    return selected.specializationIri;
  }

  const loaded = selectedSpecialization(target, original);
  if (!loaded) {
    throw new Error(
      `The stored specialization of "${target.name}" cannot be identified, ` +
        `so it cannot be ${action}.`,
    );
  }
  if (loaded.specializationIri !== selected.specializationIri) {
    throw new Error(
      `The specialization of "${target.name}" cannot be changed after the entity has been saved.`,
    );
  }
  return loaded.specializationIri;
}

function compositionReferences(value: unknown, field: FieldDescriptor): unknown {
  const references = compositionEntities(value, field).map((entity) => ({
    id: requireEntityId(entity, field.label),
  }));
  return field.many ? references : references[0];
}

function aggregationReferences(value: unknown, field: FieldDescriptor): unknown {
  const values = fieldValues(value, field);
  const references: Array<string | { id: string }> = [];
  for (const entry of values) {
    if (typeof entry === 'string') {
      if (entry.trim() !== '') {
        references.push(entry);
      }
      continue;
    }
    if (!isEntityRecord(entry)) {
      throw new Error(`${field.label} must contain a reference.`);
    }
    const id = entry.id;
    if (typeof id === 'string' && id.trim() === '') {
      continue;
    }
    references.push({
      id: requireEntityId(entry, `Reference in ${field.label}`),
    });
  }
  return field.many ? references : references[0];
}

function requireEntityId(entity: EntityRecord, label: string): string {
  const id = entityId(entity);
  if (!id) {
    throw new Error(`${label} is missing its identifier.`);
  }
  return id;
}

function entityId(entity: EntityRecord): string | null {
  return typeof entity.id === 'string' && entity.id.trim() !== '' ? entity.id : null;
}
