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
import type { AggregateDescriptorMap, FieldDescriptor } from '../types/aggregate.ts';

interface ReferenceSelectProps {
  field: FieldDescriptor;
  values: string[];
  multiple: boolean;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (values: string[]) => void;
}

/** Selects references from instances of the target class, one editable row per value. */
export function ReferenceSelect(props: ReferenceSelectProps) {
  const dataSource = useDataSource();
  const { field, values, multiple, aggregateRegistry, controlId, onChange } = props;
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
  const inputAction = classIri && dataSource.listByType ? 'Search or enter an IRI' : 'Enter an IRI';
  const placeholder = field.examples?.[0]
    ? `${inputAction}, e.g. ${field.examples[0]}`
    : inputAction;

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

  const replaceAt = (index: number, iri: string): void => {
    const next = [...values];
    next[index] = iri.trim();
    onChange(next);
  };

  const append = (iri: string, keepAdding: boolean): void => {
    const next = [...values, iri.trim()];
    onChange(next);
    // committing with Enter keeps the draft row open unless the field is now full
    setDraft(keepAdding && (maximum === null || next.length < maximum));
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
        placeholder={placeholder}
        clearable
        onCommit={(iri) => {
          onChange(iri === null ? [] : [iri.trim()]);
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
            placeholder={placeholder}
            onCommit={(iri) => {
              if (iri !== null) {
                replaceAt(index, iri);
              }
            }}
          />
          <Tooltip title={`Remove ${field.label} ${index + 1}`}>
            <IconButton
              color="error"
              aria-label={`Remove ${field.label} ${index + 1}`}
              onClick={() => {
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
            placeholder={placeholder}
            autoFocus
            inputRef={draftInputRef}
            onCommit={(iri, keepAdding) => {
              if (iri !== null) {
                append(iri, keepAdding ?? false);
              }
            }}
          />
          <Tooltip title={`Discard new ${field.label}`}>
            <IconButton
              color="error"
              aria-label={`Discard new ${field.label}`}
              onClick={() => setDraft(false)}
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
  placeholder: string;
  clearable?: boolean;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  onCommit: (iri: string | null, keepAdding?: boolean) => void;
}

/** One reference value, selectable from the store or entered as a free IRI. */
function ReferenceRow(props: ReferenceRowProps) {
  const { value, labelOf, onCommit } = props;
  const [inputText, setInputText] = useState(value ?? '');

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
    if (typed === '' || typed === (value ?? '')) {
      setInputText(value ?? '');
      return;
    }
    onCommit(typed);
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
      }}
      getOptionLabel={(option) => (typeof option === 'string' ? option : '')}
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
          onCommit(null);
          return;
        }
        if (typeof next === 'string') {
          onCommit(next, true);
          if (value === null) {
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
          placeholder={props.placeholder}
          onBlur={commitTyped}
        />
      )}
    />
  );
}
