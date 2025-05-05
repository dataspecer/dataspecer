// TODO: merge / reduce imports
import { LayerArtifact } from "../../engine/layer-artifact.ts";
import { PresentationLayerDependencyMap, PresentationLayerTemplateGenerator } from "./presentation-layer-template-generator.ts";
import { ListItemCapabilityOptionsDependencyMap, ListItemCapabilityOptionsGenerator as ListItemOptionsGenerator } from "./list-item-options-processor.ts";
import { ImportRelativePath, TemplateModel } from "../../engine/templates/template-interfaces.ts";
import { JsonSchemaProvider } from "../../data-layer/schema-providers/json-schema-provider.ts";
import { CapabilityType } from "../../capabilities/index.ts";
import { UseNavigationHookGenerator } from "../../capabilities/template-generators/capability-interface-generator.ts";

interface ListTableTemplate extends TemplateModel {
    placeholders: {
        aggregate_name: string;
        page_title: string | null;
        presentation_layer_component_name: string;
        list_capability_app_layer: string;
        list_app_layer_path: ImportRelativePath;
        instance_capability_options: string | null;
        instance_capability_options_path: ImportRelativePath | null;
        table_schema: object;
        list_collection_transitions: any[];
        navigation_hook: string;
        navigation_hook_path: ImportRelativePath;
    };
}

export class ListTableTemplateProcessor extends PresentationLayerTemplateGenerator<ListTableTemplate> {

    strategyIdentifier: string = "list-table-react-generator";

    private static readonly _listComponentTemplatePath: string = "./list/presentation-layer/table-component";

    constructor(outputFilePath: string) {
        super({
            filePath: outputFilePath,
            templatePath: ListTableTemplateProcessor._listComponentTemplatePath
        })
    }

    async processTemplate(dependencies: PresentationLayerDependencyMap): Promise<LayerArtifact> {

        const groupedTransitions = dependencies.transitions.groupByCapabilityType();
        const collectionTransitions = groupedTransitions[CapabilityType.Collection.toString()]!;
        const instanceTransitions = groupedTransitions[CapabilityType.Instance.toString()]!;
        const hasAnyInstanceTransitions = instanceTransitions.length > 0;

        const listItemOptionsArtifact = await new ListItemOptionsGenerator({
            filePath: `./${dependencies.aggregate.getAggregateNamePascalCase({ "suffix": "ListItemOptions" })}.tsx`,
            templatePath: "./list/presentation-layer/item-capability-options"
        }).processTemplate({
            aggregate: dependencies.aggregate,
            transitions: instanceTransitions
        } as ListItemCapabilityOptionsDependencyMap);

        const useNavigationHook = await UseNavigationHookGenerator.processTemplate();

        const listTableComponentName: string = dependencies.aggregate.getAggregateNamePascalCase({ suffix: "ListTable" });

        const jsonSchema = (await new JsonSchemaProvider(dependencies.aggregate.specificationIri)
            .getSchemaArtifact(dependencies.aggregate))
            .sourceText;

        const tableTemplate: ListTableTemplate = {
            templatePath: this._templatePath,
            placeholders: {
                aggregate_name: dependencies.aggregate.getAggregateNamePascalCase(),
                page_title: this.getTemplatePageTitle(dependencies.detailNodeConfig.pageTitle),
                presentation_layer_component_name: listTableComponentName,
                list_capability_app_layer: dependencies.appLogicArtifact.exportedObjectName,
                list_app_layer_path: {
                    from: dependencies.pathResolver.getFullSavePath(this._filePath),
                    to: dependencies.appLogicArtifact.filePath
                },
                table_schema: JSON.parse(jsonSchema),
                list_collection_transitions: collectionTransitions,
                instance_capability_options: hasAnyInstanceTransitions
                    ? listItemOptionsArtifact.exportedObjectName
                    : null,
                instance_capability_options_path: hasAnyInstanceTransitions
                    ? {
                        from: this._filePath,
                        to: listItemOptionsArtifact.filePath
                    }
                    : null,
                navigation_hook: useNavigationHook.exportedObjectName,
                navigation_hook_path: {
                    from: this._filePath,
                    to: useNavigationHook.filePath
                },
            }
        };

        const presentationLayerRender = this._templateRenderer.renderTemplate(tableTemplate);
        const dependentArtifacts = [dependencies.appLogicArtifact, useNavigationHook];

        if (hasAnyInstanceTransitions) {
            dependentArtifacts.push(listItemOptionsArtifact);
        }

        return {
            exportedObjectName: listTableComponentName,
            filePath: this._filePath,
            sourceText: presentationLayerRender,
            dependencies: dependentArtifacts
        };
    }
}