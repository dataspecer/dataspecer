import { useEffect, useState, type FormEvent } from 'react';

import type { DataSource } from '../datasource/data-source.ts';
import { hydrateCompositionDraft, type DraftEntity } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
import { validateModel } from '../forms/form-model.ts';
import type { OperationNavigationDescriptor } from '../navigation/navigation.ts';
import type { ValidationIssue } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
} from '../types/aggregate.ts';
import { EntityFormEditor } from './entity-form-editor.tsx';

interface UpdateFormProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregates: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel>;
  dataSource: DataSource;
  navigation: OperationNavigationDescriptor;
  instanceBaseIri: string;
  id: string;
}

export function UpdateForm<TModel extends EntityModel>(props: UpdateFormProps<TModel>) {
  const { title, aggregate, aggregates, strategy, dataSource, navigation, instanceBaseIri, id } =
    props;
  const [model, setModel] = useState<DraftEntity | null>(null);
  const [originalModel, setOriginalModel] = useState<DraftEntity | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setModel(null);
      setOriginalModel(null);
      setIssues([{ code: 'required', message: 'Missing required entity id.', path: 'id' }]);
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
          setIssues([{ code: 'not_found', message: 'Entity not found.' }]);
          return;
        }
        const hydrated = await hydrateCompositionDraft(
          item as DraftEntity,
          rootEntityTarget(aggregate),
          aggregates,
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
            { code: 'error', message: caught instanceof Error ? caught.message : String(caught) },
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
  }, [aggregate, aggregates, dataSource, id]);

  const generalErrors = issues.filter((issue) => !issue.path || !model);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!model || !originalModel) {
      return;
    }

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
        params: { id },
        payload: model as TModel,
        originalPayload: originalModel as TModel,
      });
      if (result.ok) {
        window.location.href = navigation.successRedirect?.targetPath ?? '/';
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
            aggregates={aggregates}
            model={model}
            originalModel={originalModel ?? undefined}
            dataSource={dataSource}
            instanceBaseIri={instanceBaseIri}
            issues={issues}
            rootIdentifierReadOnly
            onChange={setModel}
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
