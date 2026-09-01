import { useId, type ReactNode } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { DateTime } from 'luxon';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

import {
  fieldValues,
  type AggregateDescriptorMap,
  type FieldDescriptor,
} from '../types/aggregate.ts';
import {
  coerceValue,
  dateOnlyParts,
  dateOnlyFromParts,
  resolveControl,
  toInputValue,
  type FieldControl,
} from '../forms/form-model.ts';
import { cardinalityDescription, maximumCount, minimumCount } from '../forms/entity-target.ts';
import { ReferenceSelect } from './reference-select.tsx';
import { MultilingualField } from './multilingual-field.tsx';
import { FieldLabel } from './field-label.tsx';

interface FormFieldProps {
  field: FieldDescriptor;
  value: unknown;
  language: string;
  error?: string;
  aggregateRegistry: AggregateDescriptorMap;
  onChange: (value: unknown) => void;
}

export function FormField(props: FormFieldProps) {
  const { field, value, error, aggregateRegistry, onChange } = props;
  const control = resolveControl(field);
  const controlId = useId();
  const labelId = `${controlId}-label`;
  const required = minimumCount(field) > 0;
  const note = control === 'unsupported' ? 'This field type is read-only.' : undefined;
  const cardinality = field.many ? cardinalityDescription(field) : '';

  const readOnly = control === 'unsupported';

  if (control === 'multilingual') {
    return (
      <MultilingualField
        field={field}
        value={value}
        language={props.language}
        error={error}
        onChange={onChange}
      />
    );
  }

  if (!field.many && control !== 'reference') {
    return (
      <PrimitiveControl
        id={controlId}
        label={<FieldLabel field={field} />}
        ariaLabel={field.label}
        control={control}
        value={value}
        required={required}
        readOnly={readOnly}
        error={error}
        helperText={note}
        placeholder={examplePlaceholder(field)}
        onChange={onChange}
      />
    );
  }

  return (
    <FormControl error={error !== undefined} fullWidth>
      <FormLabel
        id={labelId}
        htmlFor={field.many ? undefined : controlId}
        required={required}
        sx={{ mb: 0.5 }}
      >
        <FieldLabel field={field} />
      </FormLabel>
      <div {...(field.many ? { role: 'group', 'aria-labelledby': labelId } : {})}>
        {control === 'reference' ? (
          <ReferenceControl
            field={field}
            value={value}
            aggregateRegistry={aggregateRegistry}
            controlId={controlId}
            onChange={onChange}
          />
        ) : (
          <RepeatingPrimitiveControl
            field={field}
            control={control}
            readOnly={readOnly}
            values={fieldValues(value, field)}
            controlId={controlId}
            onChange={onChange}
          />
        )}
      </div>
      {cardinality ? <FormHelperText>{cardinality}.</FormHelperText> : null}
      {note ? <FormHelperText>{note}</FormHelperText> : null}
      {error ? <FormHelperText>{error}</FormHelperText> : null}
    </FormControl>
  );
}

interface ReferenceControlProps {
  field: FieldDescriptor;
  value: unknown;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (value: unknown) => void;
}

function ReferenceControl(props: ReferenceControlProps) {
  const { field, value, aggregateRegistry, controlId, onChange } = props;
  if (field.many) {
    const ids = fieldValues(value, field).flatMap((entry) => {
      const id = entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined;
      return typeof id === 'string' && id !== '' ? [id] : [];
    });
    return (
      <ReferenceSelect
        field={field}
        values={ids}
        multiple
        aggregateRegistry={aggregateRegistry}
        controlId={controlId}
        onChange={(next) => onChange(next.map((id) => ({ id })))}
      />
    );
  }

  const id = value && typeof value === 'object' ? (value as { id?: unknown }).id : undefined;
  return (
    <ReferenceSelect
      field={field}
      values={typeof id === 'string' && id !== '' ? [id] : []}
      multiple={false}
      aggregateRegistry={aggregateRegistry}
      controlId={controlId}
      onChange={(ids) => onChange(ids[0] ? { id: ids[0] } : undefined)}
    />
  );
}

type PrimitiveKind = Exclude<FieldControl, 'reference'>;

