import {CoreResource, CoreResourceReader} from "../../core/index.ts";
import {DataPsmAssociationEnd, DataPsmInclude, DataPsmOr, DataPsmSchema} from "../model/index.ts";

/**
 * Todo introduce as operation
 */
export function replaceObjectInSchema(
  schemaIri: string,
  searchIri: string,
  replacementIri: string,
  reader: CoreResourceReader,
): CoreResource[] {
  const schema = reader.readResource(schemaIri) as DataPsmSchema;
  const changedResources = [] as CoreResource[];

  // Check roots
  if (schema.dataPsmRoots.includes(searchIri)) {
    changedResources.push({...schema, dataPsmRoots: [...schema.dataPsmRoots.map((iri) => (iri === searchIri ? replacementIri : iri))]} as DataPsmSchema);
  }

  // Check all resources in schema
  for (const resourceIri of schema.dataPsmParts) {
    const resource = reader.readResource(resourceIri) as CoreResource;
    if (resource === null) {
      continue;
    }
    // Check associations
    if (DataPsmAssociationEnd.is(resource)) {
      if (resource.dataPsmPart === searchIri) {
        changedResources.push({...resource, dataPsmPart: replacementIri} as DataPsmAssociationEnd);
      }
    }
    // Check ors
    if (DataPsmOr.is(resource)) {
      if (resource.dataPsmChoices.includes(searchIri)) {
        changedResources.push({...resource, dataPsmChoices: resource.dataPsmChoices.map((iri) => (iri === searchIri ? replacementIri : iri))} as DataPsmOr);
      }
    }
    // Check includes
    if (DataPsmInclude.is(resource)) {
      if (resource.dataPsmIncludes === searchIri) {
        changedResources.push({...resource, dataPsmIncludes: replacementIri} as DataPsmInclude);
      }
    }
  }
  return changedResources;
}
