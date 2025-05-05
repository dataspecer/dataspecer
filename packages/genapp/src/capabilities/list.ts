import { LIST_CAPABILITY_ID } from "./index.ts";
import { TemplateApplicationLayerGeneratorFactory } from "../app-logic-layer/generator-factory.ts";
import { ApplicationLayerStage } from "../app-logic-layer/pipeline-stage.ts";
import { ListTemplateDalGeneratorFactory } from "../data-layer/generator-factory.ts";
import { DataLayerGeneratorStage } from "../data-layer/pipeline-stage.ts";
import { GeneratorPipeline } from "../engine/generator-pipeline.ts";
import { PresentationLayerTemplateGeneratorFactory } from "../presentation-layer/generator-factory.ts";
import { PresentationLayerStage } from "../presentation-layer/pipeline-stage.ts";
import { AggregateCapabilityMetadata, BaseCapabilityGenerator } from "./capability-generator-interface.ts";
import { CapabilityConstructorInput } from "./constructor-input.ts";

export class ListCapabilityMetadata extends AggregateCapabilityMetadata {
    constructor(humanLabel: string | undefined) {
        super(humanLabel ?? "List");
    }

    static label: string = "list";
    getLabel = (): string => "list";
    getIdentifier = (): string => LIST_CAPABILITY_ID;
}

export class ListCapability extends BaseCapabilityGenerator {

    constructor(constructorInput: CapabilityConstructorInput) {
        super(constructorInput.structureModelMetadata, new ListCapabilityMetadata(constructorInput.capabilityLabel));

        const dalLayerGeneratorStrategy = ListTemplateDalGeneratorFactory.getDalGeneratorStrategy(
            constructorInput.structureModelMetadata.technicalLabel,
            constructorInput.structureModelMetadata.specificationIri,
            constructorInput.datasource
        );
        const appLayerGeneratorStrategy = TemplateApplicationLayerGeneratorFactory.getApplicationLayerGenerator(
            constructorInput.structureModelMetadata.technicalLabel,
            this.getIdentifier()
        );
        const presentationLayerGeneratorStrategy = PresentationLayerTemplateGeneratorFactory.getPresentationLayerGenerator(
            constructorInput.structureModelMetadata,
            this.getIdentifier()
        );

        this._capabilityStagesGeneratorPipeline = new GeneratorPipeline(
            new DataLayerGeneratorStage(dalLayerGeneratorStrategy),
            new ApplicationLayerStage(appLayerGeneratorStrategy),
            new PresentationLayerStage(this.getLabel(), presentationLayerGeneratorStrategy)
        );
    }
}
