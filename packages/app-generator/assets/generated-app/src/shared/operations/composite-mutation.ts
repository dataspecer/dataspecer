import type { DataSource } from '../data-source/data-source.ts';
import { hydrateCompositionTree } from '../forms/form-draft.ts';
import { rootEntityTarget } from '../forms/entity-target.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
  EntityRecord,
} from '../types/aggregate.ts';
import {
  buildCompositeCreatePlan,
  buildCompositeDeletePlan,
  buildCompositeUpdatePlan,
  type CompositeMutationStep,
} from './composite-mutation-plan.ts';

export async function createComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel
): Promise<TModel> {
  const steps = buildCompositeCreatePlan(aggregate, aggregateRegistry, payload as EntityRecord);
  await executePlan(dataSource, steps);
  return payload;
}

export async function updateComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel,
  original: TModel
): Promise<TModel> {
  const steps = buildCompositeUpdatePlan(
    aggregate,
    aggregateRegistry,
    payload as EntityRecord,
    original as EntityRecord
  );
  await executePlan(dataSource, steps);
  return payload;
}

export async function deleteComposite<TModel extends EntityModel>(
  dataSource: DataSource,
  aggregate: AggregateDescriptor<TModel>,
  aggregateRegistry: AggregateDescriptorMap,
  payload: TModel,
  cascadePaths: readonly string[]
): Promise<void> {
  const hydrated = await hydrateCompositionTree(
    payload as EntityRecord,
    rootEntityTarget(aggregate),
    aggregateRegistry,
    dataSource,
    cascadePaths
  );
  const steps = buildCompositeDeletePlan(aggregate, aggregateRegistry, hydrated, cascadePaths);
  await executePlan(dataSource, steps);
}

async function executePlan(
  dataSource: DataSource,
  steps: readonly CompositeMutationStep[]
): Promise<void> {
  // The steps have a dependency order, so they cannot run concurrently. Endpoint writes completed
  // before a failure cannot be rolled back.
  for (const step of steps) {
    if (step.kind === 'delete') {
      await dataSource.delete({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        id: step.id,
      });
    } else if (step.kind === 'create') {
      await dataSource.create({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        specializationIri: step.specializationIri,
        payload: step.payload,
      });
    } else {
      await dataSource.update({
        aggregate: step.target.aggregate,
        fieldPath: step.target.fieldPath,
        specializationIri: step.specializationIri,
        id: step.id,
        payload: step.payload,
      });
    }
  }
}
