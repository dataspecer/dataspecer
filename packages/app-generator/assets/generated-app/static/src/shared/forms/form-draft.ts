import type { DataSource } from '../datasource/data-source.ts';
import type { AggregateDescriptorMap, FieldDescriptor, EntityModel } from '../types/aggregate.ts';
import { generateIri } from './generate-iri.ts';
import {
  isCompositionField,
  minimumCount,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';

export type DraftEntity = EntityModel & Record<string, unknown>;

export interface EntityPathSegment {
  propertyName: string;
  index?: number;
}

export function createEntityDraft(
  target: EntityTarget,
  aggregates: AggregateDescriptorMap,
  instanceBaseIri: string
): DraftEntity {
  const seed =
    target.fieldPath.length === 0
      ? (target.aggregate.createEmpty() as DraftEntity)
      : ({} as DraftEntity);
  const entity: DraftEntity = { ...seed, id: generateIri(instanceBaseIri) };
  for (const field of target.fields) {
    const count = minimumCount(field);
    if (field.many) {
      const seeded =
        !isCompositionField(field) && Array.isArray(seed[field.propertyName])
          ? [...(seed[field.propertyName] as unknown[])]
          : [];
      while (seeded.length < count) {
        seeded.push(createFieldValue(field, target, aggregates, instanceBaseIri));
      }
      entity[field.propertyName] = seeded;
      continue;
    }
    if (count > 0 && (field.kind === 'association' || !Object.hasOwn(seed, field.propertyName))) {
      const value = createFieldValue(field, target, aggregates, instanceBaseIri);
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
  aggregates: AggregateDescriptorMap,
  instanceBaseIri: string
): unknown {
  if (isCompositionField(field)) {
    const target = resolveCompositionTarget(owner, field, aggregates);
    return target ? createEntityDraft(target, aggregates, instanceBaseIri) : undefined;
  }
  if (field.kind === 'association') {
    return field.targetClassIri ? { id: '' } : '';
  }
  return field.formControl === 'checkbox' ? false : field.formControl === 'text' ? '' : undefined;
}

/**
 * Loads composed aggregate references for Update. Inline compositions are already expanded by
 * the owning LDKit schema, while a composition that points to another aggregate initially carries
 * only its IRI and needs a separate read.
 */
export async function hydrateCompositionDraft(
  model: DraftEntity,
  target: EntityTarget,
  aggregates: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<DraftEntity> {
  const result = structuredClone(model);
  await hydrateCompositionChildren(result, target, aggregates, dataSource);
  return result;
}

async function hydrateCompositionChildren(
  entity: DraftEntity,
  target: EntityTarget,
  aggregates: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<void> {
  await Promise.all(
    target.fields.map(async (field) => {
      if (!isCompositionField(field)) {
        return;
      }
      const childTarget = resolveCompositionTarget(target, field, aggregates);
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
            hydrateCompositionEntry(entry, field, childTarget, aggregates, dataSource)
          )
        );
      } else if (value !== null && value !== undefined) {
        entity[field.propertyName] = await hydrateCompositionEntry(
          value,
          field,
          childTarget,
          aggregates,
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
  aggregates: AggregateDescriptorMap,
  dataSource: DataSource
): Promise<unknown> {
  if (
    value === null ||
    typeof value !== 'object' ||
    value instanceof Date ||
    Array.isArray(value)
  ) {
    throw new Error(`Composed ${field.label} must contain an entity.`);
  }

  let entity = value as DraftEntity;
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
    entity = structuredClone(loaded) as DraftEntity;
  }

  await hydrateCompositionChildren(entity, target, aggregates, dataSource);
  return entity;
}

export function entityAtPath(root: DraftEntity, path: readonly EntityPathSegment[]): DraftEntity {
  let current = root;
  for (const segment of path) {
    const value: unknown = current[segment.propertyName];
    const child =
      segment.index === undefined
        ? value
        : Array.isArray(value)
          ? (value as unknown[])[segment.index]
          : null;
    if (child === null || typeof child !== 'object' || child instanceof Date) {
      throw new Error('The selected nested form no longer exists.');
    }
    current = child as DraftEntity;
  }
  return current;
}

export function updateEntityAtPath(
  root: DraftEntity,
  path: readonly EntityPathSegment[],
  update: (entity: DraftEntity) => DraftEntity
): DraftEntity {
  if (path.length === 0) {
    return update(root);
  }

  const [segment, ...rest] = path;
  const value: unknown = root[segment.propertyName];
  if (segment.index === undefined) {
    if (value === null || typeof value !== 'object' || value instanceof Date) {
      throw new Error('The selected nested form no longer exists.');
    }
    return {
      ...root,
      [segment.propertyName]: updateEntityAtPath(value as DraftEntity, rest, update),
    };
  }

  if (!Array.isArray(value) || !value[segment.index]) {
    throw new Error('The selected nested form no longer exists.');
  }
  const entries = [...(value as unknown[])];
  entries[segment.index] = updateEntityAtPath(entries[segment.index] as DraftEntity, rest, update);
  return { ...root, [segment.propertyName]: entries };
}

export function compositionEntities(value: unknown, field: FieldDescriptor): DraftEntity[] {
  const values = field.many ? (Array.isArray(value) ? value : []) : [value];
  return values.filter(
    (entry): entry is DraftEntity =>
      entry !== null && typeof entry === 'object' && !(entry instanceof Date)
  );
}
