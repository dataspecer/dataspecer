import { formatFieldValue } from './field-value.ts';
import { entityPathForValidationPath, formatEntityPath, nearestPanePath } from './entity-path.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type { AggregateDescriptorMap, EntityRecord } from '../types/aggregate.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';
import { compositionEntities, type EntityPathSegment } from './form-draft.ts';
import { isMultilingualField, multilingualLanguageTags } from './multilingual-value.ts';
import { effectiveFields } from './specialization.ts';

/** Describes a composed entity that opens in its own form pane. */
export interface NavigablePane {
  key: string;
  path: EntityPathSegment[];
  label: string;
  fieldLabel: string;
  validationPath: string;
}

/** Returns composed entities that open in their own pane, in display order. */
export function navigablePanes(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  path: EntityPathSegment[],
  validationPrefix = ''
): NavigablePane[] {
  return effectiveFields(target, entity)
    .filter(isCompositionField)
    .flatMap((field) => {
      const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
      if (!childTarget) {
        return [];
      }
      return compositionEntities(entity[field.propertyName], field).flatMap((child, index) => {
        if (
          !childTarget.specializations?.length &&
          !effectiveFields(childTarget, child).some(isCompositionField)
        ) {
          // children that compose nothing are edited in place, so they don't need their own pane
          return [];
        }
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
  root: EntityRecord,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget {
  let target = rootTarget;
  let entity = root;
  for (const segment of path) {
    const field = effectiveFields(target, entity).find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!child) {
      return target;
    }
    const values = compositionEntities(entity[field.propertyName], field);
    const next = values[segment.index ?? 0];
    if (!next) {
      return target;
    }
    target = child;
    entity = next;
  }
  return target;
}

export function validationPathAt(
  rootTarget: EntityTarget,
  root: EntityRecord,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): string {
  let target = rootTarget;
  let entity = root;
  let validationPath = '';
  for (const segment of path) {
    const field = effectiveFields(target, entity).find(
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
    const values = compositionEntities(entity[field.propertyName], field);
    const next = values[segment.index ?? 0];
    if (!next) {
      return validationPath;
    }
    target = child;
    entity = next;
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
    const field = effectiveFields(target, entity).find(
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

/** Names a composed entity using its first non-empty primitive field. */
export function entitySummary(
  target: EntityTarget,
  entity: EntityRecord | undefined,
  index: number
): string {
  for (const field of entity ? effectiveFields(target, entity) : target.fields) {
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

/** Counts issues at or below a validation path. */
export function countIssues(issues: readonly ValidationIssue[], path: string): number {
  if (path === '') {
    return issues.filter((issue) => issue.path !== undefined).length;
  }
  return issues.filter(
    (issue) =>
      issue.path === path ||
      issue.path?.startsWith(`${path}.`) === true ||
      issue.path?.startsWith(`${path}[`) === true
  ).length;
}

/** Counts each issue under the pane that displays it. The root pane uses an empty key. */
export function issuesByPane(
  rootTarget: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  issues: readonly ValidationIssue[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    if (issue.path === undefined) {
      continue;
    }
    const pane = nearestPanePath(
      rootTarget,
      aggregateRegistry,
      entityPathForValidationPath(rootTarget, aggregateRegistry, issue.path)
    );
    const key = formatEntityPath(pane);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
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

/** Returns stored identifiers used to distinguish edited children from new ones. */
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
  for (const field of effectiveFields(target, entity).filter(isCompositionField)) {
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

/** Returns whether the composition structure contains a multilingual field. */
export function containsMultilingualFields(
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap
): boolean {
  return targetContainsMultilingualFields(target, aggregateRegistry, new Set());
}

function targetContainsMultilingualFields(
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  visited: Set<string>
): boolean {
  const key = JSON.stringify([target.aggregate.iri, target.fieldPath]);
  if (visited.has(key)) {
    return false;
  }
  visited.add(key);

  return target.fields.some((field) => {
    if (isMultilingualField(field)) {
      return true;
    }
    if (!isCompositionField(field)) {
      return false;
    }
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    return Boolean(
      childTarget && targetContainsMultilingualFields(childTarget, aggregateRegistry, visited)
    );
  });
}

/** Collects language tags with values anywhere in the editable composition tree. */
export function collectMultilingualLanguages(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap
): string[] {
  const languages = new Set<string>();
  collectEntityLanguages(entity, target, aggregateRegistry, languages);
  return [...languages].sort();
}

function collectEntityLanguages(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  languages: Set<string>
): void {
  for (const field of effectiveFields(target, entity)) {
    if (isMultilingualField(field)) {
      multilingualLanguageTags(entity[field.propertyName]).forEach((language) =>
        languages.add(language)
      );
      continue;
    }
    if (!isCompositionField(field)) {
      continue;
    }
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      continue;
    }
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      collectEntityLanguages(child, childTarget, aggregateRegistry, languages);
    }
  }
}

export function joinValidationPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
