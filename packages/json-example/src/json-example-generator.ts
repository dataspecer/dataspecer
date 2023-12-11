import {
  DataSpecification,
  DataSpecificationArtefact,
  DataSpecificationSchema,
} from "@dataspecer/core/data-specification/model/index.js";
import {StreamDictionary} from "@dataspecer/core/io/stream/stream-dictionary.js";
import {ArtefactGenerator, ArtefactGeneratorContext} from "@dataspecer/core/generator";
import {assertFailed, assertNot} from "@dataspecer/core/core";
import {transformStructureModel, structureModelAddDefaultValues} from "@dataspecer/core/structure-model/transformation";
import {JsonExampleAdapter} from "./json-example-adapter.js";
import {JSON_SCHEMA, JsonSchemaGenerator} from "@dataspecer/json/json-schema";
import {MemoryStreamDictionary} from "@dataspecer/core/io/stream/memory-stream-dictionary.js";


interface JsonExampleGeneratorObject {
    data: String;
  }

export class JsonExampleGenerator implements ArtefactGenerator {
    static readonly IDENTIFIER = "https://schemas.dataspecer.com/generator/json-example";

    identifier(): string {
        return JsonExampleGenerator.IDENTIFIER;
    }

    generateForDocumentation(): Promise<unknown | null> {
        return Promise.resolve(null);
    }

    async generateToObject(
        context: ArtefactGeneratorContext,
        artefact: DataSpecificationArtefact,
        specification: DataSpecification
      ): Promise<JsonExampleGeneratorObject | null> {
        const jsonGenerator = new JsonSchemaGenerator();

        const jsonSchema = new DataSpecificationSchema();
        jsonSchema.outputPath = `schema.json`;
        const artoutpath = (artefact.outputPath == null) ? `schema.json` : artefact.outputPath;
        jsonSchema.generator = JSON_SCHEMA.Generator;
        jsonSchema.psm = (artefact as DataSpecificationSchema).psm;
        jsonSchema.configuration = {};
    
        const streamDictionary = new MemoryStreamDictionary();
        await jsonGenerator.generateToStream(context, artefact, specification, streamDictionary);
        const schema = await streamDictionary.readPath(artoutpath).read();
        const s = (schema == null) ? "schema" : schema;
        const adapter = new JsonExampleAdapter(s, context, artefact);
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
            const m = (model === null) ? {data: "data"} as JsonExampleGeneratorObject  : model ;
            const stream = output.writePath(artefact.outputPath);
            await stream.write(m.data.toString());
            await stream.close();
    }
}