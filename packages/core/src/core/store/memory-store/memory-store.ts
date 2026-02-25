import {CoreOperation, CoreOperationResult} from "../../operation/index.ts";
import {CoreResource} from "../../core-resource.ts";
import {CoreExecutorResult, CoreOperationExecutor, CreateNewIdentifier,} from "../../executor/index.ts";
import {assert, assertNot} from "../../utilities/assert.ts";
import {clone} from "../../utilities/clone.ts";
import {CoreResourceReader} from "../../core-reader.ts";
import {CoreResourceWriter} from "../../core-writer.ts";
import {createExecutorMap, ExecutorMap} from "../executor-map.ts";
import type { ImmediateCoreResourceReader } from "../immediate-core-resource-reader.ts";

export class MemoryStore implements CoreResourceReader, CoreResourceWriter, ImmediateCoreResourceReader {
  protected readonly executors: ExecutorMap;

  protected readonly createNewIdentifier: CreateNewIdentifier;

  protected readonly baseIri: string;

  protected operations: CoreOperation[] = [];

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
    executors: CoreOperationExecutor<CoreOperation>[],
    createNewIdentifier: CreateNewIdentifier | null = null
  ): MemoryStore {
    const executorForTypes = createExecutorMap(executors);
    return new MemoryStore(baseIri, executorForTypes, createNewIdentifier);
  }

  async listResources(): Promise<string[]> {
    return Object.keys(this.resources);
  }

  listResourcesImmediate(): string[] {
    return Object.keys(this.resources);
  }

  listResourcesOfType(typeIri: string): Promise<string[]> {
    const result: string[] = [];
    for (const [iri, resource] of Object.entries(this.resources)) {
      if (resource.types.includes(typeIri)) {
        result.push(iri);
      }
    }
    return Promise.resolve(result);
  }

  listResourcesOfTypeImmediate(typeIri: string): string[] {
    const result: string[] = [];
    for (const [iri, resource] of Object.entries(this.resources)) {
      if (resource.types.includes(typeIri)) {
        result.push(iri);
      }
    }
    return result;
  }

  async readResource(iri: string): Promise<CoreResource> {
    // TODO: We may need to create a deep copy here.
    return this.resources[iri];
  }

  readResourceImmediate(iri: string): CoreResource | null {
    return this.resources[iri] || null;
  }

  async applyOperation(operation: CoreOperation): Promise<CoreOperationResult> {
    const executor = this.findCoreExecutor(operation);

    const executorResult = await executor.execute(
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
    operation: CoreOperation
  ): CoreOperationExecutor<CoreOperation> {
    const candidates: CoreOperationExecutor<CoreOperation>[] = [];
    operation.types.forEach((type) => {
      const executor = this.executors[type];
      if (executor !== undefined) {
        candidates.push(executor);
      }
    });
    assert(
      candidates.length === 1,
      "Can't determine executor for given operation."
    );
    return candidates[0];
  }

  protected addOperation<T extends CoreOperation>(operation: T): T {
    const result = clone(operation) as T;
    assertNot(this.baseIri === null, "Base IRI is not defined.");
    result.iri = this.createNewIdentifier("operation");
    if (this.operations.length > 0) {
      result.parent = this.operations[this.operations.length - 1].iri;
    }
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
    operation: CoreOperation
  ): CoreOperationResult {
    const result = executorResult.operationResult;
    result.operation = operation;
    result.created = Object.keys(executorResult.created);
    result.changed = Object.keys(executorResult.changed);
    result.deleted = executorResult.deleted;
    return result;
  }
}
