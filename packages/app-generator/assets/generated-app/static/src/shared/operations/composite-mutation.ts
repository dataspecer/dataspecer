import type { DataSource } from '../datasource/data-source.ts';
import { compositionEntities } from '../forms/form-draft.ts';
import { isEmptyValue, resolveControl } from '../forms/form-model.ts';
import {
  isCompositionField,
  resolveAssociationTarget,
  resolveCompositionTarget,
  rootEntityTarget,
  type EntityTarget,
} from '../forms/entity-target.ts';
import {
  fieldValues,
  isEntityRecord,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
  type EntityModel,
  type FieldDescriptor,
} from '../types/aggregate.ts';

export interface CompositeMutationStep {
  kind: 'create' | 'update' | 'delete';
  target: EntityTarget;
  payload?: EntityRecord;
  id: string;
}

export function buildCompositeCreatePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord
): CompositeMutationStep[] {
  const steps: CompositeMutationStep[] = [];
  collectCreateSteps(payload, rootEntityTarget(aggregate), aggregateRegistry, steps);
  return steps;
}

export function buildCompositeUpdatePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord,
  original: EntityRecord
): CompositeMutationStep[] {
  const upserts: CompositeMutationStep[] = [];
  const removals: CompositeMutationStep[] = [];
  collectUpdateSteps(
    payload,
    original,
    rootEntityTarget(aggregate),
    aggregateRegistry,
    upserts,
    removals
  );
  return [...upserts, ...removals];
}

export function buildCompositeDeletePlan(
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  payload: EntityRecord,
  cascadePaths: readonly string[]
): CompositeMutationStep[] {
  const steps: CompositeMutationStep[] = [];
  collectCascadeDeleteSteps(
    payload,
    rootEntityTarget(aggregate),
    aggregateRegistry,
    new Set(cascadePaths),
    '',
    steps
  );
  return steps;
}

export async function createComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel
): Promise<TModel> {
  const draft = payload as EntityRecord;
  const steps = buildCompositeCreatePlan(aggregate, aggregateRegistry, draft);
  await executePlan(dataSource, steps);
  return payload;
}

export async function updateComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel,
  original: TModel
): Promise<TModel> {
  const steps = buildCompositeUpdatePlan(
    aggregate,
    aggregateRegistry,
    payload as EntityRecord,
    original as EntityRecord
  );
  await executePlan(dataSource, steps);
  return payload;
}

export async function deleteComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel,
  cascadePaths: readonly string[]
): Promise<void> {
  const steps = buildCompositeDeletePlan(
    aggregate,
    aggregateRegistry,
    payload as EntityRecord,
    cascadePaths
  );
  await executePlan(dataSource, steps);
}

async function executePlan(
  dataSource: DataSource,
  steps: readonly CompositeMutationStep[]
): Promise<void> {
  for (const step of steps) {
    if (step.kind === 'delete') {
      await dataSource.delete({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        id: step.id,
      });
    } else if (step.kind === 'create') {
      await dataSource.create({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        payload: step.payload as EntityRecord,
      });
    } else {
      await dataSource.update({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        id: step.id,
        payload: step.payload as EntityRecord,
      });
    }
  }
}

function collectCreateSteps(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  steps: CompositeMutationStep[]
): void {
  visitCompositionChildren(entity, target, aggregateRegistry, (child, childTarget) => {
    collectCreateSteps(child, childTarget, aggregateRegistry, steps);
  });
  steps.push({
    kind: 'create',
    target,
    payload: serializeEntity(entity, target, 'create'),
    id: requireEntityId(entity, target.name),
  });
}

function collectUpdateSteps(
  entity: EntityRecord,
  original: EntityRecord | undefined,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  upserts: CompositeMutationStep[],
  removals: CompositeMutationStep[]
): void {
  for (const field of target.fields) {
    if (!isCompositionField(field)) {
      continue;
    }
    const childTarget = requireCompositionTarget(target, field, aggregateRegistry);
    const currentChildren = compositionEntities(entity[field.propertyName], field);
    const originalChildren = compositionEntities(original?.[field.propertyName], field);
    const originalById = new Map(
      originalChildren
        .map((child) => [entityId(child), child] as const)
        .filter((entry): entry is [string, EntityRecord] => entry[0] !== null)
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
        removals
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
    id: requireEntityId(entity, target.name),
  });
}

function collectDeleteSteps(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  removals: CompositeMutationStep[]
): void {
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
  removals: CompositeMutationStep[]
): void {
  for (const field of target.fields) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${field.path}` : field.path;
    if (
      !cascadePaths.has(fieldPath) ||
      field.kind !== 'association' ||
      field.associationKind === 'aggregation'
    ) {
      continue;
    }

    const childTarget = resolveAssociationTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      throw new Error(`Cascade target for "${field.label}" is unavailable.`);
    }
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      collectCascadeDeleteSteps(
        child,
        childTarget,
        aggregateRegistry,
        cascadePaths,
        fieldPath,
        removals
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
  visit: (entity: EntityRecord, target: EntityTarget) => void
): void {
  for (const field of target.fields) {
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
  aggregateRegistry: AggregateDescriptorMap
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
  mode: 'create' | 'update'
): EntityRecord {
  const payload: EntityRecord = { id: requireEntityId(entity, target.name) };
  for (const field of target.fields) {
    if (resolveControl(field) === 'unsupported') {
      continue;
    }
    const fieldValue = entity[field.propertyName];
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
