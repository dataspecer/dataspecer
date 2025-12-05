import {
  InMemorySemanticModel,
} from "@dataspecer/core-v2/semantic-model/in-memory";
import {
  WritableSemanticModel,
} from "../semantic-model.ts";

class WritableInMemorySemanticModel
  extends InMemorySemanticModel
  implements WritableSemanticModel {

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

export function createWritableInMemorySemanticModel(args: {
  identifier: string,
  baseIri: string | null,
}): WritableSemanticModel {
  return new WritableInMemorySemanticModel(args.identifier, args.baseIri);
}
