import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { formatFieldValue } from './field-value.ts';

export interface ListViewProps<TModel extends EntityModel> {
  title: string;
  fields: FieldDescriptor[];
  items: TModel[];
}

export function ListView<TModel extends EntityModel>(props: ListViewProps<TModel>) {
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
            <tr key={item.id ?? index}>
              {props.fields.map((field) => (
                <td key={field.path}>
                  {formatFieldValue(field, (item as Record<string, unknown>)[field.propertyName])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
