import { assertFailed, assertNot } from "@dataspecer/core/core";
import { DataSpecificationConfiguration, DataSpecificationConfigurator, DefaultDataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { DataSpecification, DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { structureModelAddDefaultValues, transformStructureModel } from "@dataspecer/core/structure-model/transformation";
import { getAggregatedSemanticModel } from "../semantic-model.ts";
import { JsonLdAdapter } from "./json-ld-adapter.ts";
import { writeJsonLd } from "./json-ld-writer.ts";

export const JSON_LD_GENERATOR = "http://dataspecer.com/generator/json-ld"

export class JsonLdGenerator implements ArtefactGenerator {
  identifier(): string {
    return JSON_LD_GENERATOR;
  }

  async generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ) {
    const model = await this.generateToObject(context, artefact, specification);
    const stream = output.writePath(artefact.outputPath);
    await writeJsonLd(model, stream);
    await stream.close();
  }

  async generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification
  ): Promise<object> {
    if (!DataSpecificationSchema.is(artefact)) {
      assertFailed("Invalid artefact type.");
    }
    const schemaArtefact = artefact as DataSpecificationSchema;
    const conceptualModel = context.conceptualModels[specification.pim];
    assertNot(
      conceptualModel === undefined,
      `Missing conceptual model ${specification.pim}.`
    );
    let model = context.structureModels[schemaArtefact.psm];
    assertNot(
      model === undefined,
      `Missing structure model ${schemaArtefact.psm}.`
    );
    // model = transformStructureModel(
    //   conceptualModel,
    //   model,
    //   Object.values(context.specifications)
    // );
    // Global options for the data specification
    const globalConfiguration = DataSpecificationConfigurator.merge(
        DefaultDataSpecificationConfiguration,
        DataSpecificationConfigurator.getFromObject(schemaArtefact.configuration)
    ) as DataSpecificationConfiguration;

    const mergedConceptualModel = {...conceptualModel};
    mergedConceptualModel.classes = Object.fromEntries(Object.values(context.conceptualModels).map(cm => Object.entries(cm.classes)).flat());
    model = transformStructureModel(mergedConceptualModel, model, Object.values(context.specifications));
    model = structureModelAddDefaultValues(model, globalConfiguration);

    // Semantic model from aggregators
    const semanticModel = getAggregatedSemanticModel(specification);

    const adapter = new JsonLdAdapter(model, context, artefact, semanticModel);
    return adapter.generate();
  }

  async generateForDocumentation() {
    // todo not implemented
    return null;
  }
}
