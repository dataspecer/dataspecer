import { useId, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import type { DataSource } from '../datasource/data-source.ts';
import {
  entityPathForValidationPath,
  nearestPanePath,
  resolveEntityPath,
} from '../forms/entity-path.ts';
import {
  compositionEntities,
  createEntityDraft,
  entityAtPath,
  updateEntityAtPath,
  type EntityPathSegment,
} from '../forms/form-draft.ts';
import {
  cardinalityDescription,
  isCompositionField,
  maximumCount,
  minimumCount,
  resolveCompositionTarget,
  rootEntityTarget,
  type EntityTarget,
} from '../forms/entity-target.ts';
import { useEntityPath } from '../navigation/use-location.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityRecord,
  FieldDescriptor,
} from '../types/aggregate.ts';
import { ConfirmDialog } from '../feedback/confirm-dialog.tsx';
import { formatFieldValue } from './field-value.ts';
import { FormField } from './form-field.tsx';

interface EntityFormEditorProps {
  aggregate: AggregateDescriptor;
  aggregateRegistry: AggregateDescriptorMap;
  model: EntityRecord;
  originalModel?: EntityRecord;
  dataSource: DataSource;
  instanceBaseIri: string;
  issues: ValidationIssue[];
  rootIdentifierReadOnly: boolean;
  onChange: (model: EntityRecord) => void;
}

/**
 * Edits one entity and the entities composed into it. Children that compose nothing themselves are
 * edited in place, while deeper ones open as their own pane, which the address bar remembers.
 */
export function EntityFormEditor(props: EntityFormEditorProps) {
  const [requestedPath, setPath] = useEntityPath();
  const identifierId = useId();
  const [structureOpen, setStructureOpen] = useState(false);

  const rootTarget = rootEntityTarget(props.aggregate);
  // a path from the address bar can point at a child that no longer exists
  const selection = resolveEntityPath(props.model, requestedPath);
  const target = targetAtPath(rootTarget, selection, props.aggregateRegistry);
  const entity = entityAtPath(props.model, selection);
  const validationPrefix = validationPathAt(rootTarget, selection, props.aggregateRegistry);
  const existingIds = collectEntityIds(props.originalModel, rootTarget, props.aggregateRegistry);
  const navigable = navigablePanes(props.model, rootTarget, props.aggregateRegistry, []);

  const updateSelected = (update: (entity: EntityRecord) => EntityRecord) => {
    props.onChange(updateEntityAtPath(props.model, selection, update));
  };
  const errorAt = (path: string) => props.issues.find((issue) => issue.path === path)?.message;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <FormBreadcrumbs
          root={props.model}
          rootTarget={rootTarget}
          path={selection}
          aggregateRegistry={props.aggregateRegistry}
          issues={props.issues}
          onSelect={setPath}
        />
        {navigable.length > 0 ? (
          <Badge badgeContent={props.issues.length} color="error" overlap="circular">
            <Button
              startIcon={<AccountTreeIcon />}
              onClick={() => setStructureOpen(true)}
              aria-label={`Open the structure of ${navigable.length} composed entities`}
            >
              Structure ({navigable.length})
            </Button>
          </Badge>
        ) : null}
      </Stack>

      <IssueSummary
        issues={props.issues}
        rootTarget={rootTarget}
        aggregateRegistry={props.aggregateRegistry}
        currentPane={selection}
        onSelect={setPath}
      />

      <TextField
        id={identifierId}
        label="Identifier (IRI)"
        required
        value={entity.id ?? ''}
        slotProps={{
          htmlInput: { readOnly: selection.length > 0 || props.rootIdentifierReadOnly },
        }}
        error={errorAt(joinValidationPath(validationPrefix, 'id')) !== undefined}
        helperText={
          errorAt(joinValidationPath(validationPrefix, 'id')) ??
          (selection.length > 0 ? 'Identifiers of composed entities are generated.' : undefined)
        }
        onChange={(event) => updateSelected((current) => ({ ...current, id: event.target.value }))}
      />

      {target.fields
        .filter((field) => !isCompositionField(field))
        .map((field) => (
          <FormField
            key={field.path}
            field={field}
            value={entity[field.propertyName]}
            error={errorAt(joinValidationPath(validationPrefix, field.path))}
            dataSource={props.dataSource}
            aggregateRegistry={props.aggregateRegistry}
            onChange={(value) =>
              updateSelected((current) => ({ ...current, [field.propertyName]: value }))
            }
          />
        ))}

      {target.fields.filter(isCompositionField).map((field) => {
        const childTarget = resolveCompositionTarget(target, field, props.aggregateRegistry);
        const fieldPath = joinValidationPath(validationPrefix, field.path);
        return (
          <CompositionSection
            key={field.path}
            field={field}
            target={childTarget}
            value={entity[field.propertyName]}
            parentPath={selection}
            dataSource={props.dataSource}
            aggregateRegistry={props.aggregateRegistry}
            instanceBaseIri={props.instanceBaseIri}
            issues={props.issues}
            validationPath={fieldPath}
            error={errorAt(fieldPath)}
            existingIds={existingIds}
            onSelect={setPath}
            onChange={(value) =>
              updateSelected((current) => ({ ...current, [field.propertyName]: value }))
            }
            onChangeChild={(index, child) =>
              updateSelected((current) => {
                const values = compositionEntities(current[field.propertyName], field);
                if (!field.many) {
                  return { ...current, [field.propertyName]: child };
                }
                const next = [...values];
                next[index] = child;
                return { ...current, [field.propertyName]: next };
              })
            }
          />
        );
      })}

      <StructureDrawer
        open={structureOpen}
        panes={navigable}
        selection={selection}
        issues={props.issues}
        rootTarget={rootTarget}
        aggregateRegistry={props.aggregateRegistry}
        onClose={() => setStructureOpen(false)}
        onSelect={(path) => {
          setPath(path);
          setStructureOpen(false);
        }}
      />
    </Stack>
  );
}

