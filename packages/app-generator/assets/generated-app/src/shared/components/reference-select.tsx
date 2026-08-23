import { useEffect, useMemo, useRef, useState } from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import type { ReferenceOption } from '../data-source/data-source.ts';
import { useDataSource } from '../data-source/data-source-context.tsx';
import { maximumCount, referenceDisplayFields } from '../forms/entity-target.ts';
import { isSafeAbsoluteIri } from '../forms/iri.ts';
import type { AggregateDescriptorMap, FieldDescriptor } from '../types/aggregate.ts';

interface ReferenceSelectProps {
  field: FieldDescriptor;
  values: string[];
  multiple: boolean;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (values: string[]) => void;
  onManualError: (error: string | null) => void;
}

export function addManualReference(
  values: readonly string[],
  input: string,
  multiple: boolean,
  maximum: number | null
): { values: string[]; error: string | null } {
  const iri = input.trim();
  if (!isSafeAbsoluteIri(iri)) {
    return { values: [...values], error: 'Enter a valid absolute IRI.' };
  }
  if (values.includes(iri)) {
    return { values: [...values], error: 'This reference is already selected.' };
  }
  if (multiple && maximum !== null && values.length >= maximum) {
    return {
      values: [...values],
      error: `The maximum number of references is ${maximum}.`,
    };
  }
  return { values: multiple ? [...values, iri] : [iri], error: null };
}

