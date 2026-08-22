import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import type { FieldDescriptor } from '../types/aggregate.ts';

interface FieldLabelProps {
  field: Pick<FieldDescriptor, 'label' | 'description'>;
}

/** Shows a field label with its description in an accessible tooltip. */
export function FieldLabel({ field }: FieldLabelProps) {
  if (!field.description) {
    return <>{field.label}</>;
  }

  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <span>{field.label}</span>
      <Tooltip title={field.description}>
        <Box
          component="span"
          tabIndex={0}
          aria-label={`About ${field.label}`}
          sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <InfoOutlinedIcon sx={{ fontSize: 15 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
