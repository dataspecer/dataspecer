import type { DataSource } from '../data-source/data-source.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
} from '../types/aggregate.ts';
import type { OperationResult, ValidationResult } from './operation-result.ts';

export interface OperationContext<TModel extends EntityModel = EntityModel> {
  aggregate: AggregateDescriptor<TModel>;
  datasource: DataSource;
  aggregateRegistry: AggregateDescriptorMap;
  params: Record<string, unknown>;
  payload?: TModel;
  /** Composition paths configured to cascade for a Delete operation. */
  cascadePaths?: readonly string[];
  /**
   * Provides the fully hydrated value the default Update strategy uses to find created and
   * removed children.
   */
  originalPayload?: TModel;
}

/**
 * One CRUD operation of the generated application. Override the generated subclasses in
 * src/modules to customize behavior. The optional hooks run around execute and are skipped
 * when not defined.
 */
export interface OperationStrategy<TModel extends EntityModel = EntityModel, TResult = unknown> {
  validateRequest?(ctx: OperationContext<TModel>): Promise<ValidationResult>;
  execute(ctx: OperationContext<TModel>): Promise<OperationResult<TResult>>;
  postprocess?(
    ctx: OperationContext<TModel>,
    result: OperationResult<TResult>,
  ): Promise<OperationResult<TResult>>;
}

/**
 * Runs a strategy as validateRequest, then execute, then postprocess. When validateRequest
 * reports issues, execute does not run and the issues are returned as a failed result.
 */
export async function invokeOperation<TModel extends EntityModel, TResult = unknown>(
  strategy: OperationStrategy<TModel, TResult>,
  context: OperationContext<TModel>,
): Promise<OperationResult<TResult>> {
  const validation = await strategy.validateRequest?.(context);
  if (validation && !validation.ok) {
    return {
      ok: false,
      issues: validation.issues,
    };
  }

  const result = await strategy.execute(context);
  return strategy.postprocess ? strategy.postprocess(context, result) : result;
}
