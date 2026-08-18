import { useState, type SubmitEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';

import { useDataSource } from '../datasource/data-source-context.tsx';
import { createEntityDraft } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
import { useSnackbar } from './snackbar.tsx';
import { UnsavedChangesDialog, useUnsavedChanges } from '../forms/unsaved-changes.tsx';
import { validateModel } from '../forms/form-model.ts';
import { hrefForAction, type OperationNavigationDescriptor } from '../navigation/navigation.ts';
import {
  errorMessage,
  ValidationIssueCode,
  type ValidationIssue,
} from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityRecord,
  EntityModel,
} from '../types/aggregate.ts';
import { EntityFormEditor } from './entity-form-editor.tsx';

interface CreateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel, TModel>;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
}

export function CreateForm<TModel extends EntityModel>(props: CreateFormProps<TModel>) {
  const dataSource = useDataSource();
  const { title, aggregate, aggregateRegistry, strategy, navigation, instanceBaseIri } = props;
  const [model, setModel] = useState<EntityRecord>(() =>
    createEntityDraft(rootEntityTarget(aggregate), aggregateRegistry, instanceBaseIri)
  );
  const navigate = useNavigate();
  const { notify } = useSnackbar();
  const { markDirty, markSaved, blocker } = useUnsavedChanges();
  const leaveForm = () => {
    // Cancel abandons the whole form, where going back one step would only leave a nested pane.
    const href =
      hrefForAction(navigation.successRedirect) ?? hrefForAction(navigation.cancelTarget);
    if (href) {
      void navigate(href);
      return;
    }
    void navigate(-1);
  };
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validationActive, setValidationActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const generalErrors = issues.filter((issue) => !issue.path);

  const handleChange = (next: EntityRecord) => {
    markDirty();
    setModel(next);
    if (validationActive) {
      setIssues(validateModel(next, rootEntityTarget(aggregate), aggregateRegistry));
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationActive(true);
    const validation = validateModel(model, rootEntityTarget(aggregate), aggregateRegistry);
    if (validation.length > 0) {
      setIssues(validation);
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const result = await invokeOperation(strategy, {
        aggregate,
        aggregateRegistry,
        datasource: dataSource,
        params: {},
        payload: model as TModel,
      });
      if (result.ok) {
        notify(`${aggregate.name} created.`);
        markSaved();
        void navigate(hrefForAction(navigation.successRedirect, result.data.id ?? model.id) ?? '/');
        return;
      }
      setIssues(result.issues);
    } catch (caught: unknown) {
      console.error(caught);
      setIssues([
        {
          code: ValidationIssueCode.Error,
          message: `${errorMessage(caught)} (Some entities may already have been saved.)`,
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack
      spacing={2}
      component="form"
      // the form validates itself, so the browser must not block the submit first and hide the
      // problem summary this form shows
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Typography variant="h5" component="h2">
        {title}
      </Typography>
      <Card>
        <CardContent>
          <EntityFormEditor
            aggregate={aggregate}
            aggregateRegistry={aggregateRegistry}
            model={model}
            instanceBaseIri={instanceBaseIri}
            issues={issues}
            rootIdentifierReadOnly={false}
            onChange={handleChange}
          />
        </CardContent>
      </Card>

      {generalErrors.length > 0 ? (
        <Alert severity="error">
          {generalErrors.map((issue, index) => (
            <div key={index}>{issue.message}</div>
          ))}
        </Alert>
      ) : null}

      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'sticky',
          bottom: 0,
          py: 1.5,
          bgcolor: 'background.default',
          borderTop: 1,
          borderColor: 'divider',
          zIndex: 1,
        }}
      >
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
          {submitting ? 'Saving…' : 'Create'}
        </Button>
        <Button type="button" onClick={leaveForm}>
          Cancel
        </Button>
      </Stack>

      <UnsavedChangesDialog blocker={blocker} />
    </Stack>
  );
}
