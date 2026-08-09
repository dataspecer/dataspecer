import { useState, type FormEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import { createEntityDraft, type DraftEntity } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
import { validateModel } from '../forms/form-model.ts';
import { hrefForAction, type OperationNavigationDescriptor } from '../navigation/navigation.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
} from '../types/aggregate.ts';
import { EntityFormEditor } from './entity-form-editor.tsx';

interface CreateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregates: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
}

export function CreateForm<TModel extends EntityModel>(props: CreateFormProps<TModel>) {
  const { title, aggregate, aggregates, strategy, dataSource, navigation, instanceBaseIri } = props;
  const [model, setModel] = useState<DraftEntity>(() =>
    createEntityDraft(rootEntityTarget(aggregate), aggregates, instanceBaseIri)
  );
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const generalErrors = issues.filter((issue) => !issue.path);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateModel(model, rootEntityTarget(aggregate), aggregates);
    if (validation.length > 0) {
      setIssues(validation);
      return;
    }

    setIssues([]);
    setSubmitting(true);
    try {
      const result = await invokeOperation(strategy, {
        aggregate,
        aggregates,
        datasource: dataSource,
        params: {},
        payload: model as TModel,
      });
      if (result.ok) {
        window.location.href = hrefForAction(navigation.successRedirect, model.id) ?? '/';
        return;
      }
      setIssues(result.issues);
    } catch (caught: unknown) {
      console.error(caught);
      setIssues([
        {
          code: 'error',
          message: `${caught instanceof Error ? caught.message : String(caught)} (Some entities may already have been saved.)`,
        },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h2>{title}</h2>
      <form className="entity-form" onSubmit={(event) => void handleSubmit(event)}>
        <EntityFormEditor
          aggregate={aggregate}
          aggregates={aggregates}
          model={model}
          dataSource={dataSource}
          instanceBaseIri={instanceBaseIri}
          issues={issues}
          rootIdentifierReadOnly={false}
          onChange={setModel}
        />

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
          <button className="form-cancel" type="button" onClick={() => window.history.back()}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
