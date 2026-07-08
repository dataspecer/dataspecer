import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { formatFieldValue } from './field-value.ts';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type NavigationActionDescriptor,
} from '../navigation/navigation.ts';

export interface ListViewProps<TModel extends EntityModel> {
  title: string;
  fields: FieldDescriptor[];
  items: TModel[];
  pageActions?: readonly NavigationActionDescriptor[];
  rowActions?: readonly NavigationActionDescriptor[];
  associationActions?: readonly AssociationNavigationActionDescriptor[];
}

export function ListView<TModel extends EntityModel>(props: ListViewProps<TModel>) {
  const pageActions = props.pageActions ?? [];
  const rowActions = props.rowActions ?? [];
  const associationActions = props.associationActions ?? [];

  return (
    <section>
      <h2>{props.title}</h2>
      <ActionLinks actions={pageActions} />
      <table>
        <thead>
          <tr>
            {props.fields.map((field) => (
              <th key={field.path}>{field.label}</th>
            ))}
            {rowActions.length > 0 ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, index) => (
            <tr key={item.id ?? index}>
              {props.fields.map((field) => (
                <td key={field.path}>
                  <FieldCell
                    field={field}
                    value={(item as Record<string, unknown>)[field.propertyName]}
                    action={associationActions.find((action) => action.fieldPath === field.path)}
                  />
                </td>
              ))}
              {rowActions.length > 0 ? (
                <td>
                  <ActionLinks actions={rowActions} entityId={item.id} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface FieldCellProps {
  field: FieldDescriptor;
  value: unknown;
  action?: AssociationNavigationActionDescriptor;
}

function FieldCell(props: FieldCellProps) {
  if (!props.action) {
    return <>{formatFieldValue(props.field, props.value)}</>;
  }

  if (Array.isArray(props.value)) {
    return (
      <>
        {(props.value as unknown[]).map((entry, index) => (
          <span key={index}>
            {index > 0 ? ', ' : null}
            <LinkedFieldValue field={props.field} value={entry} action={props.action} />
          </span>
        ))}
      </>
    );
  }

  return <LinkedFieldValue field={props.field} value={props.value} action={props.action} />;
}

interface LinkedFieldValueProps {
  field: FieldDescriptor;
  value: unknown;
  action: AssociationNavigationActionDescriptor;
}

function LinkedFieldValue(props: LinkedFieldValueProps) {
  const entityId = entityIdFromValue(props.value);
  const label = formatFieldValue(props.field, props.value);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  return href ? <a href={href}>{label || entityId}</a> : <>{label}</>;
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
