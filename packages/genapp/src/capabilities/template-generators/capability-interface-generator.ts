import { TemplateModel } from "../../engine/templates/template-interfaces";
import { LayerArtifact } from "../../engine/layer-artifact";
import { TemplateConsumer, TemplateMetadata } from "../../engine/templates/template-consumer";

export interface CapabilityInterfaceTemplate extends TemplateModel {
    templatePath: string
}

class CapabilityInterfaceGenerator extends TemplateConsumer<CapabilityInterfaceTemplate> {

    private readonly _capabilityInterfaceExportedName: string;
    constructor(templateMetadata: TemplateMetadata & { queryExportedObjectName: string }) {
        super({
            templatePath: templateMetadata.templatePath,
            filePath: templateMetadata.filePath
        });

        this._capabilityInterfaceExportedName = templateMetadata.queryExportedObjectName;
    }

    async processTemplate(): Promise<LayerArtifact> {

        const capabilityInterfaceTemplate: CapabilityInterfaceTemplate = {
            templatePath: this._templatePath
        };

        const render = this._templateRenderer.renderTemplate(capabilityInterfaceTemplate);
        const capabilityInterfaceResult: LayerArtifact = {
            exportedObjectName: this._capabilityInterfaceExportedName,
            filePath: this._filePath,
            sourceText: render
        }

        return capabilityInterfaceResult;
    }
}

export type CapabilityInterfaceGeneratorType = CapabilityInterfaceGenerator;

export const CopyTemplateProcessor = CapabilityInterfaceGenerator;

export const ListResultReturnInterfaceGenerator = new CapabilityInterfaceGenerator({
    filePath: "../interfaces/capability-result.ts",
    templatePath: "./capability-result-interface",
    queryExportedObjectName: "ListResult"
});

export const InstanceResultReturnInterfaceGenerator = new CapabilityInterfaceGenerator({
    filePath: "../interfaces/capability-result.ts",
    templatePath: "./capability-result-interface",
    queryExportedObjectName: "InstanceResult"
});

export const GeneratedCapabilityInterfaceGenerator = new CapabilityInterfaceGenerator({
    filePath: "../interfaces/capability-result.ts",
    templatePath: "./capability-result-interface",
    queryExportedObjectName: "GeneratedCapability"
});

export const UseNavigationHookGenerator = new CopyTemplateProcessor({
    templatePath: "./hooks/use-navigation",
    filePath: "../hooks/useGenappNavigation.ts",
    queryExportedObjectName: "useGenappNavigation"
});

export const LdkitWriterQueryEngineGenerator = new CopyTemplateProcessor({
    templatePath: "./common/data-layer/ldkit/writer-query-engine",
    filePath: "./writers/ldkit/writer-query-engine.ts",
    queryExportedObjectName: "LdkitWriterQueryEngine"
});
