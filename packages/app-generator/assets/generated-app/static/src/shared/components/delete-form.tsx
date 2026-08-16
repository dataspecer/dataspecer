import { useEffect, useState, type SubmitEvent } from 'react';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import {
  INCOMING_REFERENCE_LIMIT,
  type DataSource,
  type IncomingReference,
} from '../datasource/data-source.ts';
import { useSnackbar } from './snackbar.tsx';
import { hydrateCompositionTree } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
import { buildCompositeDeletePlan } from '../operations/composite-mutation.ts';
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
  EntityModel,
  EntityRecord,
} from '../types/aggregate.ts';
import { formatFieldValue } from './field-value.ts';

interface DeleteFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel, void>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  cascadePaths: readonly string[];
  id: string;
}

type IncomingReferenceCheck =
  | { status: 'loaded'; references: IncomingReference[] }
  | { status: 'failed' };

export function DeleteForm<TModel extends EntityModel>(props: DeleteFormProps<TModel>) {
  const {
    title,
    aggregate,
    aggregateRegistry,
    strategy,
    dataSource,
    navigation,
    cascadePaths,
    id,
  } = props;
  const [item, setItem] = useState<TModel | null>(null);
  const [cascade, setCascade] = useState<CascadePreview | null>(null);
  const navigate = useNavigate();
  const { notify } = useSnackbar();
  const leaveForm = () => {
    const href =
      hrefForAction(navigation.successRedirect, id) ?? hrefForAction(navigation.cancelTarget);
    if (href) {
      void navigate(href);
      return;
    }
    void navigate(-1);
  };
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [incomingReferenceCheck, setIncomingReferenceCheck] =
    useState<IncomingReferenceCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setIncomingReferenceCheck(null);
      setIssues([
        { code: ValidationIssueCode.Required, message: 'Missing required entity id.', path: 'id' },
      ]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setCascade(null);
    setIncomingReferenceCheck(null);
    dataSource
      .readDetail({ aggregate, id })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result) {
          setItem(result);
          setIssues([]);
          if (cascadePaths.length > 0) {
            void previewCascade(
              result as EntityRecord,
              aggregate,
              aggregateRegistry,
              dataSource,
              cascadePaths
            ).then((preview) => {
              if (active) {
                setCascade(preview);
              }
            });
          }
          void dataSource
            .listIncomingReferences(id)
            .then((references) => {
              if (active) {
                setIncomingReferenceCheck({ status: 'loaded', references });
              }
            })
            .catch((caught: unknown) => {
              console.error(caught);
              if (active) {
                setIncomingReferenceCheck({ status: 'failed' });
              }
            });
        } else {
          setItem(null);
          setIssues([{ code: ValidationIssueCode.NotFound, message: 'Entity not found.' }]);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          setItem(null);
          setIssues([
            {
              code: ValidationIssueCode.Error,
              message: errorMessage(caught),
            },
          ]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [aggregate, aggregateRegistry, cascadePaths, dataSource, id]);

  const errorFor = (path: string) => issues.find((issue) => issue.path === path)?.message;
  const generalErrors = issues.filter((issue) => !issue.path);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item) {
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const result = await invokeOperation(strategy, {
        aggregate,
        aggregateRegistry,
        datasource: dataSource,
        params: { id },
        payload: item,
        cascadePaths,
      });
      if (result.ok) {
        notify(`${aggregate.name} deleted.`);
        void navigate(hrefForAction(navigation.successRedirect, id) ?? '/');
        return;
      }
      setIssues(result.issues);
    } catch (caught: unknown) {
      console.error(caught);
      setIssues([
        {
          code: ValidationIssueCode.Error,
          message: errorMessage(caught),
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        <Skeleton variant="rounded" height={140} />
      </Stack>
    );
  }

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
          <Stack spacing={1} divider={<Divider flexItem />}>
            <Typography variant="body2" color="text.secondary">
              This deletes the entity below. The action cannot be undone.
            </Typography>
            <SummaryRow label="Identifier (IRI)" value={item?.id ?? id} />
            {item
              ? aggregate.fields
                  .filter((field) => field.kind === 'primitive')
                  .map((field) => (
                    <SummaryRow
                      key={field.path}
                      label={field.label}
                      value={formatFieldValue(field, (item as EntityRecord)[field.propertyName])}
                    />
                  ))
              : null}
            {errorFor('id') ? <Alert severity="error">{errorFor('id')}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>

      <CascadeWarning preview={cascade} />

      <IncomingReferenceWarning check={incomingReferenceCheck} />

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
        <Button
          type="submit"
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          disabled={submitting || !item}
        >
          {submitting ? 'Deleting…' : 'Delete'}
        </Button>
        <Button type="button" onClick={leaveForm}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  );
}

function IncomingReferenceWarning(props: { check: IncomingReferenceCheck | null }) {
  if (props.check === null) {
    return null;
  }
  if (props.check.status === 'failed') {
    return (
      <Alert severity="warning">
        Could not check whether this entity is referenced elsewhere. You can still delete it.
      </Alert>
    );
  }
  if (props.check.references.length === 0) {
    return null;
  }
  return (
    <Alert severity="warning">
      This entity is referenced elsewhere. Deleting it may leave broken references.
      <ul>
        {props.check.references.map((reference, index) => (
          <li key={index}>
            <code>{reference.subject}</code> via <code>{reference.predicate}</code>
          </li>
        ))}
      </ul>
      Showing up to {INCOMING_REFERENCE_LIMIT} references.
    </Alert>
  );
}

type CascadePreview =
  | { status: 'loaded'; entities: { label: string; id: string }[] }
  | { status: 'failed' };

/**
 * What the delete will take with it. The list comes from the same plan the delete executes, so it
 * cannot describe something else.
 */
async function previewCascade(
  item: EntityRecord,
  aggregate: AggregateDescriptor,
  aggregateRegistry: AggregateDescriptorMap,
  dataSource: DataSource,
  cascadePaths: readonly string[]
): Promise<CascadePreview> {
  try {
    const hydrated = await hydrateCompositionTree(
      item,
      rootEntityTarget(aggregate),
      aggregateRegistry,
      dataSource,
      cascadePaths
    );
    const steps = buildCompositeDeletePlan(aggregate, aggregateRegistry, hydrated, cascadePaths);
    return {
      status: 'loaded',
      entities: steps
        .filter((step) => step.id !== item.id)
        .map((step) => ({ label: step.target.name, id: step.id })),
    };
  } catch (caught) {
    console.error(caught);
    // an absent warning would read as "nothing else is deleted", which is not what happened
    return { status: 'failed' };
  }
}

function CascadeWarning(props: { preview: CascadePreview | null }) {
  if (props.preview === null) {
    return null;
  }
  if (props.preview.status === 'failed') {
    return (
      <Alert severity="warning">Composed entities may be deleted too. Cannot load details.</Alert>
    );
  }
  if (props.preview.entities.length === 0) {
    return null;
  }
  const entities = props.preview.entities;
  return (
    <Alert severity="warning">
      <AlertTitle>
        {entities.length} composed {entities.length === 1 ? 'entity is' : 'entities are'} deleted as
        well
      </AlertTitle>
      <Stack component="ul" sx={{ m: 0, pl: 2 }}>
        {entities.map((entity) => (
          <Typography key={entity.id} component="li" variant="body2">
            {entity.label} · <code>{entity.id}</code>
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}

function SummaryRow(props: { label: string; value: string }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.25, sm: 2 }} sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200, flexShrink: 0 }}>
        {props.label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {props.value === '' ? '—' : props.value}
      </Typography>
    </Stack>
  );
}
