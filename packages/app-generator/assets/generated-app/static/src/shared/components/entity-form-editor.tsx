import { useEffect, useId, useState } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import {
  compositionEntities,
  createEntityDraft,
  entityAtPath,
  updateEntityAtPath,
  type DraftEntity,
  type EntityPathSegment,
} from '../forms/form-draft.ts';
import {
  cardinalityDescription,
  isCompositionField,
  maximumCount,
  minimumCount,
  resolveCompositionTarget,
  rootEntityTarget,
  type EntityTarget,
} from '../forms/entity-target.ts';
import { formatFieldValue } from './field-value.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  FieldDescriptor,
} from '../types/aggregate.ts';
import { FormField } from './form-field.tsx';

interface EntityFormEditorProps {
  aggregate: AggregateDescriptor;
  aggregateRegistry: AggregateDescriptorMap;
  model: DraftEntity;
  originalModel?: DraftEntity;
  dataSource: DataSource;
  instanceBaseIri: string;
  issues: ValidationIssue[];
  rootIdentifierReadOnly: boolean;
  onChange: (model: DraftEntity) => void;
}

export function EntityFormEditor(props: EntityFormEditorProps) {
  const [selection, setSelection] = useState<EntityPathSegment[]>([]);
  const identifierId = useId();
  const rootTarget = rootEntityTarget(props.aggregate);
  const target = targetAtPath(rootTarget, selection, props.aggregateRegistry);
  const entity = entityAtPath(props.model, selection);
  const validationPrefix = validationPathAt(rootTarget, selection, props.aggregateRegistry);
  const existingIds = collectEntityIds(props.originalModel, rootTarget, props.aggregateRegistry);

  const updateSelected = (update: (entity: DraftEntity) => DraftEntity) => {
    props.onChange(updateEntityAtPath(props.model, selection, update));
  };
  const errorAt = (path: string) => props.issues.find((issue) => issue.path === path)?.message;

  return (
    <div className="form-workspace">
      <aside className="form-tree" aria-label="Composition structure">
        <EntityTree
          entity={props.model}
          target={rootTarget}
          aggregateRegistry={props.aggregateRegistry}
          path={[]}
          selectedPath={selection}
          onSelect={setSelection}
        />
      </aside>

      <div className="entity-editor">
        <Breadcrumbs
          root={props.model}
          rootTarget={rootTarget}
          path={selection}
          aggregateRegistry={props.aggregateRegistry}
          onSelect={setSelection}
        />
        <h3>
          {selection.length === 0 ? target.name : entitySummary(target.name, target.fields, entity)}
        </h3>

        <div className="form-field">
          <label className="form-label" htmlFor={identifierId}>
            Identifier (IRI)
            <span className="form-required"> *</span>
          </label>
          <div className="form-control">
            <input
              id={identifierId}
              type="text"
              value={entity.id ?? ''}
              readOnly={selection.length > 0 || props.rootIdentifierReadOnly}
              onChange={(event) =>
                updateSelected((current) => ({ ...current, id: event.target.value }))
              }
            />
            {selection.length > 0 ? (
              <span className="field-note">Identifiers for composed entities are generated.</span>
            ) : null}
            {errorAt(joinValidationPath(validationPrefix, 'id')) ? (
              <span className="form-error">
                {errorAt(joinValidationPath(validationPrefix, 'id'))}
              </span>
            ) : null}
          </div>
        </div>

        {target.fields
          .filter((field) => !isCompositionField(field))
          .map((field) => {
            const fieldPath = joinValidationPath(validationPrefix, field.path);
            return (
              <FormField
                key={field.path}
                field={field}
                value={entity[field.propertyName]}
                error={errorAt(fieldPath)}
                dataSource={props.dataSource}
                onChange={(value) =>
                  updateSelected((current) => ({
                    ...current,
                    [field.propertyName]: value,
                  }))
                }
              />
            );
          })}

        {target.fields.filter(isCompositionField).map((field) => {
          const childTarget = resolveCompositionTarget(target, field, props.aggregateRegistry);
          const fieldPath = joinValidationPath(validationPrefix, field.path);
          return (
            <CompositionCollection
              key={field.path}
              field={field}
              target={childTarget}
              value={entity[field.propertyName]}
              parentPath={selection}
              aggregateRegistry={props.aggregateRegistry}
              instanceBaseIri={props.instanceBaseIri}
              issues={props.issues}
              validationPath={fieldPath}
              error={errorAt(fieldPath)}
              existingIds={existingIds}
              onSelect={setSelection}
              onChange={(value) =>
                updateSelected((current) => ({
                  ...current,
                  [field.propertyName]: value,
                }))
              }
            />
          );
        })}
      </div>
    </div>
  );
}

interface CompositionCollectionProps {
  field: FieldDescriptor;
  target: EntityTarget | null;
  value: unknown;
  parentPath: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  instanceBaseIri: string;
  issues: ValidationIssue[];
  validationPath: string;
  error?: string;
  existingIds: Set<string>;
  onSelect: (path: EntityPathSegment[]) => void;
  onChange: (value: unknown) => void;
}

