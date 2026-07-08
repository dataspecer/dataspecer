import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { formatPrimitiveValue } from './field-value.ts';

export interface DetailViewProps<TModel extends EntityModel> {
  title: string;
  fields: FieldDescriptor[];
  item: TModel;
}

export function DetailView<TModel extends EntityModel>(props: DetailViewProps<TModel>) {
  return (
    <section>
      <h2>{props.title}</h2>
      <FieldList fields={props.fields} item={props.item as Record<string, unknown>} />
    </section>
  );
}

interface FieldListProps {
  fields: FieldDescriptor[];
  item: Record<string, unknown>;
}

function FieldList(props: FieldListProps) {
  return (
    <dl>
      {props.fields.map((field) => (
        <div key={field.path}>
          <dt>{field.label}</dt>
          <dd>
            <FieldValue field={field} value={props.item[field.propertyName]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface FieldValueProps {
  field: FieldDescriptor;
  value: unknown;
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

  if (Array.isArray(value)) {
    return (
      <ul>
        {(value as unknown[]).map((entry, index) => (
          <li key={index}>
            <FieldValue field={field} value={entry} />
          </li>
        ))}
      </ul>
    );
  }

  if (field.kind === 'association' && field.fields?.length && typeof value === 'object') {
    return <FieldList fields={field.fields} item={value as Record<string, unknown>} />;
  }

  return <>{formatPrimitiveValue(value)}</>;
}
