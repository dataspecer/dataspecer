import type { CoreResource } from "../core-resource.ts";

/**
 * Interface for immediate access to resources without using promises.
 */
export interface ImmediateCoreResourceReader {
    /**
     * Return IRIs of all resources.
     */
    listResourcesImmediate(): Promise<string[]> | string[];

    /**
     * Return IRIs of all resources with given resource type, this may not
     * correspond to RDF IRI.
     */
    listResourcesOfTypeImmediate(typeIri: string): Promise<string[]> | string[];

    /**
     * Return representation of a particular resources.
     */
    readResourceImmediate(iri: string): Promise<CoreResource | null> | CoreResource | null;
}
