import {ArtefactGenerator, ArtefactGeneratorContext} from "@dataspecer/generators/generator";
import {DataSpecification, DataSpecificationArtefact,DataSpecificationSchema} from "@dataspecer/core/data-specification/model";
import {StreamDictionary} from "@dataspecer/core/io/stream/stream-dictionary.js";
import {assertFailed, assertNot} from "@dataspecer/core/core";
import {ShexAdapter} from "./shex-adapter.ts";
import {DataSpecificationConfigurator, DefaultDataSpecificationConfiguration, DataSpecificationConfiguration} from "@dataspecer/core/data-specification/configuration";
import {transformStructureModel, structureModelAddDefaultValues} from "@dataspecer/generators/structure-model/transformation";

interface ShexGeneratorObject {
  data: string;
}

export class ShexGenerator implements ArtefactGenerator {
  static readonly IDENTIFIER = "https://schemas.dataspecer.com/generator/shex";

  identifier(): string {
    return ShexGenerator.IDENTIFIER;
  }

  generateForDocumentation(): Promise<unknown | null> {
    return Promise.resolve(null); // Null means no documentation is necessary
    //throw new Error("Method not implemented.");
  }

  async generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification
  ): Promise<ShexGeneratorObject | null>{
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

    const globalConfiguration = DataSpecificationConfigurator.merge(
      DefaultDataSpecificationConfiguration,
      DataSpecificationConfigurator.getFromObject(schemaArtefact.configuration)
  ) as DataSpecificationConfiguration;

    model = Object.values(context.conceptualModels).reduce(
        (model, conceptualModel) => transformStructureModel(conceptualModel, model, Object.values(context.specifications)),
        model
    );

    model = structureModelAddDefaultValues(model, globalConfiguration);

    artefact.configuration["publicBaseUrl"] = globalConfiguration.publicBaseUrl;

    const adapter = new ShexAdapter(model, context, artefact);
    return adapter.generate();
  }

  async generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ): Promise<void> {
    if (!artefact.outputPath) {
      throw new Error("No output path specified.");
    }

    const model = await this.generateToObject(context, artefact, specification);
    const stream = output.writePath(artefact.outputPath);
    await stream.write(model.data);
    await stream.close();
  }
}
