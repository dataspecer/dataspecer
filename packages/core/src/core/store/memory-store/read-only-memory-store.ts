import { clone } from "../../utilities/clone.ts";
import { CoreResourceReader } from "../../core-reader.ts";
import { CoreResource } from "../../core-resource.ts";

export class ReadOnlyMemoryStore implements CoreResourceReader {
  private readonly resources: { [iri: string]: CoreResource };

  protected constructor(resources: { [iri: string]: CoreResource }) {
    this.resources = resources;
  }

  static create(resources: {
    [iri: string]: CoreResource;
  }): ReadOnlyMemoryStore {
    return new ReadOnlyMemoryStore(resources);
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
    const resource = this.resources[iri];
    if (resource === undefined) {
      return null;
    }
    return clone(this.resources[iri]) as CoreResource;
  }
}
