import { useState, type FormEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import type { OperationNavigationDescriptor } from '../navigation/navigation.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type { AggregateDescriptor, EntityModel } from '../types/aggregate.ts';
import { formFields, validateModel } from '../forms/form-model.ts';
import { generateIri } from '../forms/generate-iri.ts';
import { FormField } from './form-field.tsx';

interface CreateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  strategy: OperationStrategy<TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
}

export function CreateForm<TModel extends EntityModel>(props: CreateFormProps<TModel>) {
  const { title, aggregate, strategy, dataSource, navigation, instanceBaseIri } = props;
  const [model, setModel] = useState<TModel>(() => ({
    ...aggregate.createEmpty(),
    id: generateIri(instanceBaseIri),
  }));
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fields = formFields(aggregate.fields);
  const record = model as Record<string, unknown>;
  const errorFor = (path: string) => issues.find((issue) => issue.path === path)?.message;
  const generalErrors = issues.filter((issue) => !issue.path);

  const setField = (name: string, value: unknown) => {
    setModel((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
        params: {},
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
            <input
              type="text"
              value={model.id ?? ''}
              onChange={(event) => setField('id', event.target.value)}
            />
            {errorFor('id') ? <span className="form-error">{errorFor('id')}</span> : null}
          </div>
        </div>

        {fields.map((field) => (
          <FormField
            key={field.path}
            field={field}
            value={record[field.propertyName]}
            error={errorFor(field.path)}
            dataSource={dataSource}
            onChange={(value) => setField(field.propertyName, value)}
          />
        ))}

        {generalErrors.length > 0 ? (
          <div role="alert" className="form-errors">
            {generalErrors.map((issue, index) => (
              <p key={index}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create'}
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
