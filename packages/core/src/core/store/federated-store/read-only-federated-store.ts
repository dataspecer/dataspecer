import { CoreResourceReader } from "../../core-reader.ts";
import { CoreResource } from "../../core-resource.ts";

export class ReadOnlyFederatedStore implements CoreResourceReader {
  readonly readers: CoreResourceReader[];

  protected constructor(readers: CoreResourceReader[]) {
    this.readers = readers;
  }

  /**
   * The lazy version returns the first representation of a resource
   * found in {@link readResource}.
   */
  static createLazy(readers: CoreResourceReader[]): ReadOnlyFederatedStore {
    return new ReadOnlyFederatedStore(readers);
  }

  listResources(): string[] {
    const resources = new Set<string>();
    for (const model of this.readers) {
      model.listResources().forEach((resource) =>
        resources.add(resource)
      );
    }
    return [...resources];
  }

  /**
   * Returns the resource from the first reader that has it.
   */
  readResource(iri: string): CoreResource | null {
    for (const model of this.readers) {
      const resource = model.readResource(iri);
      if (resource) {
        return resource;
      }
    }
    return null;
  }

  listResourcesOfType(typeIri: string): string[] {
    const resources = new Set<string>();
    for (const model of this.readers) {
      model.listResourcesOfType(typeIri).forEach((resource) =>
        resources.add(resource)
      );
    }
    return [...resources];
  }
}
