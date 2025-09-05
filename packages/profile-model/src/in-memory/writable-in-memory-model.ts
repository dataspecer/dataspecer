import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  ProfileEntityRecord,
  ProfileOperation,
  ProfileOperationResult,
  WritableProfileModel,
} from "../profile-model.ts";

class WritableInMemoryProfileModel implements WritableProfileModel {

  readonly identifier: string;

  /**
   * We keep copy of the baseIri to enable for null as a value.
   */
  readonly baseIri: string | null;

  readonly entities: ProfileEntityRecord = {};

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

  getEntities(): ProfileEntityRecord {
    return this.wrapper.getEntities();
  }

  getBaseIri(): string | null {
    return this.baseIri;
  }

  executeOperations(operations: ProfileOperation[])
    : ProfileOperationResult[] {
    return this.wrapper.executeOperations(operations);
  }

}

export function createWritableInMemoryProfileModel(args:{
  identifier: string,
  baseIri: string | null,
}): WritableProfileModel {
  return new WritableInMemoryProfileModel(args.identifier, args.baseIri);
}
