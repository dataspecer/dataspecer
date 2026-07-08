import type { FieldDescriptor } from '../types/aggregate.ts';

export interface ListViewProps<TModel extends Record<string, unknown>> {
  title: string;
  fields: FieldDescriptor[];
  items: TModel[];
}

export function ListView<TModel extends Record<string, unknown>>(props: ListViewProps<TModel>) {
  return (
    <section>
      <h2>{props.title}</h2>
      <table>
        <thead>
          <tr>
            {props.fields.map((field) => (
              <th key={field.path}>{field.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.items.map((item, index) => (
            <tr key={JSON.stringify(item.id ?? index)}>
              {props.fields.map((field) => (
                <td key={field.path}>{formatValue(item[field.propertyName])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
