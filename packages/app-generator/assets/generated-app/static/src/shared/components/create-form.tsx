import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DataSource } from '../datasource/data-source.ts';
import { createEntityDraft } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
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
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
}

export function CreateForm<TModel extends EntityModel>(props: CreateFormProps<TModel>) {
  const { title, aggregate, aggregateRegistry, strategy, dataSource, navigation, instanceBaseIri } =
    props;
  const [model, setModel] = useState<EntityRecord>(() =>
    createEntityDraft(rootEntityTarget(aggregate), aggregateRegistry, instanceBaseIri)
  );
  const navigate = useNavigate();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validationActive, setValidationActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const generalErrors = issues.filter((issue) => !issue.path);

  const handleChange = (next: EntityRecord) => {
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
        navigate(hrefForAction(navigation.successRedirect, result.data.id ?? model.id) ?? '/');
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
    <section>
      <h2>{title}</h2>
      <form className="entity-form" onSubmit={(event) => void handleSubmit(event)}>
        <EntityFormEditor
          aggregate={aggregate}
          aggregateRegistry={aggregateRegistry}
          model={model}
          dataSource={dataSource}
          instanceBaseIri={instanceBaseIri}
          issues={issues}
          rootIdentifierReadOnly={false}
          onChange={handleChange}
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
          <button className="form-cancel" type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