/** Selects references from instances of the target class, one editable row per value. */
export function ReferenceSelect(props: ReferenceSelectProps) {
  const dataSource = useDataSource();
  const { field, values, multiple, aggregateRegistry, controlId, onChange, onManualError } = props;
  const classIri = field.targetClassIri;
  const displayFields = useMemo(
    () => referenceDisplayFields(field, aggregateRegistry),
    [aggregateRegistry, field]
  );
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  // at most one row for a value that is still being entered
  const [draft, setDraft] = useState(false);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const maximum = maximumCount(field);

  useEffect(() => {
    if (!classIri || !dataSource.listByType) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    dataSource
      .listByType({
        classIri,
        displayProperties: displayFields.flatMap((displayField) =>
          displayField.propertyIri ? [displayField.propertyIri] : []
        ),
      })
      .then((result) => {
        if (active) {
          setOptions(result);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          setOptions([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [classIri, dataSource, displayFields]);

  const labelOf = useMemo(() => {
    const byId = new Map(options.map((option) => [option.id, option.label]));
    return (id: string) => byId.get(id) ?? id;
  }, [options]);

  const replaceAt = (index: number, iri: string): boolean => {
    const others = values.filter((_, candidate) => candidate !== index);
    const result = addManualReference(others, iri, true, null);
    onManualError(result.error);
    if (result.error === null) {
      const next = [...values];
      next[index] = iri.trim();
      onChange(next);
    }
    return result.error === null;
  };

  const append = (iri: string, keepAdding: boolean): boolean => {
    const result = addManualReference(values, iri, true, maximum);
    onManualError(result.error);
    if (result.error === null) {
      onChange(result.values);
      // committing with Enter keeps the draft row open for the next value
      setDraft(keepAdding);
    }
    return result.error === null;
  };

  if (!multiple) {
    return (
      <ReferenceRow
        id={controlId}
        ariaLabel={field.label}
        value={values[0] ?? null}
        options={options}
        exclude={[]}
        labelOf={labelOf}
        loading={loading}
        clearable
        onDismissError={() => onManualError(null)}
        onCommit={(iri) => {
          if (iri === null) {
            onManualError(null);
            onChange([]);
            return true;
          }
          const result = addManualReference([], iri, false, null);
          onManualError(result.error);
          if (result.error === null) {
            onChange([iri.trim()]);
          }
          return result.error === null;
        }}
      />
    );
  }

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start', width: '100%' }}>
      {values.map((value, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
          <ReferenceRow
            id={`${controlId}-${index}`}
            ariaLabel={`${field.label} ${index + 1}`}
            value={value}
            options={options}
            exclude={values.filter((_, candidate) => candidate !== index)}
            labelOf={labelOf}
            loading={loading}
            onDismissError={() => onManualError(null)}
            onCommit={(iri) => (iri === null ? true : replaceAt(index, iri))}
          />
          <Tooltip title={`Remove ${field.label} ${index + 1}`}>
            <IconButton
              color="error"
              aria-label={`Remove ${field.label} ${index + 1}`}
              onClick={() => {
                onManualError(null);
                onChange(values.filter((_, candidate) => candidate !== index));
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ))}
      {draft ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
          <ReferenceRow
            id={`${controlId}-new`}
            ariaLabel={`New ${field.label}`}
            value={null}
            options={options}
            exclude={values}
            labelOf={labelOf}
            loading={loading}
            autoFocus
            inputRef={draftInputRef}
            onDismissError={() => onManualError(null)}
            onCommit={(iri, keepAdding) => (iri === null ? true : append(iri, keepAdding ?? false))}
          />
          <Tooltip title={`Discard new ${field.label}`}>
            <IconButton
              color="error"
              aria-label={`Discard new ${field.label}`}
              onClick={() => {
                onManualError(null);
                setDraft(false);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
      <Button
        startIcon={<AddIcon />}
        disabled={maximum !== null && values.length >= maximum}
        onClick={() => {
          if (draft) {
            draftInputRef.current?.focus();
          } else {
            setDraft(true);
          }
        }}
      >
        Add {field.label.toLocaleLowerCase()}
      </Button>
    </Stack>
  );
}

interface ReferenceRowProps {
  id: string;
  ariaLabel: string;
  value: string | null;
  options: ReferenceOption[];
  /** Values held by the other rows, hidden from this row's suggestions. */
  exclude: readonly string[];
  labelOf: (id: string) => string;
  loading: boolean;
  clearable?: boolean;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Returns whether the value was accepted, so a rejected entry keeps its text and error mark. */
  onCommit: (iri: string | null, keepAdding?: boolean) => boolean;
  /** Called when a pending entry is abandoned, so a reported problem does not linger. */
  onDismissError: () => void;
}

/** One reference value, selectable from the store or entered as a free IRI. */
function ReferenceRow(props: ReferenceRowProps) {
  const { value, labelOf, onCommit } = props;
  const [inputText, setInputText] = useState(value === null ? '' : labelOf(value));
  const [rejected, setRejected] = useState(false);

  const selectable = useMemo(() => {
    const hidden = new Set(props.exclude);
    return props.options.flatMap((option) => (hidden.has(option.id) ? [] : [option.id]));
  }, [props.options, props.exclude]);

  const filterOptions = useMemo(
    () =>
      createFilterOptions<string>({
        stringify: (option) => `${labelOf(option)} ${option}`,
        trim: true,
      }),
    [labelOf]
  );

  const commitTyped = () => {
    const typed = inputText.trim();
    if (typed === '' || typed === labelOf(value ?? '')) {
      // nothing new is pending, so the display returns to the stored value and any earlier
      // rejection stops showing
      setInputText(value === null ? '' : labelOf(value));
      setRejected(false);
      props.onDismissError();
      return;
    }
    setRejected(!onCommit(typed));
  };

  return (
    <Autocomplete
      fullWidth
      freeSolo
      handleHomeEndKeys
      disableClearable={!props.clearable}
      loading={props.loading}
      options={selectable}
      filterOptions={filterOptions}
      slotProps={{ paper: { elevation: 8 } }}
      value={value}
      inputValue={inputText}
      onInputChange={(_event, next) => {
        setInputText(next);
        setRejected(false);
      }}
      getOptionLabel={(option) => (typeof option === 'string' ? labelOf(option) : '')}
      isOptionEqualToValue={(option, candidate) => option === candidate}
      renderOption={(optionProps, option) => (
        <li {...optionProps} key={option}>
          <span>
            <Typography variant="body2">{labelOf(option)}</Typography>
            {labelOf(option) === option ? null : (
              <Typography variant="caption" color="text.secondary">
                {option}
              </Typography>
            )}
          </span>
        </li>
      )}
      onChange={(_event, next) => {
        if (next === null) {
          setRejected(!onCommit(null));
          return;
        }
        if (typeof next === 'string') {
          const accepted = onCommit(next, true);
          setRejected(!accepted);
          if (accepted && value === null) {
            setInputText('');
          }
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          id={props.id}
          aria-label={props.ariaLabel}
          autoFocus={props.autoFocus}
          inputRef={props.inputRef}
          placeholder="Search or enter an IRI"
          error={rejected}
          onBlur={commitTyped}
        />
      )}
    />
  );
}
