import type { FieldDescriptor } from '../types/aggregate.ts';

export interface DetailViewProps<TModel extends Record<string, unknown>> {
  title: string;
  fields: FieldDescriptor[];
  item: TModel;
}

export function DetailView<TModel extends Record<string, unknown>>(props: DetailViewProps<TModel>) {
  return (
    <section>
      <h2>{props.title}</h2>
      <dl>
        {props.fields.map((field) => (
          <div key={field.path}>
            <dt>{field.label}</dt>
            <dd>{formatValue(props.item[field.propertyName])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ');
  }
  return JSON.stringify(value);
}