function CompositionCollection(props: CompositionCollectionProps) {
  const values = compositionEntities(props.value, props.field);
  const minimum = minimumCount(props.field);
  const maximum = maximumCount(props.field);
  const issueCount = countIssues(props.issues, props.validationPath);

  if (!props.target) {
    return (
      <section className="composition-collection">
        <h4>{props.field.label}</h4>
        <p role="alert">The composition target descriptor is unavailable.</p>
      </section>
    );
  }

  const add = () => {
    const child = createEntityDraft(
      props.target as EntityTarget,
      props.aggregateRegistry,
      props.instanceBaseIri
    );
    if (props.field.many) {
      props.onChange([...values, child]);
      props.onSelect([
        ...props.parentPath,
        { propertyName: props.field.propertyName, index: values.length },
      ]);
    } else {
      props.onChange(child);
      props.onSelect([...props.parentPath, { propertyName: props.field.propertyName }]);
    }
  };
  const remove = (index: number) => {
    const child = values[index];
    const id = typeof child.id === 'string' ? child.id : '';
    if (
      id &&
      props.existingIds.has(id) &&
      !window.confirm(
        `Remove and delete "${entitySummary(props.field.label, props.target?.fields ?? [], child)}" when the form is saved?`
      )
    ) {
      return;
    }
    props.onChange(
      props.field.many ? values.filter((_, candidate) => candidate !== index) : undefined
    );
  };

  return (
    <section className="composition-collection">
      <div className="composition-heading">
        <div>
          <h4>
            {props.field.label}
            {minimum > 0 ? <span className="form-required"> *</span> : null}
          </h4>
          <span className="field-note">
            {values.length} {values.length === 1 ? 'item' : 'items'}
            {props.field.many ? ` · ${cardinalityDescription(props.field)}` : ''}
            {issueCount > 0
              ? ` · ${issueCount} validation ${issueCount === 1 ? 'issue' : 'issues'}`
              : ''}
          </span>
        </div>
        <button type="button" disabled={maximum !== null && values.length >= maximum} onClick={add}>
          Add {props.field.label.toLocaleLowerCase()}
        </button>
      </div>
      {props.error ? <span className="form-error">{props.error}</span> : null}

      {values.length > 0 ? (
        <div className="composition-cards">
          {values.map((child, index) => {
            const childValidationPath = props.field.many
              ? `${props.validationPath}[${index}]`
              : props.validationPath;
            const childIssueCount = countIssues(props.issues, childValidationPath);
            const path = [
              ...props.parentPath,
              {
                propertyName: props.field.propertyName,
                ...(props.field.many ? { index } : {}),
              },
            ];
            return (
              <article className="composition-card" key={child.id ?? index}>
                <div>
                  <strong>
                    {entitySummary(props.field.label, props.target?.fields ?? [], child)}
                  </strong>
                  {childIssueCount > 0 ? (
                    <span className="form-error">
                      {childIssueCount} {childIssueCount === 1 ? 'issue' : 'issues'}
                    </span>
                  ) : null}
                  {child.id ? <small>{child.id}</small> : null}
                </div>
                <div className="composition-card-actions">
                  <button type="button" onClick={() => props.onSelect(path)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={values.length <= minimum}
                    onClick={() => remove(index)}
                  >
                    {child.id && props.existingIds.has(child.id) ? 'Remove and delete' : 'Remove'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="field-note">No composed entities.</p>
      )}
    </section>
  );
}

interface EntityTreeProps {
  entity: DraftEntity;
  target: EntityTarget;
  aggregateRegistry: AggregateDescriptorMap;
  path: EntityPathSegment[];
  selectedPath: EntityPathSegment[];
  onSelect: (path: EntityPathSegment[]) => void;
}

function EntityTree(props: EntityTreeProps) {
  return (
    <div className="form-tree-node">
      <button
        type="button"
        className={samePath(props.path, props.selectedPath) ? 'selected' : undefined}
        aria-current={samePath(props.path, props.selectedPath) ? 'page' : undefined}
        onClick={() => props.onSelect(props.path)}
      >
        {entitySummary(props.target.name, props.target.fields, props.entity)}
      </button>
      {props.target.fields.filter(isCompositionField).map((field) => {
        const target = resolveCompositionTarget(props.target, field, props.aggregateRegistry);
        const children = compositionEntities(props.entity[field.propertyName], field);
        if (!target || children.length === 0) {
          return null;
        }
        return (
          <EntityTreeGroup
            key={field.path}
            field={field}
            children={children}
            target={target}
            aggregateRegistry={props.aggregateRegistry}
            parentPath={props.path}
            selectedPath={props.selectedPath}
            onSelect={props.onSelect}
          />
        );
      })}
    </div>
  );
}

interface EntityTreeGroupProps {
  field: FieldDescriptor;
  children: DraftEntity[];
  target: EntityTarget;
  aggregateRegistry: AggregateDescriptorMap;
  parentPath: EntityPathSegment[];
  selectedPath: EntityPathSegment[];
  onSelect: (path: EntityPathSegment[]) => void;
}

function EntityTreeGroup(props: EntityTreeGroupProps) {
  const selectedBranch = selectionUsesField(props.selectedPath, props.parentPath, props.field);
  const [expanded, setExpanded] = useState(props.parentPath.length < 2 || selectedBranch);
  useEffect(() => {
    if (selectedBranch) {
      setExpanded(true);
    }
  }, [selectedBranch]);

  return (
    <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        {props.field.label} ({props.children.length})
      </summary>
      {expanded ? (
        <div className="form-tree-children">
          {props.children.map((child, index) => {
            const path = [
              ...props.parentPath,
              {
                propertyName: props.field.propertyName,
                ...(props.field.many ? { index } : {}),
              },
            ];
            return (
              <EntityTree
                key={child.id ?? index}
                entity={child}
                target={props.target}
                aggregateRegistry={props.aggregateRegistry}
                path={path}
                selectedPath={props.selectedPath}
                onSelect={props.onSelect}
              />
            );
          })}
        </div>
      ) : null}
    </details>
  );
}

interface BreadcrumbsProps {
  root: DraftEntity;
  rootTarget: EntityTarget;
  path: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  onSelect: (path: EntityPathSegment[]) => void;
}

function Breadcrumbs(props: BreadcrumbsProps) {
  const entries: { label: string; path: EntityPathSegment[] }[] = [
    { label: props.rootTarget.name, path: [] },
  ];
  let entity = props.root;
  let target = props.rootTarget;
  const traversed: EntityPathSegment[] = [];

  for (const segment of props.path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    if (!field) {
      break;
    }
    const nextTarget = resolveCompositionTarget(target, field, props.aggregateRegistry);
    const value: unknown = entity[field.propertyName];
    const child =
      segment.index === undefined
        ? value
        : Array.isArray(value)
          ? (value as unknown[])[segment.index]
          : null;
    if (!nextTarget || child === null || typeof child !== 'object' || child instanceof Date) {
      break;
    }
    traversed.push(segment);
    entity = child as DraftEntity;
    target = nextTarget;
    entries.push({
      label: entitySummary(field.label, target.fields, entity),
      path: [...traversed],
    });
  }

  return (
    <nav className="form-breadcrumbs" aria-label="Nested form">
      {entries.map((entry, index) => (
        <span key={pathKey(entry.path)}>
          {index > 0 ? <span aria-hidden="true"> / </span> : null}
          <button type="button" onClick={() => props.onSelect(entry.path)}>
            {entry.label}
          </button>
        </span>
      ))}
    </nav>
  );
}

function targetAtPath(
  root: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget {
  let target = root;
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field ? resolveCompositionTarget(target, field, aggregateRegistry) : null;
    if (!child) {
      throw new Error('The selected nested form descriptor is unavailable.');
    }
    target = child;
  }
  return target;
}

function validationPathAt(
  root: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): string {
  let target = root;
  let result = '';
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field ? resolveCompositionTarget(target, field, aggregateRegistry) : null;
    if (!field || !child) {
      break;
    }
    const suffix = field.many ? `[${segment.index ?? 0}]` : '';
    result = joinValidationPath(result, `${field.path}${suffix}`);
    target = child;
  }
  return result;
}

function entitySummary(
  fallback: string,
  fields: readonly FieldDescriptor[],
  entity: DraftEntity
): string {
  const primitive = fields.find(
    (field) =>
      field.kind === 'primitive' &&
      entity[field.propertyName] !== null &&
      entity[field.propertyName] !== undefined
  );
  if (primitive) {
    const value = formatFieldValue(primitive, entity[primitive.propertyName]);
    if (value.trim() !== '') {
      return value;
    }
  }
  return typeof entity.id === 'string' && entity.id !== '' ? entity.id : `Untitled ${fallback}`;
}

function collectEntityIds(
  model: DraftEntity | undefined,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  result = new Set<string>()
): Set<string> {
  if (!model) {
    return result;
  }
  if (typeof model.id === 'string') {
    result.add(model.id);
  }
  for (const field of target.fields.filter(isCompositionField)) {
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      continue;
    }
    for (const child of compositionEntities(model[field.propertyName], field)) {
      collectEntityIds(child, childTarget, aggregateRegistry, result);
    }
  }
  return result;
}

function countIssues(issues: readonly ValidationIssue[], path: string): number {
  return issues.filter(
    (issue) =>
      issue.path === path ||
      issue.path?.startsWith(`${path}.`) ||
      issue.path?.startsWith(`${path}[`)
  ).length;
}

function samePath(
  left: readonly EntityPathSegment[],
  right: readonly EntityPathSegment[]
): boolean {
  return pathKey(left) === pathKey(right);
}

function selectionUsesField(
  selection: readonly EntityPathSegment[],
  parentPath: readonly EntityPathSegment[],
  field: FieldDescriptor
): boolean {
  return (
    selection.length > parentPath.length &&
    samePath(selection.slice(0, parentPath.length), parentPath) &&
    selection[parentPath.length].propertyName === field.propertyName
  );
}

function pathKey(path: readonly EntityPathSegment[]): string {
  return path.map((segment) => `${segment.propertyName}[${segment.index ?? ''}]`).join('/');
}

function joinValidationPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
