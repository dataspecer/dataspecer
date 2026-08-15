import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import type { DataSource } from '../datasource/data-source.ts';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type OperationNavigationDescriptor,
} from '../navigation/navigation.ts';
import { errorMessage } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
  FieldDescriptor,
} from '../types/aggregate.ts';
import { ActionLinks } from './action-links.tsx';
import { formatPrimitiveValue } from './field-value.ts';

// Nested sections deeper than this start collapsed so deep structures do not overwhelm the page.
const OPEN_DEPTH = 2;

export interface DetailViewProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel, TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  id: string;
}

export function DetailView<TModel extends EntityModel>(props: DetailViewProps<TModel>) {
  const { title, aggregate, aggregateRegistry, strategy, dataSource, navigation, id } = props;
  const [item, setItem] = useState<TModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setError('Missing required entity id.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    invokeOperation(strategy, {
      aggregate,
      aggregateRegistry,
      datasource: dataSource,
      params: { id },
    })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setItem(result.data);
        } else {
          setError(result.issues.map((issue) => issue.message).join(', '));
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        console.error(caught);
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [aggregate, aggregateRegistry, dataSource, id, strategy]);

  return (
    <section>
      <h2>{title}</h2>
      {loading ? <p>Loading…</p> : null}
      {error !== null ? <p role="alert">{error}</p> : null}
      {item !== null && error === null ? (
        <>
          <ActionLinks actions={navigation.pageActions} entityId={item.id} />
          <FieldList
            fields={aggregate.fields}
            item={item as Record<string, unknown>}
            associationActions={navigation.associationActions}
            depth={0}
          />
        </>
      ) : null}
    </section>
  );
}

interface FieldListProps {
  fields: FieldDescriptor[];
  item: Record<string, unknown>;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
  pathPrefix?: string;
}

function FieldList(props: FieldListProps) {
  return (
    <div className="field-list">
      {props.fields.map((field) => {
        const fieldPath = props.pathPrefix ? `${props.pathPrefix}.${field.path}` : field.path;
        return (
          <Field
            key={fieldPath}
            field={field}
            fieldPath={fieldPath}
            value={props.item[field.propertyName]}
            associationActions={props.associationActions}
            depth={props.depth}
          />
        );
      })}
    </div>
  );
}

interface FieldProps {
  field: FieldDescriptor;
  fieldPath: string;
  value: unknown;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
}

/**
 * A field with a nested entity value renders as a collapsible section whose body is indented,
 * so nesting reads as a tree without squeezing the value column at each level. Everything else
 * renders as a label and value on one row.
 */
function Field(props: FieldProps) {
  const { field, value } = props;
  const action = props.associationActions.find(
    (candidate) => candidate.fieldPath === props.fieldPath
  );
  const isNested = field.kind === 'association' && Boolean(field.fields?.length);

  if (isNested && hasEntityValue(value)) {
    return (
      <details className="field-branch" open={props.depth < OPEN_DEPTH}>
        <summary className="field-label">{field.label}</summary>
        <div className="field-children">
          <NestedEntities
            fields={field.fields ?? []}
            fieldPath={props.fieldPath}
            value={value}
            associationActions={props.associationActions}
            depth={props.depth + 1}
            action={action}
          />
        </div>
      </details>
    );
  }

  return (
    <div className="field-row">
      <span className="field-label">{field.label}</span>
      <span className="field-value">
        <LeafValue value={value} action={action} />
      </span>
    </div>
  );
}

interface NestedEntitiesProps {
  fields: FieldDescriptor[];
  fieldPath: string;
  value: unknown;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  depth: number;
  action?: AssociationNavigationActionDescriptor;
}

function NestedEntities(props: NestedEntitiesProps) {
  const entities: unknown[] = Array.isArray(props.value) ? props.value : [props.value];
  return (
    <>
      {entities.map((entity, index) => (
        <div className="entity" key={index}>
          {entity !== null && typeof entity === 'object' ? (
            <FieldList
              fields={props.fields}
              item={entity as Record<string, unknown>}
              associationActions={props.associationActions}
              depth={props.depth}
              pathPrefix={props.fieldPath}
            />
          ) : (
            <span className="field-value">{formatPrimitiveValue(entity)}</span>
          )}
          {props.action ? <EntityLink value={entity} action={props.action} /> : null}
        </div>
      ))}
    </>
  );
}

interface LeafValueProps {
  value: unknown;
  action?: AssociationNavigationActionDescriptor;
}

function LeafValue(props: LeafValueProps) {
  const { value, action } = props;

  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return (
      <>
        {(value as unknown[]).map((entry, index) => (
          <span key={index}>
            {index > 0 ? ', ' : null}
            <LeafValue value={entry} action={action} />
          </span>
        ))}
      </>
    );
  }

  const text = formatPrimitiveValue(value);
  if (action) {
    const entityId = entityIdFromValue(value);
    const href = entityId ? hrefForAction(action, entityId) : undefined;
    if (href) {
      return <Link to={href}>{text || entityId}</Link>;
    }
  }
  return <>{text}</>;
}

interface EntityLinkProps {
  value: unknown;
  action: AssociationNavigationActionDescriptor;
}

function EntityLink(props: EntityLinkProps) {
  const entityId = entityIdFromValue(props.value);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  return href ? (
    <Link className="entity-link" to={href}>
      View
    </Link>
  ) : null;
}

function hasEntityValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry !== null && typeof entry === 'object');
  }
  return value !== null && typeof value === 'object';
}