interface PrimitiveControlProps {
  id: string;
  label?: ReactNode;
  ariaLabel?: string;
  control: PrimitiveKind;
  value: unknown;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
  onChange: (value: unknown) => void;
}

function PrimitiveControl(props: PrimitiveControlProps) {
  const { control, value, onChange } = props;
  const shared = {
    required: props.required,
    error: props.error !== undefined,
    helperText: props.error ?? props.helperText,
  };

  if (control === 'checkbox') {
    return (
      <FormControl error={props.error !== undefined}>
        <FormControlLabel
          control={
            <Checkbox
              id={props.id}
              checked={Boolean(value)}
              onChange={(event) => onChange(coerceValue(control, '', event.target.checked))}
            />
          }
          label={props.label ?? props.ariaLabel ?? ''}
        />
        {shared.helperText ? <FormHelperText>{shared.helperText}</FormHelperText> : null}
      </FormControl>
    );
  }

  if (control === 'date' || control === 'datetime') {
    // Date-only values use UTC midnight so serialization cannot change the calendar day.
    const modelValue = value instanceof Date && !Number.isNaN(value.getTime()) ? value : undefined;
    if (control === 'date') {
      const current = modelValue ? DateTime.fromObject(dateOnlyParts(modelValue)) : null;
      return (
        <DatePicker
          label={props.label}
          value={current}
          onChange={(next: DateTime | null) =>
            onChange(next ? dateOnlyFromParts(next.year, next.month, next.day) : undefined)
          }
          slotProps={{
            textField: { id: props.id, 'aria-label': props.ariaLabel, ...shared },
          }}
        />
      );
    }
    return (
      <DateTimePicker
        label={props.label}
        ampm={false}
        value={modelValue ? DateTime.fromJSDate(modelValue) : null}
        onChange={(next: DateTime | null) => onChange(next?.toJSDate() ?? undefined)}
        slotProps={{
          textField: { id: props.id, 'aria-label': props.ariaLabel, ...shared },
        }}
      />
    );
  }

  return (
    <TextField
      id={props.id}
      label={props.label}
      aria-label={props.ariaLabel}
      type={control === 'number' || control === 'integer' ? 'number' : 'text'}
      multiline={control === 'text'}
      maxRows={8}
      slotProps={{
        htmlInput: { step: control === 'number' ? 'any' : undefined },
      }}
      disabled={props.readOnly}
      placeholder={props.placeholder}
      value={toInputValue(control, value)}
      onChange={(event) => onChange(coerceValue(control, event.target.value, false))}
      {...shared}
    />
  );
}

interface RepeatingPrimitiveControlProps {
  field: FieldDescriptor;
  control: PrimitiveKind;
  values: unknown[];
  controlId: string;
  readOnly: boolean;
  onChange: (value: unknown[]) => void;
}

function RepeatingPrimitiveControl(props: RepeatingPrimitiveControlProps) {
  const maximum = maximumCount(props.field);

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      {props.values.map((value, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
          <PrimitiveControl
            id={`${props.controlId}-${index}`}
            ariaLabel={`${props.field.label} ${index + 1}`}
            control={props.control}
            value={value}
            readOnly={props.readOnly}
            placeholder={examplePlaceholder(props.field)}
            onChange={(next) => {
              const values = [...props.values];
              values[index] = next;
              props.onChange(values);
            }}
          />
          <Tooltip title={`Remove ${props.field.label} ${index + 1}`}>
            <IconButton
              color="error"
              aria-label={`Remove ${props.field.label} ${index + 1}`}
              disabled={props.readOnly}
              onClick={() =>
                props.onChange(props.values.filter((_, candidate) => candidate !== index))
              }
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ))}
      <Button
        startIcon={<AddIcon />}
        disabled={props.readOnly || (maximum !== null && props.values.length >= maximum)}
        onClick={() =>
          props.onChange([...props.values, props.control === 'checkbox' ? false : undefined])
        }
      >
        Add {props.field.label.toLocaleLowerCase()}
      </Button>
    </Stack>
  );
}

function examplePlaceholder(field: FieldDescriptor): string | undefined {
  const example = field.examples?.[0];
  return example ? `Example: ${example}` : undefined;
}
