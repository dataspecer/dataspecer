import type { DataSource } from '../datasource/data-source.ts';
import {
  fieldValues,
  isEntityRecord,
  type AggregateDescriptorMap,
  type EntityRecord,
  type FieldDescriptor,
} from '../types/aggregate.ts';
import { generateIri } from './generate-iri.ts';
import {
  type EntityTarget,
  isCompositionField,
  minimumCount,
  resolveCompositionTarget,
} from './entity-target.ts';

export interface EntityPathSegment {
  propertyName: string;
  index?: number;
}

export function createEntityDraft(
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  instanceBaseIri: string
): EntityRecord {
  const entity: EntityRecord = {
    ...(target.fieldPath.length === 0 ? target.aggregate.createEmpty() : {}),
    id: generateIri(instanceBaseIri),
  };
  for (const field of target.fields) {
    const count = minimumCount(field);
    if (field.many) {
      const values = isCompositionField(field)
        ? []
        : [...fieldValues(entity[field.propertyName], field)];
      if (field.kind === 'primitive' || isCompositionField(field)) {
        while (values.length < count) {
          values.push(createFieldValue(field, target, aggregateRegistry, instanceBaseIri));
        }
      }
      entity[field.propertyName] = values;
      continue;
    }
    if (count > 0 && isCompositionField(field)) {
      const value = createFieldValue(field, target, aggregateRegistry, instanceBaseIri);
      if (value !== undefined) {
        entity[field.propertyName] = value;
      }
    }
  }
  return entity;
}

function createFieldValue(
  field: FieldDescriptor,
  owner: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  instanceBaseIri: string
): unknown {
  if (isCompositionField(field)) {
    const target = resolveCompositionTarget(owner, field, aggregateRegistry);
    return target ? createEntityDraft(target, aggregateRegistry, instanceBaseIri) : undefined;
  }
  return undefined;
}

/**
 * Loads composed aggregate references for Update. Inline compositions are already expanded by
 * the owning LDKit schema, while a composition that points to another aggregate initially carries
 * only its IRI and needs a separate read.
 */
export async function hydrateCompositionDraft(
  model: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<EntityRecord> {
  const result = structuredClone(model);
  await hydrateCompositionChildren(result, target, aggregateRegistry, dataSource);
  return result;
}

async function hydrateCompositionChildren(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<void> {
  await Promise.all(
    target.fields.map(async (field) => {
      if (!isCompositionField(field)) {
        return;
      }
      const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
      if (!childTarget) {
        throw new Error(`Composition target for "${field.label}" is unavailable.`);
      }

      const value = entity[field.propertyName];
      if (field.many) {
        if (value === null || value === undefined) {
          entity[field.propertyName] = [];
          return;
        }
        if (!Array.isArray(value)) {
          throw new Error(`Composed ${field.label} must contain a list of entities.`);
        }
        const entries = value;
        entity[field.propertyName] = await Promise.all(
          entries.map((entry) =>
            hydrateCompositionEntry(entry, field, childTarget, aggregateRegistry, dataSource)
          )
        );
      } else if (value !== null && value !== undefined) {
        entity[field.propertyName] = await hydrateCompositionEntry(
          value,
          field,
          childTarget,
          aggregateRegistry,
          dataSource
        );
      }
    })
  );
}

async function hydrateCompositionEntry(
  value: unknown,
  field: FieldDescriptor,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<unknown> {
  if (!isEntityRecord(value)) {
    throw new Error(`Composed ${field.label} must contain an entity.`);
  }

  let entity = value;
  if (field.targetAggregateIri) {
    const id = typeof entity.id === 'string' ? entity.id : '';
    if (!id) {
      throw new Error(`Composed ${field.label} is missing its identifier.`);
    }
    const loaded = await dataSource.readDetail({
      aggregate: target.aggregate,
      id,
    });
    if (!loaded) {
      throw new Error(`Composed ${field.label} "${id}" was not found.`);
    }
    entity = structuredClone(loaded) as EntityRecord;
  }

  await hydrateCompositionChildren(entity, target, aggregateRegistry, dataSource);
  return entity;
}

export function entityAtPath(root: EntityRecord, path: readonly EntityPathSegment[]): EntityRecord {
  let current = root;
  for (const segment of path) {
    const value: unknown = current[segment.propertyName];
    const child =
      segment.index === undefined
        ? value
        : Array.isArray(value)
          ? (value as unknown[])[segment.index]
          : null;
    if (!isEntityRecord(child)) {
      throw new Error('The selected nested form no longer exists.');
    }
    current = child;
  }
  return current;
}

export function updateEntityAtPath(
  root: EntityRecord,
  path: readonly EntityPathSegment[],
  update: (entity: EntityRecord) => EntityRecord
): EntityRecord {
  if (path.length === 0) {
    return update(root);
  }

  const [segment, ...rest] = path;
  const value: unknown = root[segment.propertyName];
  if (segment.index === undefined) {
    if (!isEntityRecord(value)) {
      throw new Error('The selected nested form no longer exists.');
    }
    return {
      ...root,
      [segment.propertyName]: updateEntityAtPath(value, rest, update),
    };
  }

  if (!Array.isArray(value)) {
    throw new Error('The selected nested form no longer exists.');
  }
  const entries = [...(value as unknown[])];
  const child = entries[segment.index];
  if (!isEntityRecord(child)) {
    throw new Error('The selected nested form no longer exists.');
  }
  entries[segment.index] = updateEntityAtPath(child, rest, update);
  return { ...root, [segment.propertyName]: entries };
}

export function compositionEntities(value: unknown, field: FieldDescriptor): EntityRecord[] {
  const values = fieldValues(value, field);
  return values.map((entry) => {
    if (!isEntityRecord(entry)) {
      throw new Error(`${field.label} must contain an entity.`);
    }
    return entry;
  });
}
