import { createDefaultVisualModelFactory } from "@dataspecer/visual-model";

const factory = createDefaultVisualModelFactory();

/**
 * Create and return empty visual model with given IRI as an identifier.
 */
export const createVisualModel = (iri: string) => {
    return factory.createNewWritableVisualModelSync(iri);
};
