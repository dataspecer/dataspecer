import { useEffect, useState, type FormEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import type { OperationNavigationDescriptor } from '../navigation/navigation.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type { AggregateDescriptor, EntityModel } from '../types/aggregate.ts';

interface DeleteFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  strategy: OperationStrategy<TModel, void>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  id: string;
}

export function DeleteForm<TModel extends EntityModel>(props: DeleteFormProps<TModel>) {
  const { title, aggregate, strategy, dataSource, navigation, id } = props;
  const [item, setItem] = useState<TModel | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setIssues([{ code: 'required', message: 'Missing required entity id.', path: 'id' }]);
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
          setIssues([{ code: 'not_found', message: 'Entity not found.' }]);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          setItem(null);
          setIssues([
            { code: 'error', message: caught instanceof Error ? caught.message : String(caught) },
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!item) {
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const result = await invokeOperation(strategy, {
        aggregate,
        datasource: dataSource,
        params: { id },
      });
      if (result.ok) {
        window.location.href = navigation.successRedirect?.targetPath ?? '/';
        return;
      }
      setIssues(result.issues);
    } catch (caught: unknown) {
      console.error(caught);
      setIssues([
        { code: 'error', message: caught instanceof Error ? caught.message : String(caught) },
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
          <label className="form-label">
            Identifier (IRI)
            <span className="form-required"> *</span>
          </label>
          <div className="form-control">
            <input type="text" value={item?.id ?? id} readOnly />
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
          {navigation.successRedirect ? (
            <a className="form-cancel" href={navigation.successRedirect.targetPath}>
              Cancel
            </a>
          ) : null}
        </div>
      </form>
    </section>
  );
}
