import {RdfMemorySourceWrap, RdfObject} from "@dataspecer/core/core/adapter/rdf";
import {PimResource} from "@dataspecer/core/pim/model";
import {LanguageString} from "@dataspecer/core/core";
import {IriProvider} from "@dataspecer/core/cim";
import { SKOS } from "../rdfs-vocabulary.ts";

export function loadRdfsEntityToResource(
    entity: RdfMemorySourceWrap,
    idProvider: IriProvider,
    resource: PimResource
) {
    const label = entity.property("http://www.w3.org/2000/01/rdf-schema#label");
    resource.pimHumanLabel = rdfObjectsToLanguageString(label);

    if (Object.keys(resource.pimHumanLabel).length === 0) {
        // No label, use skos:prefLabel
        const prefLabel = entity.property(SKOS.prefLabel);
        resource.pimHumanLabel = rdfObjectsToLanguageString(prefLabel);
    }

    const comment = entity.property("http://www.w3.org/2000/01/rdf-schema#comment");
    resource.pimHumanDescription = rdfObjectsToLanguageString(comment);

    if (Object.keys(resource.pimHumanDescription).length === 0) {
        // No description, use skos:definition
        const definition = entity.property(SKOS.definition);
        resource.pimHumanDescription = rdfObjectsToLanguageString(definition);
    }

    resource.pimInterpretation = entity.iri;
    resource.iri = idProvider.cimToPim(resource.pimInterpretation);
}

// todo use helper function in core
function rdfObjectsToLanguageString(objects: RdfObject[]): LanguageString {
    return Object.fromEntries(objects.map((o) => [!o.language ? "en" : o.language, o.value]));
}
