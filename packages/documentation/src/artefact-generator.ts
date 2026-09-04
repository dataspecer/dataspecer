import { DataSpecification, DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/generators/generator";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { getMustacheView } from "./mustache-view/views.ts";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { DocumentationGeneratorConfiguration, DocumentationGeneratorInputModel, generateDocumentation } from "./documentation-generator/index.ts";
import { DOCUMENTATION_MAIN_TEMPLATE_PARTIAL, internalDefaultDocumentationConfiguration } from "./configuration.ts";

/**
 * ArtefactGenerator implementation for template artifact generator.
 */
export class TemplateArtifactGenerator implements ArtefactGenerator {
    static readonly IDENTIFIER = "https://schemas.dataspecer.com/generator/template-artifact";
    identifier(): string {
        return TemplateArtifactGenerator.IDENTIFIER;
    }

    async generateToStream(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification,
        output: StreamDictionary
    ): Promise<void> {

        if (artefact["templateType"] !== "respec") {
            return;
        }

        // todo: I need to somehow obtain the original models..

        // @ts-ignore types
        const semanticModel = specification.semanticModel.rawModels as {
            model: {
              entities: Record<string, SemanticModelEntity>;
            },
            otherModels: {
              entities: Record<string, SemanticModelEntity>;
            }[];
          };

        const contextForDocumentation: DocumentationGeneratorInputModel = {
            label: {}, // todo
            models: [
                {
                    isPrimary: true,
                    baseIri: null,
                    entities: semanticModel.model.entities,
                    documentationUrl: "todo", // todo
                },
                ...semanticModel.otherModels.map((model) => ({
                    isPrimary: false,
                    baseIri: null,
                    entities: model.entities,
                    documentationUrl: "todo", // todo
                })),
            ],
            externalArtifacts: {},
            dsv: {},
            prefixMap: {},
        };

        // todo: Does not respect user configuration
        // todo: Does not include generator templates
        const configurationForDocumentation: DocumentationGeneratorConfiguration = {
            ...internalDefaultDocumentationConfiguration,
            language: "en",
            template: internalDefaultDocumentationConfiguration.partials[DOCUMENTATION_MAIN_TEMPLATE_PARTIAL]
        };

        const result = await generateDocumentation(
            contextForDocumentation,
            configurationForDocumentation,
            adapter => getMustacheView({
                context,
                artefact,
                specification,
            }, adapter)
        );

        const stream = output.writePath(artefact.outputPath);
        stream.write(result);
        await stream.close();
    }

    generateToObject(): Promise<never> {
        // Not applicable for this generator - can not even be called
        throw new Error("Method not implemented.");
    }

    async generateForDocumentation(): Promise<null> {
        // Not applicable for this generator => return null
        return null;
    }
}
