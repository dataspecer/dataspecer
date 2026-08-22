import { useId, useMemo, useState } from 'react';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import {
  collectEntityIds,
  issuesByPane,
  joinValidationPath,
  navigablePanes,
  targetAtPath,
  validationPathAt,
} from '../forms/composition-tree.ts';
import { resolveEntityPath } from '../forms/entity-path.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  rootEntityTarget,
} from '../forms/entity-target.ts';
import { compositionEntities, entityAtPath, updateEntityAtPath } from '../forms/form-draft.ts';
import { useEntityPath } from '../navigation/use-location.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityRecord,
} from '../types/aggregate.ts';
import { CompositionSection } from './composition-section.tsx';
import { FormBreadcrumbs, StructureDrawer } from './form-navigation.tsx';
import { FormField } from './form-field.tsx';

interface EntityFormEditorProps {
  aggregate: AggregateDescriptor;
  aggregateRegistry: AggregateDescriptorMap;
  model: EntityRecord;
  originalModel?: EntityRecord;
  instanceBaseIri: string;
  issues: ValidationIssue[];
  rootIdentifierReadOnly: boolean;
  onChange: (model: EntityRecord) => void;
}

/** Edits a root entity and its children. Nested compositions open in URL-addressable panes. */
export function EntityFormEditor(props: EntityFormEditorProps) {
  const [requestedPath, setPath] = useEntityPath();
  const identifierId = useId();
  const [structureOpen, setStructureOpen] = useState(false);

  const rootTarget = useMemo(() => rootEntityTarget(props.aggregate), [props.aggregate]);
  const existingIds = useMemo(
    () => collectEntityIds(props.originalModel, rootTarget, props.aggregateRegistry),
    [props.originalModel, rootTarget, props.aggregateRegistry]
  );
  const navigable = useMemo(
    () => navigablePanes(props.model, rootTarget, props.aggregateRegistry, []),
    [props.model, rootTarget, props.aggregateRegistry]
  );
  // assign each issue to one pane so nested issues are not counted more than once
  const issueCounts = useMemo(
    () => issuesByPane(rootTarget, props.aggregateRegistry, props.issues),
    [rootTarget, props.aggregateRegistry, props.issues]
  );

  // a path from the address bar can point at a child that no longer exists
  const selection = resolveEntityPath(props.model, requestedPath);
  const target = targetAtPath(rootTarget, selection, props.aggregateRegistry);
  const entity = entityAtPath(props.model, selection);
  const validationPrefix = validationPathAt(rootTarget, selection, props.aggregateRegistry);
  const totalIssues = [...issueCounts.values()].reduce((total, count) => total + count, 0);

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
          onSelect={setPath}
        />
        {navigable.length > 0 ? (
          <Badge badgeContent={totalIssues} color="error" overlap="circular">
            <Button
              startIcon={<AccountTreeIcon />}
              onClick={() => setStructureOpen(true)}
              aria-label={`Structure, ${navigable.length} composed entities, ${totalIssues} problems`}
            >
              Structure ({navigable.length})
            </Button>
          </Badge>
        ) : null}
      </Stack>

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
        issueCounts={issueCounts}
        rootTarget={rootTarget}
        onClose={() => setStructureOpen(false)}
        onSelect={(path) => {
          setPath(path);
          setStructureOpen(false);
        }}
      />
    </Stack>
  );
}
