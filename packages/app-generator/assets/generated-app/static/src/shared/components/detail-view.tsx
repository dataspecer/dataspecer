import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { ActionLinks } from './action-links.tsx';
import { formatPrimitiveValue } from './field-value.ts';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type NavigationActionDescriptor,
} from '../navigation/navigation.ts';

// Nested sections deeper than this start collapsed so deep structures do not overwhelm the page.
const OPEN_DEPTH = 2;

export interface DetailViewProps<TModel extends EntityModel> {
  title: string;
  fields: FieldDescriptor[];
  item: TModel;
  pageActions?: readonly NavigationActionDescriptor[];
  associationActions?: readonly AssociationNavigationActionDescriptor[];
}

export function DetailView<TModel extends EntityModel>(props: DetailViewProps<TModel>) {
  return (
    <section>
      <h2>{props.title}</h2>
      <ActionLinks actions={props.pageActions ?? []} entityId={props.item.id} />
      <FieldList
        fields={props.fields}
        item={props.item as Record<string, unknown>}
        associationActions={props.associationActions ?? []}
        depth={0}
      />
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
  const entities: unknown[] = Array.isArray(props.value)
    ? (props.value as unknown[])
    : [props.value];
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
      return <a href={href}>{text || entityId}</a>;
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
    <a className="entity-link" href={href}>
      View
    </a>
  ) : null;
}

function hasEntityValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => entry !== null && typeof entry === 'object');
  }
  return value !== null && typeof value === 'object';
}
