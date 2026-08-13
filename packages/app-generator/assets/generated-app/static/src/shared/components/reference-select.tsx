import { useEffect, useMemo, useRef, useState } from 'react';

import type { DataSource, ReferenceOption } from '../datasource/data-source.ts';
import { maximumCount, minimumCount, referenceDisplayFields } from '../forms/entity-target.ts';
import type { AggregateDescriptorMap, FieldDescriptor } from '../types/aggregate.ts';

interface ReferenceSelectProps {
  field: FieldDescriptor;
  values: string[];
  multiple: boolean;
  dataSource: DataSource;
  aggregateRegistry: AggregateDescriptorMap;
  controlId: string;
  onChange: (values: string[]) => void;
}

/**
 * Selects one or more references in a searchable dialog. It falls back to plain IRI inputs when
 * the datasource cannot enumerate instances of the target class.
 */
export function ReferenceSelect(props: ReferenceSelectProps) {
  const { field, values, multiple, dataSource, aggregateRegistry, controlId, onChange } = props;
  const classIri = field.targetClassIri;
  const displayFields = useMemo(
    () => referenceDisplayFields(field, aggregateRegistry),
    [aggregateRegistry, field]
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const [options, setOptions] = useState<ReferenceOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<string[]>(values);
  const minimum = minimumCount(field);
  const maximum = maximumCount(field);

  useEffect(() => {
    setOptions(null);
    setFailed(false);
    if (!classIri || !dataSource.listByType) {
      setFailed(true);
      return;
    }
    let active = true;
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
          setFailed(false);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [classIri, dataSource, displayFields]);

  const optionById = useMemo(
    () => new Map((options ?? []).map((option) => [option.id, option])),
    [options]
  );
  const visibleOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? (options ?? []).filter(
          (option) =>
            option.label.toLocaleLowerCase().includes(query) ||
            option.id.toLocaleLowerCase().includes(query)
        )
      : (options ?? []);
  }, [options, search]);

  if (failed) {
    return (
      <IriInputs
        values={values}
        multiple={multiple}
        minimum={minimum}
        maximum={maximum}
        controlId={controlId}
        fieldLabel={field.label}
        onChange={onChange}
      />
    );
  }

  const open = () => {
    setSelection(values);
    setSearch('');
    dialog.current?.showModal();
  };
  const toggle = (id: string) => {
    setSelection((previous) =>
      multiple
        ? previous.includes(id)
          ? previous.filter((entry) => entry !== id)
          : maximum === null || previous.length < maximum
            ? [...previous, id]
            : previous
        : [id]
    );
  };
  const apply = () => {
    onChange(selection);
    dialog.current?.close();
  };

  return (
    <div className="reference-picker">
      {values.length > 0 ? (
        <ul className="reference-selection">
          {values.map((id) => (
            <li key={id}>
              <span>{optionById.get(id)?.label ?? id}</span>
              <button
                type="button"
                aria-label={`Remove ${optionById.get(id)?.label ?? id}`}
                disabled={multiple && values.length <= minimum}
                onClick={() => onChange(values.filter((entry) => entry !== id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <span className="field-note">No reference selected.</span>
      )}

      <button id={controlId} type="button" disabled={options === null} onClick={open}>
        {options === null
          ? 'Loading options…'
          : multiple
            ? 'Choose references'
            : values.length > 0
              ? 'Change reference'
              : 'Choose reference'}
      </button>

      <dialog ref={dialog} className="reference-dialog">
        <div className="reference-dialog-content">
          <h3>{field.label}</h3>
          <label>
            <span className="visually-hidden">Search references</span>
            <input
              type="search"
              placeholder="Search by label or IRI"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="reference-options">
            {visibleOptions.length > 0 ? (
              visibleOptions.map((option) => {
                const checked = selection.includes(option.id);
                return (
                  <label key={option.id} className="reference-option">
                    <input
                      type={multiple ? 'checkbox' : 'radio'}
                      name={`reference-${field.path}`}
                      checked={checked}
                      disabled={
                        multiple && !checked && maximum !== null && selection.length >= maximum
                      }
                      onChange={() => toggle(option.id)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.id}</small>
                    </span>
                  </label>
                );
              })
            ) : (
              <p>No matching references.</p>
            )}
          </div>
          <div className="reference-dialog-actions">
            <button type="button" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button
              type="button"
              disabled={
                selection.length < minimum || (maximum !== null && selection.length > maximum)
              }
              onClick={apply}
            >
              Apply
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

interface IriInputsProps {
  values: string[];
  multiple: boolean;
  minimum: number;
  maximum: number | null;
  controlId: string;
  fieldLabel: string;
  onChange: (values: string[]) => void;
}

function IriInputs(props: IriInputsProps) {
  if (!props.multiple) {
    return (
      <input
        id={props.controlId}
        type="text"
        value={props.values[0] ?? ''}
        placeholder="Reference IRI"
        onChange={(event) => props.onChange(event.target.value ? [event.target.value] : [])}
      />
    );
  }

  const values =
    props.values.length >= props.minimum
      ? props.values
      : [...props.values, ...Array<string>(props.minimum - props.values.length).fill('')];

  return (
    <div className="repeating-values">
      {values.map((value, index) => (
        <div className="repeating-value" key={index}>
          <input
            id={`${props.controlId}-${index}`}
            aria-label={`${props.fieldLabel} ${index + 1}`}
            type="text"
            value={value}
            placeholder="Reference IRI"
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              props.onChange(next);
            }}
          />
          <button
            type="button"
            disabled={values.length <= props.minimum}
            onClick={() => props.onChange(values.filter((_, candidate) => candidate !== index))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={props.maximum !== null && values.length >= props.maximum}
        onClick={() => props.onChange([...values, ''])}
      >
        Add reference
      </button>
    </div>
  );
}
