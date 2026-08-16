import { useId } from 'react';
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

import type { DataSource } from '../datasource/data-source.ts';
import {
  fieldValues,
  type AggregateDescriptorMap,
  type FieldDescriptor,
} from '../types/aggregate.ts';
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
  aggregateRegistry: AggregateDescriptorMap;
  onChange: (value: unknown) => void;
}

export function FormField(props: FormFieldProps) {
  const { field, value, error, dataSource, aggregateRegistry, onChange } = props;
  const control = resolveControl(field);
  const controlId = useId();
  const labelId = `${controlId}-label`;
  const required = minimumCount(field) > 0;
  const note = control === 'unsupported' ? 'This field type is read-only.' : undefined;
  const cardinality = field.many ? cardinalityDescription(field) : '';

  const readOnly = control === 'unsupported' || control === 'composition';

  if (!field.many && control !== 'reference') {
    return (
      <PrimitiveControl
        id={controlId}
        label={field.label}
        control={control}
        value={value}
        required={required}
        readOnly={readOnly}
        error={error}
        helperText={note}
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
        {field.label}
      </FormLabel>
      <div {...(field.many ? { role: 'group', 'aria-labelledby': labelId } : {})}>
        {control === 'reference' ? (
          <ReferenceControl
            field={field}
            value={value}
            dataSource={dataSource}
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
  dataSource: DataSource;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (value: unknown) => void;
}

function ReferenceControl(props: ReferenceControlProps) {
  const { field, value, dataSource, aggregateRegistry, controlId, onChange } = props;
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
        dataSource={dataSource}
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
      dataSource={dataSource}
      aggregateRegistry={aggregateRegistry}
      controlId={controlId}
      onChange={(ids) => onChange(ids[0] ? { id: ids[0] } : undefined)}
    />
  );
}

type PrimitiveKind = Exclude<FieldControl, 'reference'>;

interface PrimitiveControlProps {
  id: string;
  label?: string;
  ariaLabel?: string;
  control: PrimitiveKind;
  value: unknown;
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
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
    // The models hold native Date objects, the pickers work in Luxon values.
    const current =
      value instanceof Date && !Number.isNaN(value.getTime()) ? DateTime.fromJSDate(value) : null;
    const Picker = control === 'date' ? DatePicker : DateTimePicker;
    return (
      <Picker
        label={props.label}
        ampm={false}
        value={current}
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
      slotProps={{
        htmlInput: { step: control === 'number' ? 'any' : undefined, readOnly: props.readOnly },
      }}
      disabled={props.readOnly}
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
  const minimum = minimumCount(props.field);
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
              disabled={props.readOnly || props.values.length <= minimum}
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
