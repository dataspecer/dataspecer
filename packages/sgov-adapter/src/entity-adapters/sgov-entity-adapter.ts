import { RdfObject, RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import { PimResource } from "@dataspecer/core/pim/model";
import { LanguageString } from "@dataspecer/core/core";
import { SKOS } from "../sgov-vocabulary.ts";
import { IriProvider } from "@dataspecer/core/cim";

export async function loadSgovEntityToResource(
  entity: RdfSourceWrap,
  idProvider: IriProvider,
  resource: PimResource
): Promise<void> {
  const prefLabel = await entity.property(SKOS.prefLabel);
  resource.pimHumanLabel = rdfObjectsToLanguageString(prefLabel);
  const definition = await entity.property(SKOS.definition);
  resource.pimHumanDescription = rdfObjectsToLanguageString(definition);
  resource.pimInterpretation = entity.iri;
  resource.iri = idProvider.cimToPim(resource.pimInterpretation);
}

function rdfObjectsToLanguageString(objects: RdfObject[]): LanguageString {
  return Object.fromEntries(objects.filter(RdfObject.isLiteral).map((o) => [o.language, o.value]));
}
