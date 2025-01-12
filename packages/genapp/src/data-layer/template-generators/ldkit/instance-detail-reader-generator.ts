import { InstanceResultReturnInterfaceGenerator } from "../../../capabilities/template-generators/capability-interface-generator";
import { LayerArtifact } from "../../../engine/layer-artifact";
import { TemplateConsumer } from "../../../engine/templates/template-consumer";
import { DetailReaderInterfaceGenerator } from "../reader-interface-generator";
import { ImportRelativePath, DataLayerTemplateDescription } from "../../../engine/templates/template-interfaces";
import { LdkitDalDependencyMap } from "../../strategies/ldkit-template-strategy";
import { ReadWriteEndpointUri } from "../../../engine/graph/datasource";

/**
 * Interface representing the template model for rendering an instance detail capability.
 *
 * @interface InstanceDetailLdkitReaderTemplate
 */
export interface InstanceDetailLdkitReaderTemplate extends DataLayerTemplateDescription {
    /** @inheritdoc */
    placeholders: {
        ldkit_instance_reader: string,
        exported_name_object: string;
        ldkit_instance_reader_path: ImportRelativePath,
        ldkit_schema: string,
        ldkit_schema_path: ImportRelativePath,
        aggregate_name: string,
        instance_result_type: string,
        instance_result_type_path: ImportRelativePath,
        ldkit_endpoint_uri: string
    };
}

/**
 * The `InstanceDetailLdkitReaderGenerator` class is responsible for generating the aggregate-specific implementation
 * part of the list capability using the LDkit library. This class provides specific logic for template population
 * and generation of dependencies needed for the data layer of the list capability of the generated application.
 *
 * @extends TemplateConsumer<InstanceDetailLdkitReaderTemplate>
 */
export class InstanceDetailLdkitReaderGenerator extends TemplateConsumer<InstanceDetailLdkitReaderTemplate> {

    private static readonly _instanceDetailLdkitDataLayerTemplatePath = "./detail/data-layer/ldkit/instance-detail-reader";

    constructor(outputFilePath: string) {
        super({
            filePath: outputFilePath,
            templatePath: InstanceDetailLdkitReaderGenerator._instanceDetailLdkitDataLayerTemplatePath
        });
    }

    private async getReaderInterfaceReturnTypeName(readerInterfaceArtifact: LayerArtifact): Promise<LayerArtifact> {
        if (!readerInterfaceArtifact.dependencies || readerInterfaceArtifact.dependencies.length === 0) {
            throw new Error("Reader interface expects at least one dependency artifact - return type of the read function.");
        }

        let instanceReturnTypeArtifact = readerInterfaceArtifact.dependencies.find(artifact => artifact.exportedObjectName === "InstanceResult");

        if (!instanceReturnTypeArtifact) {
            instanceReturnTypeArtifact = await InstanceResultReturnInterfaceGenerator.processTemplate();
        }

        return instanceReturnTypeArtifact;
    }

    /**
     * This method is responsible for the population and rendering of the template for the implementation of the detail capability.
     * When all dependencies needed by template (@see {InstanceDetailLdkitReaderTemplate} for more details) are populated,
     * the template renderer is invoked to generate the resulting code.
     *
     * @param dependencies - Dependencies providing the information about the aggregate and context for the template.
     * @returns A promise that resolves to a LayerArtifact instance containing the generated source code for the aggregate-specific detail capability.
     */
    async processTemplate(dependencies: LdkitDalDependencyMap): Promise<LayerArtifact> {

        const instanceReaderInterfaceArtifact = await DetailReaderInterfaceGenerator.processTemplate();
        const instanceReturnTypeArtifact = await this.getReaderInterfaceReturnTypeName(instanceReaderInterfaceArtifact);
        const detailExportedObject = dependencies.aggregate.getAggregateNamePascalCase({
            suffix: "LdkitInstanceReader"
        });

        const readSparqlEndpointUri = typeof dependencies.sparqlEndpointUri === "string"
            ? dependencies.sparqlEndpointUri
            : (dependencies.sparqlEndpointUri as ReadWriteEndpointUri).read;

        const instanceLdkitReaderTemplate: InstanceDetailLdkitReaderTemplate = {
            templatePath: this._templatePath,
            placeholders: {
                aggregate_name: dependencies.aggregate.getAggregateNamePascalCase(),
                exported_name_object: detailExportedObject,
                ldkit_schema: dependencies.ldkitSchemaArtifact.exportedObjectName,
                ldkit_endpoint_uri: `"${readSparqlEndpointUri}"`,
                ldkit_instance_reader: instanceReaderInterfaceArtifact.exportedObjectName,
                instance_result_type: instanceReturnTypeArtifact.exportedObjectName,
                instance_result_type_path: {
                    from: this._filePath,
                    to: instanceReturnTypeArtifact.filePath
                },
                ldkit_instance_reader_path: {
                    from: dependencies.pathResolver.getFullSavePath(this._filePath),
                    to: dependencies.pathResolver.getFullSavePath(
                        instanceReaderInterfaceArtifact.filePath,
                        instanceReaderInterfaceArtifact.exportedObjectName
                    )
                },
                ldkit_schema_path: {
                    from: this._filePath,
                    to: dependencies.ldkitSchemaArtifact.filePath
                }
            }
        }

        const ldkitInstanceDetailReader: string = this._templateRenderer.renderTemplate(instanceLdkitReaderTemplate);

        const readerInterfaceArtifact: LayerArtifact = {
            sourceText: ldkitInstanceDetailReader,
            exportedObjectName: detailExportedObject,
            filePath: this._filePath,
            dependencies: [instanceReaderInterfaceArtifact, dependencies.ldkitSchemaArtifact, dependencies.ldkitSchemaInterfaceArtifact]
        }

        return readerInterfaceArtifact;
    }
}