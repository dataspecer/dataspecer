import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  WritableProfileModel,
} from "../profile-model.ts";

class WritableInMemoryProfileModel
  extends InMemorySemanticModel
  implements WritableProfileModel {

  readonly identifier: string;

  constructor(
    identifier: string,
    baseIri: string | null,
  ) {
    super();
    this.identifier = identifier;
    this.setBaseIri(baseIri ?? "");
  }

  getId(): string {
    return this.identifier;
  }

}

export function createWritableInMemoryProfileModel(args: {
  identifier: string,
  baseIri: string | null,
}): WritableProfileModel {
  return new WritableInMemoryProfileModel(args.identifier, args.baseIri);
}
