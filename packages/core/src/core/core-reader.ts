import { CoreResource } from "./core-resource.ts";

export interface CoreResourceReader {
  /**
   * Return IRIs of all resources.
   */
  listResources(): Promise<string[]>;

  /**
   * Return IRIs of all resources with given resource type, this may not
   * correspond to RDF IRI.
   */
  listResourcesOfType(typeIri: string): Promise<string[]>;

  /**
   * Return representation of a particular resources.
   */
  readResource(iri: string): Promise<CoreResource | null>;
}
