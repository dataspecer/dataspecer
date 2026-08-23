import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import type { EntityTarget } from '../forms/entity-target.ts';
import type { EntityRecord } from '../types/aggregate.ts';
import { selectedSpecialization } from '../forms/specialization.ts';

interface SpecializationSelectProps {
  target: EntityTarget;
  entity: EntityRecord;
  persisted: boolean;
  error?: string;
  onChange: (specializationIri: string) => void;
}

/** Selects the concrete specialization of a new entity and shows the immutable loaded choice. */
export function SpecializationSelect(props: SpecializationSelectProps) {
  const specializations = props.target.specializations;
  if (!specializations?.length) {
    return null;
  }
  const selected = selectedSpecialization(props.target, props.entity);

  return (
    <TextField
      select
      required
      fullWidth
      label={`${props.target.name} type`}
      value={selected?.specializationIri ?? ''}
      disabled={props.persisted}
      error={props.error !== undefined}
      helperText={
        props.error ??
        (props.persisted
          ? 'The specialization cannot be changed after this entity has been saved.'
          : 'Choose the concrete type to create. The choice becomes read-only after saving.')
      }
      onChange={(event) => props.onChange(event.target.value)}
    >
      <MenuItem value="" disabled>
        Select a type
      </MenuItem>
      {specializations.map((specialization) => (
        <MenuItem key={specialization.specializationIri} value={specialization.specializationIri}>
          {specialization.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
