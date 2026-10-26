import { DataSpecificationArtefact, DataSpecification } from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "@dataspecer/generators/generator";
import { prepareArtifacts } from "./artifacts.ts";
import { prepareDataSpecification } from "./data-specification.ts";
import { prepareFunctions } from "./functions.ts";
import { HandlebarsAdapter } from "@dataspecer/handlebars-adapter";

/**
 * Function that adds or modifies the mustache view based on the package context.
 */
export type mustacheViewReducer = (view: object, context: PackageContext, adapter: HandlebarsAdapter) => object;

export interface PackageContext {
    context: ArtefactGeneratorContext;
    artefact: DataSpecificationArtefact;
    specification: DataSpecification;
}

/**
 * Default mustache view reducers
 */
export const defaultMustacheViewReducers: mustacheViewReducer[] = [
    prepareFunctions,
    prepareArtifacts,
    prepareDataSpecification,
];

/**
 * Returns the mustache view for the template
 */
export function getMustacheView(context: PackageContext, adapter: HandlebarsAdapter): object {
    return defaultMustacheViewReducers.reduce((view, reducer) => reducer(view, context, adapter), {});
}