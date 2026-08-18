import { useEffect, useMemo, useState } from 'react';
import Autocomplete, {
  createFilterOptions,
  type AutocompleteChangeReason,
} from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { ReferenceOption } from '../datasource/data-source.ts';
import { useDataSource } from '../datasource/data-source-context.tsx';
import { maximumCount, minimumCount, referenceDisplayFields } from '../forms/entity-target.ts';
import { isSafeAbsoluteIri } from '../forms/iri.ts';
import type { AggregateDescriptorMap, FieldDescriptor } from '../types/aggregate.ts';

interface ReferenceSelectProps {
  field: FieldDescriptor;
  values: string[];
  multiple: boolean;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (values: string[]) => void;
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

/**
 * Picks references by searching the instances of the target class.
 */
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
  const [manualError, setManualError] = useState<string | null>(null);
  const minimum = minimumCount(field);
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

  const filterOptions = useMemo(
    () =>
      createFilterOptions<string>({
        stringify: (option) => `${labelOf(option)} ${option}`,
        trim: true,
      }),
    [labelOf]
  );

  const selectable = useMemo(() => {
    const listed = new Set(options.map((option) => option.id));
    return [...values.filter((id) => !listed.has(id)), ...options.map((option) => option.id)];
  }, [options, values]);

  // only text the user typed is a candidate IRI, and it is accepted only when it is valid
  const commit = (next: readonly string[], reason: AutocompleteChangeReason) => {
    const typed =
      reason === 'createOption'
        ? next.find((id) => !values.includes(id) && !selectable.includes(id))
        : undefined;
    if (typed !== undefined) {
      const result = addManualReference(values, typed, multiple, maximum);
      setManualError(result.error);
      if (result.error === null) {
        onChange(result.values);
      }
      return;
    }
    setManualError(null);
    onChange([...next]);
  };

  return (
    <Autocomplete
      multiple={multiple}
      freeSolo
      handleHomeEndKeys
      loading={loading}
      options={selectable}
      filterOptions={filterOptions}
      slotProps={{ paper: { elevation: 8 } }}
      value={multiple ? values : (values[0] ?? null)}
      getOptionLabel={(option) => (typeof option === 'string' ? labelOf(option) : '')}
      isOptionEqualToValue={(option, value) => option === value}
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
      renderValue={
        multiple
          ? (selected, getItemProps) =>
              (selected as string[]).map((option, index) => (
                <Chip
                  {...getItemProps({ index })}
                  key={option}
                  label={labelOf(option)}
                  disabled={values.length <= minimum}
                />
              ))
          : undefined
      }
      onChange={(_event, next, reason) => {
        if (next === null) {
          commit([], reason);
          return;
        }
        commit(typeof next === 'string' ? [next] : next, reason);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          id={controlId}
          placeholder={values.length > 0 ? undefined : 'Search or enter an IRI'}
          error={manualError !== null}
          helperText={manualError ?? undefined}
        />
      )}
    />
  );
}
