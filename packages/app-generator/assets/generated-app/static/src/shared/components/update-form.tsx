import { useEffect, useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DataSource } from '../datasource/data-source.ts';
import { hydrateCompositionTree } from '../forms/form-draft.ts';
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

interface UpdateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
  id: string;
}

export function UpdateForm<TModel extends EntityModel>(props: UpdateFormProps<TModel>) {
  const {
    title,
    aggregate,
    aggregateRegistry,
    strategy,
    dataSource,
    navigation,
    instanceBaseIri,
    id,
  } = props;
  const [model, setModel] = useState<EntityRecord | null>(null);
  const [originalModel, setOriginalModel] = useState<EntityRecord | null>(null);
  const navigate = useNavigate();
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [validationActive, setValidationActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValidationActive(false);
    if (!id) {
      setModel(null);
      setOriginalModel(null);
      setIssues([
        { code: ValidationIssueCode.Required, message: 'Missing required entity id.', path: 'id' },
      ]);
      setLoading(false);
      return;
    }

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const item = await dataSource.readDetail({ aggregate, id });
        if (!active) {
          return;
        }
        if (!item) {
          setModel(null);
          setOriginalModel(null);
          setIssues([{ code: ValidationIssueCode.NotFound, message: 'Entity not found.' }]);
          return;
        }
        const hydrated = await hydrateCompositionTree(
          item as EntityRecord,
          rootEntityTarget(aggregate),
          aggregateRegistry,
          dataSource
        );
        if (active) {
          setModel(hydrated);
          setOriginalModel(structuredClone(hydrated));
          setIssues([]);
        }
      } catch (caught: unknown) {
        console.error(caught);
        if (active) {
          setModel(null);
          setOriginalModel(null);
          setIssues([
            {
              code: ValidationIssueCode.Error,
              message: errorMessage(caught),
            },
          ]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();

    return () => {
      active = false;
    };
  }, [aggregate, aggregateRegistry, dataSource, id]);

  const generalErrors = issues.filter((issue) => !issue.path || !model);

  const handleChange = (next: EntityRecord) => {
    setModel(next);
    if (validationActive) {
      setIssues(validateModel(next, rootEntityTarget(aggregate), aggregateRegistry));
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!model || !originalModel) {
      return;
    }

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
        params: { id },
        payload: model as TModel,
        originalPayload: originalModel as TModel,
      });
      if (result.ok) {
        navigate(hrefForAction(navigation.successRedirect, id) ?? '/');
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
        {model ? (
          <EntityFormEditor
            aggregate={aggregate}
            aggregateRegistry={aggregateRegistry}
            model={model}
            originalModel={originalModel ?? undefined}
            dataSource={dataSource}
            instanceBaseIri={instanceBaseIri}
            issues={issues}
            rootIdentifierReadOnly
            onChange={handleChange}
          />
        ) : null}

        {generalErrors.length > 0 ? (
          <div role="alert" className="form-errors">
            {generalErrors.map((issue, index) => (
              <p key={index}>{issue.message}</p>
            ))}
          </div>
        ) : null}

        <div className="form-actions">
          <button type="submit" disabled={submitting || !model || !originalModel}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
          <button className="form-cancel" type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
