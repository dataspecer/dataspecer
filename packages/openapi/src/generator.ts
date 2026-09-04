import {
    DataSpecification,
    DataSpecificationArtefact,
    DataSpecificationSchema,
} from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/generators/generator";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary";
import { StructureModel } from "@dataspecer/generators/structure-model/model/structure-model";
import { transformStructureModel } from "@dataspecer/generators/structure-model/transformation/default-transformation";
import { OpenAPIV3 } from "openapi-types";

export class OpenapiGenerator implements ArtefactGenerator {
    static readonly IDENTIFIER = "https://schemas.dataspecer.com/generator/openapi";

    identifier(): string {
        return OpenapiGenerator.IDENTIFIER;
    }

    generateForDocumentation(): Promise<unknown | null> {
        return Promise.resolve(null);
    }

    async generateToObject(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification
    ): Promise<never> {
        throw new Error("Method not implemented.");
    }

    async generateToStream(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification,
        output: StreamDictionary
    ): Promise<void> {
        const conceptualModel = context.conceptualModels[specification.pim!]!;
        const schemaArtefact = artefact as DataSpecificationSchema;
        let structureModel = context.structureModels[schemaArtefact.psm!]!;

        // Transformations help us to add additional information to the structure model from the conceptual model
        // and simplify the structure model for the generator.
        structureModel = transformStructureModel(conceptualModel, structureModel);
        // Create the output stream for the artefact
        const stream = output.writePath(artefact.outputPath!);

        // await stream.write(`openapi: 3.0.0\n`);
        // await stream.write(`components:\n`);
        // await stream.write(`  schemas:\n`);

        // const root = structureModel.roots[0]; // There is support for schemas with multiple roots, but we don't use it, so just use roots[0] every time

        // const technicalLabel = root?.classes[0]?.technicalLabel; // classes is an array, because it is considered as OR between multiple classes. You can ignore it for now and just use classes[0]
        // const properties = root?.classes[0]?.properties; // Use IntelliSense to see what properties are available on the class (or ctrl+click, or console.log it)
        // await stream.write(`    ${technicalLabel}:\n`);
        // await stream.write(`      # This class has ${properties?.length} properties\n`);

        // await stream.close();


        const openApiSpec = generateCompleteOpenApiSpec(structureModel);

        // Write OpenAPI specification to the stream
        await stream.write(JSON.stringify(openApiSpec, null, 2));

        await stream.close();
    }
}

export const generateCompleteOpenApiSpec = (structureModel: StructureModel): any => {
    const openApiSpec: any = {
        openapi: '3.0.0', // Default version
        info: {
            title: "Your API Title",
            version: "1.0.0",
            description: "Your API Description",
        },
        paths: {}, // Add your paths here based on structureModel
        components: {
            schemas: {}, // Add your schemas here based on structureModel
        },
    };

    // Your logic to populate the OpenAPI spec based on the structureModel
    // You'll need to iterate through the structureModel and add relevant information to openApiSpec

    // Iterate over roots and classes to build paths and schemas
    structureModel.roots.forEach((root) => {
        root.classes.forEach((cls) => {
            const pathParameters = cls.properties.map((property) => ({
                name: property.technicalLabel,
                in: 'path',
                description: property.humanDescription?.en,
                required: property.cardinalityMin ?? 0 > 0,
                schema: {
                    type: 'string',
                },
            }));

            const pathObject = {
                parameters: pathParameters,
                get: {
                    summary: cls.humanDescription?.en,
                    description: cls.humanDescription?.en,
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    example: {
                                        // Example data for the response
                                        //[cls.technicalLabel?]: {},
                                    },
                                },
                            },
                        },
                    },
                },
            };

            openApiSpec.paths[`/${cls.technicalLabel}`] = pathObject;

            const propertiesObject: Record<string, Record<string, unknown>> = {};
            cls.properties.forEach((property) => {
                propertiesObject[property.technicalLabel!] = {
                    description: property.humanDescription?.en,
                    type: 'string',
                };
            });

            openApiSpec.components.schemas[cls.technicalLabel!] = {
                type: 'object',
                properties: propertiesObject,
            };
        });
    });

    return openApiSpec;
};
