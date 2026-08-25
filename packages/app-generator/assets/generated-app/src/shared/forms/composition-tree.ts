import { formatFieldValue } from './field-value.ts';
import { entityPathForValidationPath, formatEntityPath, nearestPanePath } from './entity-path.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type { AggregateDescriptorMap, EntityRecord } from '../types/aggregate.ts';
import {
  isCompositionField,
  opensInOwnPane,
  resolveCompositionTarget,
  type EntityTarget,
} from './entity-target.ts';
import { compositionEntities, type EntityPathSegment } from './form-draft.ts';
import { isMultilingualField, multilingualLanguageTags } from './multilingual-value.ts';
import { effectiveFields } from './specialization.ts';
import { joinFieldPath } from './field-path.ts';

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
        if (!opensInOwnPane(childTarget)) {
          // children that compose nothing are edited in place, so they don't need their own pane
          return [];
        }
        const childPath = [
          ...path,
          { propertyName: field.propertyName, ...(field.many ? { index } : {}) },
        ];
        const childValidationPath = field.many
          ? `${joinFieldPath(validationPrefix, field.path)}[${index}]`
          : joinFieldPath(validationPrefix, field.path);
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

interface CompositionPathStep {
  segment: EntityPathSegment;
  target: EntityTarget;
  entity: EntityRecord;
  validationPath: string;
  index: number;
}

interface CompositionPathWalk {
  target: EntityTarget;
  validationPath: string;
  steps: CompositionPathStep[];
}

function walkCompositionPath(
  rootTarget: EntityTarget,
  root: EntityRecord,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): CompositionPathWalk {
  let target = rootTarget;
  let entity = root;
  let validationPath = '';
  const steps: CompositionPathStep[] = [];

  for (const segment of path) {
    const field = effectiveFields(target, entity).find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!field || !child) {
      break;
    }
    validationPath = joinFieldPath(validationPath, field.path);
    if (segment.index !== undefined) {
      validationPath = `${validationPath}[${segment.index}]`;
    }
    const values = compositionEntities(entity[field.propertyName], field);
    const index = segment.index ?? 0;
    const next = values[index];
    if (!next) {
      break;
    }
    target = child;
    entity = next;
    steps.push({ segment, target, entity, validationPath, index });
  }

  return { target, validationPath, steps };
}

export function compositionAtPath(
  rootTarget: EntityTarget,
  root: EntityRecord,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): Pick<CompositionPathWalk, 'target' | 'validationPath'> {
  const { target, validationPath } = walkCompositionPath(rootTarget, root, path, aggregateRegistry);
  return { target, validationPath };
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
  const { steps } = walkCompositionPath(rootTarget, root, path, aggregateRegistry);
  const traversed: EntityPathSegment[] = [];
  return [
    { label: rootTarget.name, path: [], validationPath: '' },
    ...steps.map((step) => {
      traversed.push(step.segment);
      return {
        label: entitySummary(step.target, step.entity, step.index),
        path: [...traversed],
        validationPath: step.validationPath,
      };
    }),
  ];
}

/** Names a composed entity using its first non-empty primitive field. */
export function entitySummary(
  target: EntityTarget,
  entity: EntityRecord | undefined,
  index: number
): string {
  if (!entity) {
    return `${target.name} ${index + 1}`;
  }
  for (const field of effectiveFields(target, entity)) {
    if (field.kind !== 'primitive') {
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
