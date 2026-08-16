import { formatFieldValue } from '../components/field-value.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type { AggregateDescriptorMap, EntityRecord } from '../types/aggregate.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';
import { compositionEntities, type EntityPathSegment } from './form-draft.ts';

/**
 * Walking the tree of composed entities behind a form.
 */

export interface NavigablePane {
  key: string;
  path: EntityPathSegment[];
  label: string;
  fieldLabel: string;
  validationPath: string;
}

/** Every composed entity that opens as its own pane, in the order the form shows them. */
export function navigablePanes(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  path: EntityPathSegment[],
  validationPrefix = ''
): NavigablePane[] {
  return target.fields.filter(isCompositionField).flatMap((field) => {
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget || !childTarget.fields.some(isCompositionField)) {
      // children that compose nothing are edited in place, so they are not panes
      return [];
    }
    return compositionEntities(entity[field.propertyName], field).flatMap((child, index) => {
      const childPath = [
        ...path,
        { propertyName: field.propertyName, ...(field.many ? { index } : {}) },
      ];
      const childValidationPath = field.many
        ? `${joinValidationPath(validationPrefix, field.path)}[${index}]`
        : joinValidationPath(validationPrefix, field.path);
      return [
        {
          key: childValidationPath,
          path: childPath,
          label: entitySummary(childTarget, child, index),
          fieldLabel: field.label,
          validationPath: childValidationPath,
        },
        ...navigablePanes(child, childTarget, aggregateRegistry, childPath, childValidationPath),
      ];
    });
  });
}

export function targetAtPath(
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget {
  let target = rootTarget;
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!child) {
      return target;
    }
    target = child;
  }
  return target;
}

export function validationPathAt(
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): string {
  let target = rootTarget;
  let validationPath = '';
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!field || !child) {
      return validationPath;
    }
    validationPath = joinValidationPath(validationPath, field.path);
    if (segment.index !== undefined) {
      validationPath = `${validationPath}[${segment.index}]`;
    }
    target = child;
  }
  return validationPath;
}

export interface BreadcrumbEntry {
  label: string;
  path: EntityPathSegment[];
  validationPath: string;
}

export function breadcrumbEntries(
  root: EntityRecord,
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): BreadcrumbEntry[] {
  const entries: BreadcrumbEntry[] = [{ label: rootTarget.name, path: [], validationPath: '' }];
  let entity = root;
  let target = rootTarget;
  let validationPath = '';
  const traversed: EntityPathSegment[] = [];

  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!field || !child) {
      break;
    }
    const values = compositionEntities(entity[field.propertyName], field);
    const index = segment.index ?? 0;
    const next = values[index];
    if (!next) {
      break;
    }
    traversed.push(segment);
    validationPath = joinValidationPath(validationPath, field.path);
    if (segment.index !== undefined) {
      validationPath = `${validationPath}[${segment.index}]`;
    }
    entries.push({
      label: entitySummary(child, next, index),
      path: [...traversed],
      validationPath,
    });
    entity = next;
    target = child;
  }
  return entries;
}

/**
 * Names a composed entity by its first filled primitive.
 */
export function entitySummary(
  target: EntityTarget,
  entity: EntityRecord | undefined,
  index: number
): string {
  for (const field of target.fields) {
    if (field.kind !== 'primitive' || !entity) {
      continue;
    }
    const value = formatFieldValue(field, entity[field.propertyName]);
    if (value !== '') {
      return value;
    }
  }
  return `${target.name} ${index + 1}`;
}

export function countIssues(issues: readonly ValidationIssue[], path: string): number {
  if (path === '') {
    return issues.filter((issue) => issue.path !== undefined).length;
  }
  return issues.filter(
    (issue) => issue.path === path || issue.path?.startsWith(`${path}.`) === true
  ).length;
}

export function samePath(
  left: readonly EntityPathSegment[],
  right: readonly EntityPathSegment[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (segment, index) =>
        segment.propertyName === right[index]?.propertyName && segment.index === right[index]?.index
    )
  );
}

/** The identifiers already stored, so the form can tell an edit from a new child. */
export function collectEntityIds(
  entity: EntityRecord | undefined,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap
): Set<string> {
  const ids = new Set<string>();
  if (!entity) {
    return ids;
  }
  if (typeof entity.id === 'string' && entity.id !== '') {
    ids.add(entity.id);
  }
  for (const field of target.fields.filter(isCompositionField)) {
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      continue;
    }
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      for (const id of collectEntityIds(child, childTarget, aggregateRegistry)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

export function joinValidationPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
