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
    const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
    const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";
    
    const label = entity.property(RDFS_LABEL);
    resource.pimHumanLabel = rdfObjectsToLanguageString(label);

    // Track which predicate was used for the name
    if (Object.keys(resource.pimHumanLabel).length > 0) {
        (resource as any).pimLabelIri = RDFS_LABEL;
    } else {
        // No label, use skos:prefLabel
        const prefLabel = entity.property(SKOS.prefLabel);
        resource.pimHumanLabel = rdfObjectsToLanguageString(prefLabel);
        if (Object.keys(resource.pimHumanLabel).length > 0) {
            (resource as any).pimLabelIri = SKOS.prefLabel;
        }
    }

    const comment = entity.property(RDFS_COMMENT);
    resource.pimHumanDescription = rdfObjectsToLanguageString(comment);

    // Track which predicate was used for the description
    if (Object.keys(resource.pimHumanDescription).length > 0) {
        (resource as any).pimDescriptionIri = RDFS_COMMENT;
    } else {
        // No description, use skos:definition
        const definition = entity.property(SKOS.definition);
        resource.pimHumanDescription = rdfObjectsToLanguageString(definition);
        if (Object.keys(resource.pimHumanDescription).length > 0) {
            (resource as any).pimDescriptionIri = SKOS.definition;
        }
    }

    resource.pimInterpretation = entity.iri;
    resource.iri = idProvider.cimToPim(resource.pimInterpretation);
}

// todo use helper function in core
function rdfObjectsToLanguageString(objects: RdfObject[]): LanguageString {
    return Object.fromEntries(objects.map((o) => [!o.language ? "en" : o.language, o.value]));
}
