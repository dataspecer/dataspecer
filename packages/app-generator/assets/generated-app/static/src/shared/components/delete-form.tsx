import { useEffect, useId, useState, type SubmitEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import { hrefForAction, type OperationNavigationDescriptor } from '../navigation/navigation.ts';
import { ValidationIssueCode, type ValidationIssue } from '../operations/operation-result.ts';
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setIssues([
        { code: ValidationIssueCode.Required, message: 'Missing required entity id.', path: 'id' },
      ]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    dataSource
      .readDetail({ aggregate, id })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result) {
          setItem(result);
          setIssues([]);
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
              message: caught instanceof Error ? caught.message : String(caught),
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
          message: caught instanceof Error ? caught.message : String(caught),
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
