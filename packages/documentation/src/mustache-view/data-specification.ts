import { ConceptualModelComplexType } from "@dataspecer/generators/conceptual-model/model/conceptual-model-type";
import { filterByStructural } from "@dataspecer/generators/conceptual-model/transformation/filter-by-structural";
import { assertNot } from "@dataspecer/core/core/utilities/assert";
import { DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { getArtifactsView } from "./artifacts.ts";
import { PackageContext } from "./views.ts";
import { HandlebarsAdapter } from "@dataspecer/handlebars-adapter";

/**
 * Prepares view for common information about data specification.
 */
export function prepareDataSpecification(
    view: object,
    context: PackageContext,
    adapter: HandlebarsAdapter,
) {
    const generatorContext = context.context;
    let conceptualModel = generatorContext.conceptualModels[context.specification.pim];
    assertNot(
      conceptualModel === undefined,
      `Missing conceptual model ${context.specification.pim}.`
    );

    const structureModels = context.specification.psms.map(psm => generatorContext.structureModels[psm]);
    conceptualModel = filterByStructural(conceptualModel, structureModels);

    // Sort properties in conceptual model
    // Link classes to properties
    // Remove reverse properties
    for (const c of Object.values(conceptualModel.classes)) {
        c.properties = [
            ...c.properties.filter(p => p.dataTypes[0]?.isAttribute()),
            ...c.properties.filter(p => !p.dataTypes[0]?.isAttribute()),
        ].filter(p => !p.isReverse);
        c.properties.forEach(p => {
            p.dataTypes.filter(dt => dt.isAssociation()).forEach((dt: ConceptualModelComplexType) => {
                // @ts-ignore
                dt.class = conceptualModel.classes[dt.pimClassIri];
            });
        });
    }

    return {
        ...view,
        semanticModels: [{
            ...conceptualModel,
            classes: Object.values(conceptualModel.classes)
        }],
        structureModels: context.specification.psms.map(iri => {
            return {
                ...generatorContext.structureModels[iri],
                ...getArtifactsView(
                    context,
                    context.specification.artefacts.filter(
                        // @ts-ignore
                        a => context.artefact.artefacts.includes(a.iri)
                    ).filter(DataSpecificationSchema.is).filter(a => a.psm === iri).map(a => a.iri),
                    adapter
                ),
            }
        }),
    }
}