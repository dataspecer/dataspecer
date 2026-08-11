import { useId } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import { fieldValues, type FieldDescriptor } from '../types/aggregate.ts';
import {
  coerceValue,
  resolveControl,
  toInputValue,
  type FieldControl,
} from '../forms/form-model.ts';
import { cardinalityDescription, maximumCount, minimumCount } from '../forms/entity-target.ts';
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
  const controlId = useId();
  const labelId = `${controlId}-label`;

  return (
    <div className="form-field">
      <label id={labelId} className="form-label" htmlFor={field.many ? undefined : controlId}>
        {field.label}
        {minimumCount(field) > 0 ? <span className="form-required"> *</span> : null}
      </label>
      <div
        className="form-control"
        role={field.many ? 'group' : undefined}
        aria-labelledby={field.many ? labelId : undefined}
      >
        {field.many ? (
          <ManyControl
            field={field}
            value={value}
            dataSource={dataSource}
            controlId={controlId}
            onChange={onChange}
          />
        ) : (
          <SingleControl
            field={field}
            value={value}
            dataSource={dataSource}
            controlId={controlId}
            onChange={onChange}
          />
        )}
        {field.many ? <span className="field-note">{cardinalityDescription(field)}.</span> : null}
        {control === 'unsupported' ? (
          <span className="field-note">This field type is read-only.</span>
        ) : null}
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </div>
  );
}

type ControlProps = Omit<FormFieldProps, 'error'> & { controlId: string };

function SingleControl(props: ControlProps) {
  const { field, value, dataSource, controlId, onChange } = props;
  const control = resolveControl(field);

  if (control === 'unsupported' || control === 'composition') {
    return <input id={controlId} type="text" disabled value={toInputValue('text', value)} />;
  }

  if (control === 'reference') {
    const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : undefined;
    return (
      <ReferenceSelect
        field={field}
        values={typeof id === 'string' && id !== '' ? [id] : []}
        multiple={false}
        dataSource={dataSource}
        controlId={controlId}
        onChange={(ids) => onChange(ids[0] ? { id: ids[0] } : undefined)}
      />
    );
  }

  return <PrimitiveControl id={controlId} control={control} value={value} onChange={onChange} />;
}

function ManyControl(props: ControlProps) {
  const { field, value, dataSource, controlId, onChange } = props;
  const control = resolveControl(field);
  const values = fieldValues(value, field);

  if (control === 'reference') {
    const ids = values.flatMap((entry) => {
      const id = entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined;
      return typeof id === 'string' && id !== '' ? [id] : [];
    });
    return (
      <ReferenceSelect
        field={field}
        values={ids}
        multiple
        dataSource={dataSource}
        controlId={controlId}
        onChange={(next) => onChange(next.map((id) => ({ id })))}
      />
    );
  }

  if (control === 'unsupported' || control === 'composition') {
    return <input id={controlId} type="text" disabled value="" />;
  }

  return (
    <RepeatingPrimitiveControl
      field={field}
      control={control}
      values={values}
      controlId={controlId}
      onChange={onChange}
    />
  );
}

interface PrimitiveControlProps {
  id: string;
  ariaLabel?: string;
  control: Exclude<FieldControl, 'reference' | 'composition' | 'unsupported'>;
  value: unknown;
  onChange: (value: unknown) => void;
}

function PrimitiveControl(props: PrimitiveControlProps) {
  if (props.control === 'checkbox') {
    return (
      <input
        id={props.id}
        aria-label={props.ariaLabel}
        type="checkbox"
        checked={Boolean(props.value)}
        onChange={(event) => props.onChange(coerceValue(props.control, '', event.target.checked))}
      />
    );
  }

  const inputType = props.control === 'datetime' ? 'datetime-local' : props.control;
  return (
    <input
      id={props.id}
      aria-label={props.ariaLabel}
      type={inputType}
      value={toInputValue(props.control, props.value)}
      onChange={(event) => props.onChange(coerceValue(props.control, event.target.value, false))}
    />
  );
}

interface RepeatingPrimitiveControlProps {
  field: FieldDescriptor;
  control: PrimitiveControlProps['control'];
  values: unknown[];
  controlId: string;
  onChange: (value: unknown[]) => void;
}

function RepeatingPrimitiveControl(props: RepeatingPrimitiveControlProps) {
  const minimum = minimumCount(props.field);
  const maximum = maximumCount(props.field);
  const add = () => {
    props.onChange([...props.values, props.control === 'checkbox' ? false : undefined]);
  };
  const remove = (index: number) => {
    props.onChange(props.values.filter((_, candidate) => candidate !== index));
  };

  return (
    <div className="repeating-values">
      {props.values.map((value, index) => (
        <div className="repeating-value" key={index}>
          <PrimitiveControl
            id={`${props.controlId}-${index}`}
            ariaLabel={`${props.field.label} ${index + 1}`}
            control={props.control}
            value={value}
            onChange={(next) => {
              const values = [...props.values];
              values[index] = next;
              props.onChange(values);
            }}
          />
          <button
            type="button"
            disabled={props.values.length <= minimum}
            onClick={() => remove(index)}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={maximum !== null && props.values.length >= maximum}
        onClick={add}
      >
        Add {props.field.label.toLocaleLowerCase()}
      </button>
    </div>
  );
}
