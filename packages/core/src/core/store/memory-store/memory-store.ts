import type { Operation } from "../../../operation/index.ts";
import { DataPsmOperationResult } from "../../../data-psm/operation/data-psm-operation-result.ts";
import {CoreResource} from "../../core-resource.ts";
import {CoreExecutorResult, CoreOperationExecutor, CreateNewIdentifier,} from "../../executor/index.ts";
import {assert} from "../../utilities/assert.ts";
import {clone} from "../../utilities/clone.ts";
import {CoreResourceReader} from "../../core-reader.ts";
import {CoreResourceWriter} from "../../core-writer.ts";
import {createExecutorMap, ExecutorMap} from "../executor-map.ts";

export class MemoryStore implements CoreResourceReader, CoreResourceWriter {
  protected readonly executors: ExecutorMap;

  protected readonly createNewIdentifier: CreateNewIdentifier;

  protected readonly baseIri: string;

  protected operations: Operation[] = [];

  protected resources: { [iri: string]: CoreResource } = {};

  protected constructor(
    baseIri: string,
    executors: ExecutorMap,
    createNewIdentifier: CreateNewIdentifier | null
  ) {
    this.baseIri = baseIri;
    this.executors = executors;
    if (createNewIdentifier === null) {
      this.createNewIdentifier = (name) => {
        return this.baseIri + "/" + name + "/" + this.createUniqueIdentifier();
      };
    } else {
      this.createNewIdentifier = createNewIdentifier;
    }
  }

  static create(
    baseIri: string,
    executors: CoreOperationExecutor<Operation>[],
    createNewIdentifier: CreateNewIdentifier | null = null
  ): MemoryStore {
    const executorForTypes = createExecutorMap(executors);
    return new MemoryStore(baseIri, executorForTypes, createNewIdentifier);
  }

  listResources(): string[] {
    return Object.keys(this.resources);
  }

  listResourcesOfType(typeIri: string): string[] {
    const result: string[] = [];
    for (const [iri, resource] of Object.entries(this.resources)) {
      if (resource.types.includes(typeIri)) {
        result.push(iri);
      }
    }
    return result;
  }

  readResource(iri: string): CoreResource | null {
    // TODO: We may need to create a deep copy here.
    return this.resources[iri] || null;
  }

  applyOperation(operation: Operation): DataPsmOperationResult {
    const executor = this.findCoreExecutor(operation);

    const executorResult = executor.execute(
      this,
      this.createNewIdentifier,
      operation
    );

    if (executorResult.failed) {
      throw new Error("Operation failed: " + executorResult.message);
    }

    // We add operation once it is cleared that it can be executed.
    const storedOperation = this.addOperation(operation);

    this.resources = {
      ...this.resources,
      ...executorResult.changed,
      ...executorResult.created,
    };
    executorResult.deleted.forEach((iri) => delete this.resources[iri]);
    return this.prepareOperationResult(executorResult, storedOperation);
  }

  protected findCoreExecutor(
    operation: Operation
  ): CoreOperationExecutor<Operation> {
    const executor = this.executors[operation.type];
    assert(
      executor !== undefined,
      `Can't determine executor for operation type '${operation.type}'.`
    );
    return executor;
  }

  protected addOperation<T extends Operation>(operation: T): T {
    const result = clone(operation) as T;
    this.operations.push(result);
    return result;
  }

  protected createUniqueIdentifier(): string {
    return (
      Date.now() +
      "-xxxx-xxxx-yxxx".replace(/[xy]/g, (pattern) => {
        const code = (Math.random() * 16) | 0;
        const result = pattern == "x" ? code : (code & 0x3) | 0x8;
        return result.toString(16);
      })
    );
  }

  protected prepareOperationResult(
    executorResult: CoreExecutorResult,
    operation: Operation
  ): DataPsmOperationResult {
    const result = executorResult.operationResult ?? new DataPsmOperationResult();
    result.operation = operation;
    result.created = Object.keys(executorResult.created);
    result.changed = Object.keys(executorResult.changed);
    result.deleted = executorResult.deleted;
    return result;
  }
}
