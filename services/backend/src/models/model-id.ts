/**
 * A model id addresses one store of a resource: the default "model" store is
 * addressed by the resource IRI itself, any other named store as
 * `${resourceIri}#${storeName}`.
 */

/** Id of the virtual project model that lists the models of a project. */
export const PROJECT_MODEL_ID = "_project_model";

export function composeModelId(iri: string, storeName: string): string {
  return storeName === "model" ? iri : `${iri}#${storeName}`;
}

export function splitModelId(modelId: string): { iri: string; storeName: string } {
  const hashIndex = modelId.indexOf("#");
  if (hashIndex === -1) {
    return { iri: modelId, storeName: "model" };
  }
  return { iri: modelId.slice(0, hashIndex), storeName: modelId.slice(hashIndex + 1) };
}
