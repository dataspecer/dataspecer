import { useEffect, useState, type FormEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import { formFields, validateModel } from '../forms/form-model.ts';
import type { OperationNavigationDescriptor } from '../navigation/navigation.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type { AggregateDescriptor, EntityModel } from '../types/aggregate.ts';
import { FormField } from './form-field.tsx';

interface UpdateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  strategy: OperationStrategy<TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  id: string;
}

export function UpdateForm<TModel extends EntityModel>(props: UpdateFormProps<TModel>) {
  const { title, aggregate, strategy, dataSource, navigation, id } = props;
  const [model, setModel] = useState<TModel | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setModel(null);
      setIssues([{ code: 'required', message: 'Missing required entity id.', path: 'id' }]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    dataSource
      .readDetail({ aggregate, id })
      .then((item) => {
        if (!active) {
          return;
        }
        if (item) {
          setModel(item);
          setIssues([]);
        } else {
          setModel(null);
          setIssues([{ code: 'not_found', message: 'Entity not found.' }]);
        }
      })
      .catch((caught: unknown) => {
        console.error(caught);
        if (active) {
          setModel(null);
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

  const fields = formFields(aggregate.fields);
  const record = (model ?? {}) as Record<string, unknown>;
  const errorFor = (path: string) => issues.find((issue) => issue.path === path)?.message;
  const generalErrors = issues.filter((issue) => !issue.path);

  const setField = (name: string, value: unknown) => {
    setModel((previous) => (previous ? { ...previous, [name]: value } : previous));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!model) {
      return;
    }

    const validation = validateModel(record, aggregate.fields);
    if (validation.length > 0) {
      setIssues(validation);
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const result = await invokeOperation(strategy, {
        aggregate,
        datasource: dataSource,
        params: { id },
        payload: model,
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
            <input type="text" value={model?.id ?? id} readOnly />
            {errorFor('id') ? <span className="form-error">{errorFor('id')}</span> : null}
          </div>
        </div>

        {model
          ? fields.map((field) => (
              <FormField
                key={field.path}
                field={field}
                value={record[field.propertyName]}
                error={errorFor(field.path)}
                dataSource={dataSource}
                onChange={(value) => setField(field.propertyName, value)}
              />
            ))
          : null}

        {generalErrors.length > 0 ? (
          <div role="alert" className="form-errors">
            {generalErrors.map((issue, index) => (
              <p key={index}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        <div className="form-actions">
          <button type="submit" disabled={submitting || !model}>
            {submitting ? 'Saving…' : 'Save'}
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
