import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { formatPrimitiveValue } from './field-value.ts';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type NavigationActionDescriptor,
} from '../navigation/navigation.ts';

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
      />
    </section>
  );
}

interface FieldListProps {
  fields: FieldDescriptor[];
  item: Record<string, unknown>;
  associationActions: readonly AssociationNavigationActionDescriptor[];
  pathPrefix?: string;
}

function FieldList(props: FieldListProps) {
  return (
    <dl>
      {props.fields.map((field) => {
        const fieldPath = props.pathPrefix ? `${props.pathPrefix}.${field.path}` : field.path;
        return (
          <div key={fieldPath}>
            <dt>{field.label}</dt>
            <dd>
              <FieldValue
                field={field}
                fieldPath={fieldPath}
                value={props.item[field.propertyName]}
                associationActions={props.associationActions}
              />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

interface FieldValueProps {
  field: FieldDescriptor;
  fieldPath: string;
  value: unknown;
  associationActions: readonly AssociationNavigationActionDescriptor[];
}

/**
 * Associations with inline nested fields are rendered as nested sections, multi-valued fields as
 * lists, and everything else as formatted text.
 */
function FieldValue(props: FieldValueProps) {
  const { field, value } = props;

  if (value === null || value === undefined) {
    return null;
  }

  const action = props.associationActions.find(
    (candidate) => candidate.fieldPath === props.fieldPath
  );
  if (action) {
    return <AssociationFieldValue {...props} action={action} />;
  }

  if (Array.isArray(value)) {
    return (
      <ul>
        {(value as unknown[]).map((entry, index) => (
          <li key={index}>
            <FieldValue
              field={field}
              fieldPath={props.fieldPath}
              value={entry}
              associationActions={props.associationActions}
            />
          </li>
        ))}
      </ul>
    );
  }

  if (field.kind === 'association' && field.fields?.length && typeof value === 'object') {
    return (
      <FieldList
        fields={field.fields}
        item={value as Record<string, unknown>}
        associationActions={props.associationActions}
        pathPrefix={props.fieldPath}
      />
    );
  }

  return <>{formatPrimitiveValue(value)}</>;
}

interface AssociationFieldValueProps extends FieldValueProps {
  action: AssociationNavigationActionDescriptor;
}

function AssociationFieldValue(props: AssociationFieldValueProps) {
  const { field, value } = props;

  if (Array.isArray(value)) {
    return (
      <ul>
        {(value as unknown[]).map((entry, index) => (
          <li key={index}>
            <AssociationFieldValue {...props} value={entry} />
          </li>
        ))}
      </ul>
    );
  }

  const link = <AssociationLink value={value} action={props.action} />;
  if (field.kind === 'association' && field.fields?.length && typeof value === 'object') {
    return (
      <>
        <FieldList
          fields={field.fields}
          item={value as Record<string, unknown>}
          associationActions={props.associationActions}
          pathPrefix={props.fieldPath}
        />
        {link}
      </>
    );
  }

  return link;
}

interface AssociationLinkProps {
  value: unknown;
  action: AssociationNavigationActionDescriptor;
}

function AssociationLink(props: AssociationLinkProps) {
  const entityId = entityIdFromValue(props.value);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  return href ? <a href={href}>View</a> : null;
}

interface ActionLinksProps {
  actions: readonly NavigationActionDescriptor[];
  entityId?: string;
}

function ActionLinks(props: ActionLinksProps) {
  if (props.actions.length === 0) {
    return null;
  }

  return (
    <nav>
      {props.actions.map((action, index) => {
        const href = hrefForAction(action, props.entityId);
        return href ? (
          <span key={action.id}>
            {index > 0 ? ' ' : null}
            <a href={href}>{action.label}</a>
          </span>
        ) : null;
      })}
    </nav>
  );
}
