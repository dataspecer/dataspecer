import type { AggregateDescriptorMap } from '../types/aggregate.ts';
import { isEntityRecord, type EntityRecord } from '../types/aggregate.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';
import type { EntityPathSegment } from './form-draft.ts';

/** Serializes a composed-entity path for the URL. */
export function formatEntityPath(path: readonly EntityPathSegment[]): string {
  return path
    .map((segment) =>
      segment.index === undefined
        ? segment.propertyName
        : `${segment.propertyName}[${segment.index}]`
    )
    .join('.');
}

export function parseEntityPath(value: string): EntityPathSegment[] {
  if (value === '') {
    return [];
  }
  return value.split('.').flatMap((part) => {
    const match = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(part);
    if (!match) {
      return [];
    }
    return [
      match[2] === undefined
        ? { propertyName: match[1] }
        : { propertyName: match[1], index: Number(match[2]) },
    ];
  });
}

/**
 * The longest prefix of the path that still exists in the draft. A path from the address bar can
 * point at a child that was removed since, and the form then falls back to its nearest ancestor.
 */
export function resolveEntityPath(
  root: EntityRecord,
  path: readonly EntityPathSegment[]
): EntityPathSegment[] {
  const resolved: EntityPathSegment[] = [];
  let current: EntityRecord = root;

  for (const segment of path) {
    const value: unknown = current[segment.propertyName];
    const child =
      segment.index === undefined
        ? value
        : Array.isArray(value)
          ? (value as unknown[])[segment.index]
          : undefined;
    if (!isEntityRecord(child)) {
      return resolved;
    }
    resolved.push(segment);
    current = child;
  }
  return resolved;
}

/**
 * Maps a validation path, which names fields, onto the entity path, which names properties. The
 * two differ whenever a field's name in the data model is not its name in the structure.
 */
export function entityPathForValidationPath(
  rootTarget: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  validationPath: string
): EntityPathSegment[] {
  const path: EntityPathSegment[] = [];
  let target = rootTarget;

  for (const part of validationPath.split('.')) {
    const match = /^([^[\]]+)(?:\[(\d+)\])?$/.exec(part);
    if (!match) {
      return path;
    }
    const field = target.fields.find((candidate) => candidate.path === match[1]);
    if (!field || !isCompositionField(field)) {
      // a leaf field, or a field that holds no composed entity, ends the entity path
      return path;
    }
    const child = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!child) {
      return path;
    }
    path.push(
      match[2] === undefined
        ? { propertyName: field.propertyName }
        : { propertyName: field.propertyName, index: Number(match[2]) }
    );
    target = child;
  }
  return path;
}

/**
 * The pane that shows a given entity. An entity whose own structure composes nothing is edited in
 * place on its parent's pane, so a path pointing at one is trimmed back to that parent.
 */
export function nearestPanePath(
  rootTarget: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  path: readonly EntityPathSegment[]
): EntityPathSegment[] {
  const pane: EntityPathSegment[] = [];
  let target = rootTarget;

  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!child || !child.fields.some(isCompositionField)) {
      return pane;
    }
    pane.push(segment);
    target = child;
  }
  return pane;
}
