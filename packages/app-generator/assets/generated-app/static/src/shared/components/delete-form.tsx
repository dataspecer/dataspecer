import { useEffect, useId, useState, type SubmitEvent } from 'react';
import Alert from '@mui/material/Alert';

import {
  INCOMING_REFERENCE_LIMIT,
  type DataSource,
  type IncomingReference,
} from '../datasource/data-source.ts';
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
} from '../types/aggregate.ts';

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
  const identifierId = useId();
  const [item, setItem] = useState<TModel | null>(null);
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
  }, [aggregate, dataSource, id]);

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
        window.location.href = hrefForAction(navigation.successRedirect, id) ?? '/';
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
      <section>
        <h2>{title}</h2>
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section>
      <h2>{title}</h2>
      <form className="entity-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-field">
          <label className="form-label" htmlFor={identifierId}>
            Identifier (IRI)
            <span className="form-required"> *</span>
          </label>
          <div className="form-control">
            <input id={identifierId} type="text" value={item?.id ?? id} readOnly />
            {errorFor('id') ? <span className="form-error">{errorFor('id')}</span> : null}
          </div>
        </div>

        <IncomingReferenceWarning check={incomingReferenceCheck} />

        {generalErrors.length > 0 ? (
          <div role="alert" className="form-errors">
            {generalErrors.map((issue, index) => (
              <p key={index}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        <div className="form-actions">
          <button type="submit" disabled={submitting || !item}>
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
          <button className="form-cancel" type="button" onClick={() => window.history.back()}>
            Cancel
          </button>
        </div>
      </form>
    </section>
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
