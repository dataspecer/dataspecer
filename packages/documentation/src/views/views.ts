import { DataSpecification, DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "@dataspecer/generators/generator";
import { HandlebarsAdapter } from "@dataspecer/handlebars-adapter";
import { prepareArtifacts } from "./artifacts.ts";
import { prepareDataSpecification } from "./data-specification.ts";
import { prepareFunctions } from "./functions.ts";

/**
 * Function that adds or modifies the view based on the package context.
 */
export type viewReducer = (view: object, context: PackageContext, adapter: HandlebarsAdapter) => object;

export interface PackageContext {
  context: ArtefactGeneratorContext;
  artefact: DataSpecificationArtefact;
  specification: DataSpecification;
}

/**
 * Default view reducers
 */
export const defaultViewReducers: viewReducer[] = [
  prepareFunctions,
  prepareArtifacts,
  prepareDataSpecification
];

/**
 * Returns the view for the template
 */
export function getView(context: PackageContext, adapter: HandlebarsAdapter): object {
  // Artifact callbacks keep this reference and read the completed view when rendering.
  const view = {};
  for (const reducer of defaultViewReducers) {
    Object.assign(view, reducer(view, context, adapter));
  }
  return view;
}
