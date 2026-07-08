import { useEffect, useState } from 'react';

import type { DataSource, ReferenceOption } from '../datasource/data-source.ts';
import type { FieldDescriptor } from '../types/aggregate.ts';

interface ReferenceSelectProps {
  field: FieldDescriptor;
  value: string;
  dataSource: DataSource;
  onChange: (value: string) => void;
}

/**
 * Chooses a reference target by IRI. Options are read from the datasource by the target class, so
 * the target does not need its own generated page. Falls back to a plain IRI text box when the
 * datasource cannot list by type or the lookup fails.
 */
export function ReferenceSelect(props: ReferenceSelectProps) {
  const { field, value, dataSource, onChange } = props;
  const classIri = field.targetClassIri;
  const [options, setOptions] = useState<ReferenceOption[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!classIri || !dataSource.listByType) {
      setFailed(true);
      return;
    }
    let active = true;
    dataSource
      .listByType(classIri)
      .then((result) => {
        if (active) {
          setOptions(result);
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
  }, [classIri, dataSource]);

  if (failed) {
    return (
      <input
        type="text"
        value={value}
        placeholder="Reference IRI"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (options === null) {
    return <span className="field-note">Loading options…</span>;
  }

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">— none —</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
