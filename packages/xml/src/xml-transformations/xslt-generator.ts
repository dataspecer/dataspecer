import {
  DataSpecification,
  DataSpecificationArtefact,
  DataSpecificationSchema,
} from "@dataspecer/core/data-specification/model";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { XmlTransformation } from "./xslt-model.ts";
import { writeXsltLifting } from "./xslt-lifting-writer.ts";
import { writeXsltLowering } from "./xslt-lowering-writer.ts";
import { structureModelToXslt } from "./xslt-model-adapter.ts";
import { assertFailed, assertNot } from "@dataspecer/core/core";
import { defaultStructureTransformations, structureModelDematerialize, structureModelTransformCodelists, transformStructureModel } from "@dataspecer/core/structure-model/transformation";
import { XSLT_LIFTING, XSLT_LOWERING } from "./xslt-vocabulary.ts";
import { structureModelAddXmlProperties } from "../xml-structure-model/add-xml-properties.ts";

class XsltGenerator implements ArtefactGenerator {
  isLifting: boolean;

  constructor(isLifting: boolean) {
    this.isLifting = isLifting;
  }

  identifier(): string {
    return this.isLifting ? XSLT_LIFTING.Generator : XSLT_LOWERING.Generator;
  }

  async generateToStream(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    output: StreamDictionary
  ) {
    const model = await this.generateToObject(context, artefact, specification);
    const stream = output.writePath(artefact.outputPath);
    await (this.isLifting ? writeXsltLifting : writeXsltLowering)(model, stream);
    await stream.close();
  }

  async generateToObject(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification
  ): Promise<XmlTransformation> {
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

    const transformations = defaultStructureTransformations.filter(
      transformation =>
        transformation !== structureModelDematerialize
    );
    model = transformStructureModel(
      conceptualModel,
      model,
      Object.values(context.specifications),
      null,
      transformations
    );

    model = structureModelTransformCodelists(model);

    const xmlModel = await structureModelAddXmlProperties(
      model, context.reader
    );

    return await structureModelToXslt(
      context, specification, schemaArtefact, xmlModel
    );
  }

  async generateForDocumentation(
    context: ArtefactGeneratorContext,
    artefact: DataSpecificationArtefact,
    specification: DataSpecification,
    documentationIdentifier: string,
    callerContext: unknown
  ): Promise<unknown | null> {
    return null;
  }
}

export class XsltLiftingGenerator extends XsltGenerator {
  constructor() {
    super(true);
  }
}

export class XsltLoweringGenerator extends XsltGenerator {
  constructor() {
    super(false);
  }
}
