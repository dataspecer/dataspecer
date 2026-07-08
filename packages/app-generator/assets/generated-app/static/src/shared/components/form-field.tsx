import type { DataSource } from '../datasource/data-source.ts';
import type { FieldDescriptor } from '../types/aggregate.ts';
import { coerceValue, resolveControl, toInputValue } from '../forms/form-model.ts';
import { ReferenceSelect } from './reference-select.tsx';

interface FormFieldProps {
  field: FieldDescriptor;
  value: unknown;
  error?: string;
  dataSource: DataSource;
  onChange: (value: unknown) => void;
}

export function FormField(props: FormFieldProps) {
  const { field, value, error, dataSource, onChange } = props;
  const control = resolveControl(field);

  return (
    <div className="form-field">
      <label className="form-label">
        {field.label}
        {field.required ? <span className="form-required"> *</span> : null}
      </label>
      <div className="form-control">
        <Control field={field} value={value} dataSource={dataSource} onChange={onChange} />
        {control === 'unsupported' ? (
          <span className="field-note">Not editable in this prototype.</span>
        ) : null}
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </div>
  );
}

function Control(props: Omit<FormFieldProps, 'error'>) {
  const { field, value, dataSource, onChange } = props;
  const control = resolveControl(field);

  if (control === 'unsupported') {
    return <input type="text" disabled value={toInputValue('text', value)} />;
  }

  if (control === 'reference') {
    // A reference value is an entity IRI object, but the select works in plain IRIs, so unwrap
    // the id going in and wrap the chosen IRI back into an object (or clear it) coming out.
    const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : undefined;
    const current = typeof id === 'string' ? id : '';
    return (
      <ReferenceSelect
        field={field}
        value={current}
        dataSource={dataSource}
        onChange={(iri) => onChange(iri ? { id: iri } : undefined)}
      />
    );
  }

  if (control === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => onChange(coerceValue(control, '', event.target.checked))}
      />
    );
  }

  const inputType = control === 'datetime' ? 'datetime-local' : control;
  return (
    <input
      type={inputType}
      value={toInputValue(control, value)}
      onChange={(event) => onChange(coerceValue(control, event.target.value, false))}
    />
  );
}
