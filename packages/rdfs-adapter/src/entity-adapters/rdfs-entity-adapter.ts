import {RdfMemorySourceWrap, RdfObject} from "@dataspecer/core/core/adapter/rdf";
import {PimResource} from "@dataspecer/core/pim/model";
import {LanguageString} from "@dataspecer/core/core";
import {IriProvider} from "@dataspecer/core/cim";
import { SKOS } from "../rdfs-vocabulary.ts";

const RDFS_LABEL = "http://www.w3.org/2000/01/rdf-schema#label";
const RDFS_COMMENT = "http://www.w3.org/2000/01/rdf-schema#comment";

export function loadRdfsEntityToResource(
    entity: RdfMemorySourceWrap,
    idProvider: IriProvider,
    resource: PimResource
) {
    const label = entity.property(RDFS_LABEL);
    resource.pimHumanLabel = rdfObjectsToLanguageString(label);
    (resource as any).pimHumanLabelProperty = label.length > 0 ? RDFS_LABEL : null;

    if (Object.keys(resource.pimHumanLabel).length === 0) {
        // No label, use skos:prefLabel
        const prefLabel = entity.property(SKOS.prefLabel);
        resource.pimHumanLabel = rdfObjectsToLanguageString(prefLabel);
        (resource as any).pimHumanLabelProperty = prefLabel.length > 0 ? SKOS.prefLabel : null;
    }

    const comment = entity.property(RDFS_COMMENT);
    resource.pimHumanDescription = rdfObjectsToLanguageString(comment);
    (resource as any).pimHumanDescriptionProperty = comment.length > 0 ? RDFS_COMMENT : null;

    if (Object.keys(resource.pimHumanDescription).length === 0) {
        // No description, use skos:definition
        const definition = entity.property(SKOS.definition);
        resource.pimHumanDescription = rdfObjectsToLanguageString(definition);
        (resource as any).pimHumanDescriptionProperty = definition.length > 0 ? SKOS.definition : null;
    }

    resource.pimInterpretation = entity.iri;
    resource.iri = idProvider.cimToPim(resource.pimInterpretation);
}

// todo use helper function in core
function rdfObjectsToLanguageString(objects: RdfObject[]): LanguageString {
    return Object.fromEntries(objects.map((o) => [!o.language ? "en" : o.language, o.value]));
}
