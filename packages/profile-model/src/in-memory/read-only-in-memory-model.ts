import { ProfileModel, ProfileEntityRecord } from "../profile-model.ts";

class ReadOnlyInMemoryProfileModel implements ProfileModel {

  readonly identifier: string;

  readonly baseIri: string | null;

  readonly entities: ProfileEntityRecord = {};

  constructor(
    identifier: string,
    baseIri: string | null,
    entities: ProfileEntityRecord,
  ) {
    this.identifier = identifier;
    this.baseIri = baseIri;
    // We create a copy.
    this.entities = { ...entities };
  }

  getId(): string {
    return this.identifier;
  }

  getEntities(): ProfileEntityRecord {
    return this.entities;
  }

  getBaseIri(): string | null {
    return this.baseIri;
  }

}

export function createReadOnlyInMemoryProfileModel(
  identifier: string,
  baseIri: string | null,
  entities: ProfileEntityRecord,
): ProfileModel {
  return new ReadOnlyInMemoryProfileModel(identifier, baseIri, entities);
}
