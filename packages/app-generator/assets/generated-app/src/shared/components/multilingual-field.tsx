import { useId } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';

import { maximumCount, minimumCount } from '../forms/entity-target.ts';
import {
  languageLabel,
  multilingualLanguageTags,
  multilingualValuesForLanguage,
  withMultilingualLanguage,
} from '../forms/multilingual-value.ts';
import type { FieldDescriptor } from '../types/aggregate.ts';
import { FieldLabel } from './field-label.tsx';

interface MultilingualFieldProps {
  field: FieldDescriptor;
  value: unknown;
  language: string;
  error?: string;
  onChange: (value: unknown) => void;
}

/** Edits every value in the selected language while retaining the other language buckets. */
export function MultilingualField(props: MultilingualFieldProps) {
  const controlId = useId();
  const labelId = `${controlId}-label`;
  const values = multilingualValuesForLanguage(props.value, props.language);
  const filledLanguages = multilingualLanguageTags(props.value).sort().map(languageLabel);
  // scalar data with more than one stored value stays visible so the user can resolve it
  const rows = props.field.many || values.length > 0 ? values : [''];
  const maximum = maximumCount(props.field);
  const changeValues = (next: string[]) =>
    props.onChange(withMultilingualLanguage(props.value, props.language, next));

  return (
    <FormControl error={props.error !== undefined} fullWidth>
      <FormLabel id={labelId} required={minimumCount(props.field) > 0} sx={{ mb: 0.5 }}>
        <FieldLabel field={props.field} />
      </FormLabel>
      <Stack spacing={1} sx={{ alignItems: 'flex-start' }} role="group" aria-labelledby={labelId}>
        {rows.map((value, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', width: '100%' }}
          >
            <TextField
              id={`${controlId}-${index}`}
              aria-label={`${props.field.label}, ${languageLabel(props.language)}, value ${index + 1}`}
              value={value}
              placeholder={
                props.field.examples?.[0] ? `Example: ${props.field.examples[0]}` : undefined
              }
              multiline
              maxRows={8}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0 }}>
                      <Chip size="small" label={languageLabel(props.language)} />
                    </InputAdornment>
                  ),
                },
              }}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                changeValues(next);
              }}
            />
            {(props.field.many || rows.length > 1) && (
              <Tooltip title={`Remove ${props.field.label} ${index + 1}`}>
                <IconButton
                  color="error"
                  aria-label={`Remove ${props.field.label} ${index + 1}`}
                  onClick={() => changeValues(rows.filter((_, candidate) => candidate !== index))}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ))}
        {props.field.many ? (
          <Button
            startIcon={<AddIcon />}
            disabled={maximum !== null && values.length >= maximum}
            onClick={() => changeValues([...values, ''])}
          >
            Add {props.field.label.toLocaleLowerCase()}
          </Button>
        ) : null}
      </Stack>
      <FormHelperText>
        {filledLanguages.length > 0
          ? `Has values: ${filledLanguages.join(', ')}`
          : 'No values entered'}
      </FormHelperText>
      {props.error ? <FormHelperText>{props.error}</FormHelperText> : null}
    </FormControl>
  );
}
