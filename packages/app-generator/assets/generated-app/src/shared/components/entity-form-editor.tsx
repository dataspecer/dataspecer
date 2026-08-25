import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

import {
  collectEntityIds,
  collectMultilingualLanguages,
  compositionAtPath,
  containsMultilingualFields,
  issuesByPane,
  navigablePanes,
} from '../forms/composition-tree.ts';
import { joinFieldPath } from '../forms/field-path.ts';
import { formatEntityPath, resolveEntityPath } from '../forms/entity-path.ts';
import {
  isCompositionField,
  resolveCompositionTarget,
  rootEntityTarget,
} from '../forms/entity-target.ts';
import {
  compositionEntities,
  entityAtPath,
  selectEntitySpecialization,
  updateEntityAtPath,
} from '../forms/form-draft.ts';
import { languageDisplayName } from '../forms/multilingual-value.ts';
import { useEntityPath } from '../navigation/use-location.ts';
import { effectiveFields } from '../forms/specialization.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import {
  SPECIALIZATION_IRI_PROPERTY,
  type AggregateDescriptor,
  type AggregateDescriptorMap,
  type EntityRecord,
} from '../types/aggregate.ts';
import { CompositionSection } from './composition-section.tsx';
import { FormBreadcrumbs, StructureDrawer } from './form-navigation.tsx';
import { FormField } from './form-field.tsx';
import { SpecializationSelect } from './specialization-select.tsx';

interface EntityFormEditorProps {
  aggregate: AggregateDescriptor;
  aggregateRegistry: AggregateDescriptorMap;
  model: EntityRecord;
  originalModel?: EntityRecord;
  instanceBaseIri: string;
  languages: readonly string[];
  issues: ValidationIssue[];
  rootIdentifierReadOnly: boolean;
  onChange: (model: EntityRecord) => void;
}

/** Edits a root entity and its children. Nested compositions open in URL-addressable panes. */
export function EntityFormEditor(props: EntityFormEditorProps) {
  const [requestedPath, setPath] = useEntityPath();
  const identifierId = useId();
  const paneTopRef = useRef<HTMLDivElement>(null);
  const previousSelectionKey = useRef<string | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(props.languages[0] ?? '');

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
  const selectionKey = formatEntityPath(selection);
  const { target, validationPath: validationPrefix } = compositionAtPath(
    rootTarget,
    props.model,
    selection,
    props.aggregateRegistry
  );
  const entity = entityAtPath(props.model, selection);
  const fields = effectiveFields(target, entity);
  const totalIssues = [...issueCounts.values()].reduce((total, count) => total + count, 0);
  // one language selector for every pane, so it offers and keeps the whole form's languages
  const hasMultilingualFields = useMemo(
    () => containsMultilingualFields(rootTarget, props.aggregateRegistry),
    [rootTarget, props.aggregateRegistry]
  );
  const storedLanguages = useMemo(
    () => collectMultilingualLanguages(props.model, rootTarget, props.aggregateRegistry),
    [props.model, rootTarget, props.aggregateRegistry]
  );
  const languageOptions = [...new Set([...props.languages, ...storedLanguages, selectedLanguage])];
  const persisted = typeof entity.id === 'string' && existingIds.has(entity.id);

  useEffect(() => {
    const previousKey = previousSelectionKey.current;
    previousSelectionKey.current = selectionKey;
    if (previousKey !== null && previousKey !== selectionKey) {
      paneTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectionKey]);

  const updateSelected = (update: (entity: EntityRecord) => EntityRecord) => {
    props.onChange(updateEntityAtPath(props.model, selection, update));
  };
  const errorAt = (path: string) => props.issues.find((issue) => issue.path === path)?.message;

  return (
    <Stack ref={paneTopRef} spacing={2} sx={{ scrollMarginTop: (theme) => theme.spacing(8) }}>
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', marginLeft: 'auto' }}>
          {hasMultilingualFields ? (
            <Select
              variant="standard"
              size="small"
              disableUnderline
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value)}
              sx={{
                fontSize: (theme) => theme.typography.body2.fontSize,
                '& .MuiSelect-select': { paddingBlock: '3px' },
              }}
              SelectDisplayProps={{
                'aria-label': 'Show values in',
                title:
                  'Multilingual fields show and edit values in this language. ' +
                  'Switching languages keeps values entered in other languages.',
              }}
            >
              {languageOptions.map((language) => (
                <MenuItem key={language || '__untagged'} value={language}>
                  {languageDisplayName(language)}
                </MenuItem>
              ))}
            </Select>
          ) : null}
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
      </Stack>

      <TextField
        id={identifierId}
        label="Identifier (IRI)"
        required
        value={entity.id ?? ''}
        slotProps={{
          htmlInput: { readOnly: selection.length > 0 || props.rootIdentifierReadOnly },
        }}
        error={errorAt(joinFieldPath(validationPrefix, 'id')) !== undefined}
        helperText={
          errorAt(joinFieldPath(validationPrefix, 'id')) ??
          (selection.length > 0 ? 'Identifiers of composed entities are generated.' : undefined)
        }
        onChange={(event) => updateSelected((current) => ({ ...current, id: event.target.value }))}
      />

      <SpecializationSelect
        target={target}
        entity={entity}
        persisted={persisted}
        error={errorAt(joinFieldPath(validationPrefix, SPECIALIZATION_IRI_PROPERTY))}
        onChange={(specializationIri) =>
          updateSelected((current) =>
            selectEntitySpecialization(
              current,
              target,
              props.aggregateRegistry,
              props.instanceBaseIri,
              specializationIri
            )
          )
        }
      />

      {fields
        .filter((field) => !isCompositionField(field))
        .map((field) => (
          <FormField
            key={field.path}
            field={field}
            value={entity[field.propertyName]}
            language={selectedLanguage}
            error={errorAt(joinFieldPath(validationPrefix, field.path))}
            aggregateRegistry={props.aggregateRegistry}
            onChange={(value) =>
              updateSelected((current) => ({ ...current, [field.propertyName]: value }))
            }
          />
        ))}

      {fields.filter(isCompositionField).map((field) => {
        const childTarget = resolveCompositionTarget(target, field, props.aggregateRegistry);
        const fieldPath = joinFieldPath(validationPrefix, field.path);
        return (
          <CompositionSection
            key={field.path}
            field={field}
            target={childTarget}
            value={entity[field.propertyName]}
            parentPath={selection}
            aggregateRegistry={props.aggregateRegistry}
            instanceBaseIri={props.instanceBaseIri}
            language={selectedLanguage}
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
