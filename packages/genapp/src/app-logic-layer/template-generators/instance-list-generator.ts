import { LayerArtifact } from "../../engine/layer-artifact.ts";
import { ListReaderInterfaceGenerator } from "../../data-layer/template-generators/reader-interface-generator.ts";
import { GeneratedCapabilityInterfaceGenerator, ListResultReturnInterfaceGenerator } from "../../capabilities/template-generators/capability-interface-generator.ts";
import { TemplateMetadata } from "../../engine/templates/template-consumer.ts";
import { ApplicationLayerTemplateDependencyMap, ApplicationLayerTemplateGenerator } from "./template-app-layer-generator.ts";
import { ImportRelativePath, TemplateModel } from "../../engine/templates/template-interfaces.ts";

interface ListCapabilityAppLayerTemplate extends TemplateModel {
    templatePath: string,
    placeholders: {
        list_reader_interface: string,
        list_reader_interface_path: ImportRelativePath,
        reader_implementation_path: ImportRelativePath,
        generated_capability_class: string,
        read_return_type: string,
        list_app_layer_export_name: string,
        read_return_type_path: ImportRelativePath
    }
}

export class ListAppLayerTemplateProcessor extends ApplicationLayerTemplateGenerator<ListCapabilityAppLayerTemplate> {

    strategyIdentifier: string = "list-app-template-generator";

    private static readonly _listAppLayerTemplatePath: string = "./list/application-layer/list-app-logic";

    constructor(outputFilePath: string) {
        super({
            filePath: outputFilePath,
            templatePath: ListAppLayerTemplateProcessor._listAppLayerTemplatePath
        });

    }

    async processTemplate(dependencies: ApplicationLayerTemplateDependencyMap): Promise<LayerArtifact> {

        const readerInterfaceArtifact = await ListReaderInterfaceGenerator.processTemplate();
        const listAppLayerExportName = dependencies.aggregate.getAggregateNamePascalCase({
            suffix: "ListCapabilityLogic"
        });

        if (!readerInterfaceArtifact.dependencies || readerInterfaceArtifact.dependencies.length === 0) {
            throw new Error("Reader interface expects at least one dependency artifact - return type of the read function.");
        }

        let listReturnTypeArtifact = readerInterfaceArtifact.dependencies.find(artifact => artifact.exportedObjectName === "ListResult");

        if (!listReturnTypeArtifact) {
            listReturnTypeArtifact = await ListResultReturnInterfaceGenerator.processTemplate();
        }

        const generatedCapabilityInterface = await GeneratedCapabilityInterfaceGenerator.processTemplate();

        const listApplicationTemplate: ListCapabilityAppLayerTemplate = {
            templatePath: this._templatePath,
            placeholders: {
                list_app_layer_export_name: listAppLayerExportName,
                list_reader_interface: readerInterfaceArtifact.exportedObjectName,
                read_return_type: listReturnTypeArtifact.exportedObjectName,
                read_return_type_path: {
                    from: this._filePath,
                    to: listReturnTypeArtifact.filePath
                },
                generated_capability_class: generatedCapabilityInterface.exportedObjectName,
                reader_implementation_path: {
                    from: dependencies.pathResolver.getFullSavePath(this._filePath),
                    to: dependencies.dataLayerLinkArtifact.filePath
                },
                list_reader_interface_path: {
                    from: dependencies.pathResolver.getFullSavePath(this._filePath),
                    to: dependencies.pathResolver.getFullSavePath(
                        readerInterfaceArtifact.filePath,
                        readerInterfaceArtifact.exportedObjectName
                    )
                }
            }
        }

        const listAppLogicRender = this._templateRenderer.renderTemplate(listApplicationTemplate);

        const listAppLogicLayerArtifact: LayerArtifact = {
            exportedObjectName: listAppLayerExportName,
            filePath: this._filePath,
            sourceText: listAppLogicRender,
            dependencies: [readerInterfaceArtifact, listReturnTypeArtifact]
        }

        return listAppLogicLayerArtifact;
    }
}