interface CompositionSectionProps {
  field: FieldDescriptor;
  target: EntityTarget | null;
  value: unknown;
  parentPath: EntityPathSegment[];
  dataSource: DataSource;
  aggregateRegistry: AggregateDescriptorMap;
  instanceBaseIri: string;
  issues: ValidationIssue[];
  validationPath: string;
  error?: string;
  existingIds: Set<string>;
  onSelect: (path: EntityPathSegment[]) => void;
  onChange: (value: unknown) => void;
  onChangeChild: (index: number, child: EntityRecord) => void;
}

/**
 * One composition. Children that compose nothing of their own are edited in place, so adding a
 * simple child does not move the user to another pane.
 */
function CompositionSection(props: CompositionSectionProps) {
  const values = compositionEntities(props.value, props.field);
  // the child that was just added is the one the user wants to fill in
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  const minimum = minimumCount(props.field);
  const maximum = maximumCount(props.field);
  const issueCount = countIssues(props.issues, props.validationPath);

  if (!props.target) {
    return (
      <Alert severity="error">The composition target for {props.field.label} is unavailable.</Alert>
    );
  }
  const target = props.target;
  const editsInline = !target.fields.some(isCompositionField);

  const add = () => {
    const child = createEntityDraft(target, props.aggregateRegistry, props.instanceBaseIri);
    if (props.field.many) {
      props.onChange([...values, child]);
      setExpanded(values.length);
      if (!editsInline) {
        props.onSelect([
          ...props.parentPath,
          { propertyName: props.field.propertyName, index: values.length },
        ]);
      }
      return;
    }
    props.onChange(child);
    setExpanded(0);
    if (!editsInline) {
      props.onSelect([...props.parentPath, { propertyName: props.field.propertyName }]);
    }
  };

  const removeAt = (index: number) => {
    props.onChange(
      props.field.many ? values.filter((_, candidate) => candidate !== index) : undefined
    );
  };

  // Removing a child that is already stored deletes it when the form is saved, which is worth
  // confirming. A child that only exists in this draft is removed without asking.
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
              {props.field.label}
              {minimum > 0 ? ' *' : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {values.length} {values.length === 1 ? 'item' : 'items'}
              {props.field.many ? ` · ${cardinalityDescription(props.field)}` : ''}
            </Typography>
            {issueCount > 0 ? (
              <Chip
                label={`${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`}
                color="error"
                sx={{ ml: 1 }}
              />
            ) : null}
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

              return editsInline ? (
                <Accordion
                  key={child.id ?? index}
                  disableGutters
                  expanded={expanded === index}
                  onChange={(_event, open) => setExpanded(open ? index : null)}
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
                        dataSource={props.dataSource}
                        aggregateRegistry={props.aggregateRegistry}
                        issues={props.issues}
                        validationPrefix={childValidationPath}
                        onChange={(next) => props.onChangeChild(index, next)}
                      />
                      <Box>
                        <Button
                          color="error"
                          startIcon={<DeleteIcon />}
                          disabled={values.length <= minimum}
                          onClick={() => remove(index)}
                        >
                          Remove
                        </Button>
                      </Box>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ) : (
                <Card key={child.id ?? index} sx={{ bgcolor: 'action.hover' }}>
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
                      {childIssues > 0 ? (
                        <Chip
                          label={`${childIssues} ${childIssues === 1 ? 'issue' : 'issues'}`}
                          color="error"
                        />
                      ) : null}
                    </Box>
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
                        disabled={values.length <= minimum}
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
            : `"${entitySummary(target, values[pendingRemoval], pendingRemoval)}" is an existing entity. Removing it here deletes it when the form is saved.`
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
  dataSource: DataSource;
  aggregateRegistry: AggregateDescriptorMap;
  issues: ValidationIssue[];
  validationPrefix: string;
  onChange: (entity: EntityRecord) => void;
}

/** The fields of a composed entity that itself composes nothing, edited without leaving the pane. */
function InlineEntityFields(props: InlineEntityFieldsProps) {
  const errorAt = (path: string) => props.issues.find((issue) => issue.path === path)?.message;

  return (
    <>
      {props.target.fields.map((field) => (
        <FormField
          key={field.path}
          field={field}
          value={props.entity[field.propertyName]}
          error={errorAt(joinValidationPath(props.validationPrefix, field.path))}
          dataSource={props.dataSource}
          aggregateRegistry={props.aggregateRegistry}
          onChange={(value) => props.onChange({ ...props.entity, [field.propertyName]: value })}
        />
      ))}
    </>
  );
}

interface IssueSummaryProps {
  issues: ValidationIssue[];
  rootTarget: EntityTarget;
  aggregateRegistry: AggregateDescriptorMap;
  currentPane: EntityPathSegment[];
  onSelect: (path: EntityPathSegment[]) => void;
}

/**
 * Lists the problems of the whole draft, however deep they sit, and opens the pane that owns each
 * one. Without it a nested problem is only a count on a card.
 */
function IssueSummary(props: IssueSummaryProps) {
  const elsewhere = props.issues.flatMap((issue) => {
    if (issue.path === undefined) {
      return [];
    }
    const pane = nearestPanePath(
      props.rootTarget,
      props.aggregateRegistry,
      entityPathForValidationPath(props.rootTarget, props.aggregateRegistry, issue.path)
    );
    // a problem on this pane is already marked on the field that owns it
    return samePath(pane, props.currentPane) ? [] : [{ issue, pane }];
  });
  if (elsewhere.length === 0) {
    return null;
  }

  return (
    <Alert severity="error">
      <AlertTitle>
        {elsewhere.length} {elsewhere.length === 1 ? 'problem' : 'problems'} on other pages
      </AlertTitle>
      <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
        {elsewhere.map(({ issue, pane }, index) => (
          <Link
            key={index}
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            sx={{ textAlign: 'left' }}
            onClick={() => props.onSelect(pane)}
          >
            {issue.message}
          </Link>
        ))}
      </Stack>
    </Alert>
  );
}

interface FormBreadcrumbsProps {
  root: EntityRecord;
  rootTarget: EntityTarget;
  path: EntityPathSegment[];
  aggregateRegistry: AggregateDescriptorMap;
  issues: ValidationIssue[];
  onSelect: (path: EntityPathSegment[]) => void;
}

function FormBreadcrumbs(props: FormBreadcrumbsProps) {
  const entries = breadcrumbEntries(
    props.root,
    props.rootTarget,
    props.path,
    props.aggregateRegistry
  );

  return (
    <Breadcrumbs sx={{ minWidth: 0 }}>
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        const issues = countIssues(props.issues, entry.validationPath);
        const label = (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <span>{entry.label}</span>
            {!last && issues > 0 ? <Chip label={issues} color="error" /> : null}
          </Stack>
        );
        return last ? (
          <Typography key={index} variant="body2" color="text.primary" component="div">
            {label}
          </Typography>
        ) : (
          <Link
            key={index}
            component="button"
            type="button"
            variant="body2"
            underline="hover"
            onClick={() => props.onSelect(entry.path)}
          >
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

interface StructureDrawerProps {
  open: boolean;
  panes: NavigablePane[];
  selection: EntityPathSegment[];
  issues: ValidationIssue[];
  rootTarget: EntityTarget;
  aggregateRegistry: AggregateDescriptorMap;
  onClose: () => void;
  onSelect: (path: EntityPathSegment[]) => void;
}

function StructureDrawer(props: StructureDrawerProps) {
  return (
    <Drawer anchor="right" open={props.open} onClose={props.onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Structure
        </Typography>
        <Divider />
        <List dense>
          <ListItemButton
            selected={props.selection.length === 0}
            onClick={() => props.onSelect([])}
          >
            <ListItemText primary={props.rootTarget.name} />
          </ListItemButton>
          {props.panes.map((pane) => {
            const issues = countIssues(props.issues, pane.validationPath);
            return (
              <ListItemButton
                key={pane.key}
                selected={samePath(pane.path, props.selection)}
                sx={{ pl: 2 + pane.path.length * 2 }}
                onClick={() => props.onSelect(pane.path)}
              >
                <ListItemText primary={pane.label} secondary={pane.fieldLabel} />
                {issues > 0 ? <Chip label={issues} color="error" /> : null}
              </ListItemButton>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}

interface NavigablePane {
  key: string;
  path: EntityPathSegment[];
  label: string;
  fieldLabel: string;
  validationPath: string;
}

/** Every composed entity that opens as its own pane, in the order the form shows them. */
function navigablePanes(
  entity: EntityRecord,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap,
  path: EntityPathSegment[],
  validationPrefix = ''
): NavigablePane[] {
  return target.fields.filter(isCompositionField).flatMap((field) => {
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget || !childTarget.fields.some(isCompositionField)) {
      // children that compose nothing are edited in place, so they are not panes
      return [];
    }
    return compositionEntities(entity[field.propertyName], field).flatMap((child, index) => {
      const childPath = [
        ...path,
        { propertyName: field.propertyName, ...(field.many ? { index } : {}) },
      ];
      const childValidationPath = field.many
        ? `${joinValidationPath(validationPrefix, field.path)}[${index}]`
        : joinValidationPath(validationPrefix, field.path);
      return [
        {
          key: childValidationPath,
          path: childPath,
          label: entitySummary(childTarget, child, index),
          fieldLabel: field.label,
          validationPath: childValidationPath,
        },
        ...navigablePanes(child, childTarget, aggregateRegistry, childPath, childValidationPath),
      ];
    });
  });
}

function targetAtPath(
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): EntityTarget {
  let target = rootTarget;
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!child) {
      return target;
    }
    target = child;
  }
  return target;
}

function validationPathAt(
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): string {
  let target = rootTarget;
  let validationPath = '';
  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!field || !child) {
      return validationPath;
    }
    validationPath = joinValidationPath(validationPath, field.path);
    if (segment.index !== undefined) {
      validationPath = `${validationPath}[${segment.index}]`;
    }
    target = child;
  }
  return validationPath;
}

interface BreadcrumbEntry {
  label: string;
  path: EntityPathSegment[];
  validationPath: string;
}

function breadcrumbEntries(
  root: EntityRecord,
  rootTarget: EntityTarget,
  path: readonly EntityPathSegment[],
  aggregateRegistry: AggregateDescriptorMap
): BreadcrumbEntry[] {
  const entries: BreadcrumbEntry[] = [{ label: rootTarget.name, path: [], validationPath: '' }];
  let entity = root;
  let target = rootTarget;
  let validationPath = '';
  const traversed: EntityPathSegment[] = [];

  for (const segment of path) {
    const field = target.fields.find(
      (candidate) => candidate.propertyName === segment.propertyName
    );
    const child = field && resolveCompositionTarget(target, field, aggregateRegistry);
    if (!field || !child) {
      break;
    }
    const values = compositionEntities(entity[field.propertyName], field);
    const index = segment.index ?? 0;
    const next = values[index];
    if (!next) {
      break;
    }
    traversed.push(segment);
    validationPath = joinValidationPath(validationPath, field.path);
    if (segment.index !== undefined) {
      validationPath = `${validationPath}[${segment.index}]`;
    }
    entries.push({
      label: entitySummary(child, next, index),
      path: [...traversed],
      validationPath,
    });
    entity = next;
    target = child;
  }
  return entries;
}

/**
 * Names a composed entity by its first filled primitive. A freshly added one has none, so it is
 * named after its structure and position instead of by its generated IRI. The structure name comes
 * from the field, which is often plural, so the position follows it rather than a "New" prefix.
 */
function entitySummary(target: EntityTarget, entity: EntityRecord, index: number): string {
  for (const field of target.fields) {
    if (field.kind !== 'primitive') {
      continue;
    }
    const value = formatFieldValue(field, entity[field.propertyName]);
    if (value !== '') {
      return value;
    }
  }
  return `${target.name} ${index + 1}`;
}

function countIssues(issues: readonly ValidationIssue[], path: string): number {
  if (path === '') {
    return issues.filter((issue) => issue.path !== undefined).length;
  }
  return issues.filter(
    (issue) => issue.path === path || issue.path?.startsWith(`${path}.`) === true
  ).length;
}

function samePath(
  left: readonly EntityPathSegment[],
  right: readonly EntityPathSegment[]
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (segment, index) =>
        segment.propertyName === right[index]?.propertyName && segment.index === right[index]?.index
    )
  );
}

function collectEntityIds(
  entity: EntityRecord | undefined,
  target: EntityTarget,
  aggregateRegistry: AggregateDescriptorMap
): Set<string> {
  const ids = new Set<string>();
  if (!entity) {
    return ids;
  }
  if (typeof entity.id === 'string' && entity.id !== '') {
    ids.add(entity.id);
  }
  for (const field of target.fields.filter(isCompositionField)) {
    const childTarget = resolveCompositionTarget(target, field, aggregateRegistry);
    if (!childTarget) {
      continue;
    }
    for (const child of compositionEntities(entity[field.propertyName], field)) {
      for (const id of collectEntityIds(child, childTarget, aggregateRegistry)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

function joinValidationPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
