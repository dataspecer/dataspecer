import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { countIssues, entitySummary } from '../forms/composition-tree.ts';
import {
  cardinalityDescription,
  maximumCount,
  minimumCount,
  opensInOwnPane,
  type EntityTarget,
} from '../forms/entity-target.ts';
import { joinFieldPath } from '../forms/field-path.ts';
import {
  compositionEntities,
  createEntityDraft,
  type EntityPathSegment,
} from '../forms/form-draft.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { issueMessageAt } from '../operations/operation-result.ts';
import type { AggregateDescriptorMap, EntityRecord, FieldDescriptor } from '../types/aggregate.ts';
import { effectiveFields } from '../forms/specialization.ts';
import { ConfirmDialog } from './confirm-dialog.tsx';
import { FieldLabel } from './field-label.tsx';
import { FormField } from './form-field.tsx';

export interface CompositionSectionProps {
  field: FieldDescriptor;
  target: EntityTarget | null;
  value: unknown;
  parentPath: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  instanceBaseIri: string;
  language: string;
  issues: ValidationIssue[];
  validationPath: string;
  error?: string;
  existingIds: Set<string>;
  onSelect: (path: EntityPathSegment[]) => void;
  onChange: (value: unknown) => void;
  onChangeChild: (index: number, child: EntityRecord) => void;
}

/** Edits one composition. Children without nested compositions stay on the current pane. */
export function CompositionSection(props: CompositionSectionProps) {
  const values = compositionEntities(props.value, props.field);
  // keep a newly added inline child open so it can be filled immediately
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  const minimum = minimumCount(props.field);
  const maximum = maximumCount(props.field);
  const cardinality = props.field.many ? cardinalityDescription(props.field) : '';

  if (!props.target) {
    return (
      <Alert severity="error">The composition target for {props.field.label} is unavailable.</Alert>
    );
  }
  const target = props.target;
  // specialized children open in their own pane, the same editor can then show their selector and
  // any composition fields introduced by the selected branch
  const editsInline = !opensInOwnPane(target);

  const add = () => {
    const child = createEntityDraft(target, props.aggregateRegistry, props.instanceBaseIri);
    if (props.field.many) {
      props.onChange([...values, child]);
      setExpanded(childKey(child, values.length));
      if (!editsInline) {
        props.onSelect([
          ...props.parentPath,
          { propertyName: props.field.propertyName, index: values.length },
        ]);
      }
      return;
    }
    props.onChange(child);
    setExpanded(childKey(child, 0));
    if (!editsInline) {
      props.onSelect([...props.parentPath, { propertyName: props.field.propertyName }]);
    }
  };

  const removeAt = (index: number) => {
    props.onChange(
      props.field.many ? values.filter((_, candidate) => candidate !== index) : undefined,
    );
  };

  // confirm removal only for stored children because saving deletes them from the endpoint
  const remove = (index: number) => {
    const id = values[index].id;
    if (typeof id === 'string' && props.existingIds.has(id)) {
      setPendingRemoval(index);
      return;
    }
    removeAt(index);
  };

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="subtitle2">
              <FieldLabel field={props.field} />
              {minimum > 0 ? ' *' : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {values.length} {values.length === 1 ? 'item' : 'items'}
              {cardinality ? ` · ${cardinality}` : ''}
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            disabled={maximum !== null && values.length >= maximum}
            onClick={add}
          >
            Add
          </Button>
        </Stack>
        {props.error ? (
          <Alert severity="error" sx={{ mt: 1 }}>
            {props.error}
          </Alert>
        ) : null}
        {values.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nothing composed yet.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {values.map((child, index) => {
              const childValidationPath = props.field.many
                ? `${props.validationPath}[${index}]`
                : props.validationPath;
              const childIssues = countIssues(props.issues, childValidationPath);
              const path = [
                ...props.parentPath,
                {
                  propertyName: props.field.propertyName,
                  ...(props.field.many ? { index } : {}),
                },
              ];
              const summary = entitySummary(target, child, index);
              const key = childKey(child, index);

              return editsInline ? (
                <Accordion
                  key={key}
                  disableGutters
                  expanded={expanded === key}
                  onChange={(_event, open) => setExpanded(open ? key : null)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}
                    >
                      <Typography variant="body2" noWrap sx={{ flexGrow: 1 }}>
                        {summary}
                      </Typography>
                      {childIssues > 0 ? <Chip label={childIssues} color="error" /> : null}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <InlineEntityFields
                        target={target}
                        entity={child}
                        aggregateRegistry={props.aggregateRegistry}
                        language={props.language}
                        issues={props.issues}
                        validationPrefix={childValidationPath}
                        onChange={(next) => props.onChangeChild(index, next)}
                      />
                      <Box>
                        <Button
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => remove(index)}
                        >
                          Remove
                        </Button>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ) : (
                <Card key={key} sx={{ bgcolor: 'action.hover' }}>
                  <CardContent
                    sx={{
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&:last-child': { pb: 1 },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" noWrap>
                        {summary}
                      </Typography>
                    </Box>
                    {childIssues > 0 ? <Chip label={childIssues} color="error" /> : null}
                    <Tooltip title="Edit">
                      <IconButton
                        aria-label={`Edit ${summary}`}
                        onClick={() => props.onSelect(path)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton
                        color="error"
                        aria-label={`Remove ${summary}`}
                        onClick={() => remove(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </CardContent>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={`Remove from ${props.field.label}?`}
        message={
          pendingRemoval === null
            ? ''
            : `"${entitySummary(target, values[pendingRemoval], pendingRemoval)}" already exists. Removing it here deletes it when the form is saved.`
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingRemoval !== null) {
            removeAt(pendingRemoval);
          }
          setPendingRemoval(null);
        }}
        onCancel={() => setPendingRemoval(null)}
      />
    </Card>
  );
}

interface InlineEntityFieldsProps {
  target: EntityTarget;
  entity: EntityRecord;
  aggregateRegistry: AggregateDescriptorMap;
  language: string;
  issues: ValidationIssue[];
  validationPrefix: string;
  onChange: (entity: EntityRecord) => void;
}

/** Edits a composed child without leaving the current pane. */
function InlineEntityFields(props: InlineEntityFieldsProps) {
  const errorAt = (path: string) => issueMessageAt(props.issues, path);
  const fields = effectiveFields(props.target, props.entity);

  return (
    <>
      {fields.map((field) => (
        <FormField
          key={field.path}
          field={field}
          value={props.entity[field.propertyName]}
          language={props.language}
          error={errorAt(joinFieldPath(props.validationPrefix, field.path))}
          aggregateRegistry={props.aggregateRegistry}
          onChange={(value) => props.onChange({ ...props.entity, [field.propertyName]: value })}
        />
      ))}
    </>
  );
}

/** Returns a child row key that survives removal of neighbouring rows. */
function childKey(child: EntityRecord, index: number): string {
  return typeof child.id === 'string' && child.id !== '' ? child.id : `index:${index}`;
}
