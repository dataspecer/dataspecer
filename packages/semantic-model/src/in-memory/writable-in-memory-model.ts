import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  SemanticEntityRecord,
  SemanticOperation,
  SemanticOperationResult,
  WritableSemanticModel,
} from "../semantic-model.ts";

class WritableInMemorySemanticModel implements WritableSemanticModel {

  readonly identifier: string;

  /**
   * We keep copy of the baseIri to enable for null as a value.
   */
  readonly baseIri: string | null;

  readonly entities: SemanticEntityRecord = {};

  readonly wrapper: InMemorySemanticModel;

  constructor(
    identifier: string,
    baseIri: string | null,
  ) {
    this.identifier = identifier;
    this.baseIri = baseIri;
    //
    this.wrapper = new InMemorySemanticModel();
    if (baseIri !== null) {
      this.wrapper.setBaseIri(baseIri);
    }
  }

  getId(): string {
    return this.identifier;
  }

  getEntities(): SemanticEntityRecord {
    return this.wrapper.getEntities();
  }

  getBaseIri(): string | null {
    return this.baseIri;
  }

  executeOperations(operations: SemanticOperation[])
    : SemanticOperationResult[] {
    return this.wrapper.executeOperations(operations);
  }

}

export function createWritableInMemorySemanticModel(args: {
  identifier: string,
  baseIri: string | null,
}): WritableSemanticModel {
  return new WritableInMemorySemanticModel(args.identifier, args.baseIri);
}
