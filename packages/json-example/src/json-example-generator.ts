import { DataSpecification, DataSpecificationArtefact, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGenerator, ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { MemoryStreamDictionary } from "@dataspecer/core/io/stream/memory-stream-dictionary.js";
import { StreamDictionary } from "@dataspecer/core/io/stream/stream-dictionary.js";
import { DefaultJsonConfiguration, JsonConfiguration, JsonConfigurator } from "@dataspecer/json/configuration";
import { JsonLdGenerator } from "@dataspecer/json/json-ld";
import { JSON_SCHEMA, JsonSchemaGenerator } from "@dataspecer/json/json-schema";
import { JsonExampleAdapter } from "./json-example-adapter.ts";

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

  async generateToObject(context: ArtefactGeneratorContext, artefact: DataSpecificationArtefact, specification: DataSpecification): Promise<JsonExampleGeneratorObject | null> {
    const schemaArtefact = artefact as DataSpecificationSchema;
    const jsonConfiguration = { ...DefaultJsonConfiguration };
    jsonConfiguration.dereferenceContext = true;
    const configuration = JsonConfigurator.merge(jsonConfiguration, JsonConfigurator.getFromObject(schemaArtefact.configuration)) as JsonConfiguration;

    const jsonGenerator = new JsonSchemaGenerator();

    const jsonSchema = new DataSpecificationSchema();
    jsonSchema.outputPath = `schema.json`;
    jsonSchema.generator = JSON_SCHEMA.Generator;
    jsonSchema.psm = schemaArtefact.psm;
    jsonSchema.configuration = {};

    const streamDictionary = new MemoryStreamDictionary();
    await jsonGenerator.generateToStream(context, artefact, specification, streamDictionary);
    const path = artefact.outputPath == null ? `schema.json` : artefact.outputPath;
    const schema = await streamDictionary.readPath(path).read();
    const s = schema == null ? "schema" : schema;
    const adapter = new JsonExampleAdapter(s, context, artefact);
    let data = await adapter.generateJsonData();
    if (configuration.includeContextInExample) {
      const jsonLdGenerator = new JsonLdGenerator();
      const streamDictionary = new MemoryStreamDictionary();
      const jsonSchema = new DataSpecificationSchema();
      jsonSchema.outputPath = `jsonld.json`;
      const jsonLdPath = artefact.outputPath == null ? `jsonld.json` : artefact.outputPath;
      await jsonLdGenerator.generateToStream(context, artefact, specification, streamDictionary);
      const jsonld = await streamDictionary.readPath(jsonLdPath).read();

      data = { "@context": JSON.parse(jsonld), ...data };
    }

    return {
      data: JSON.stringify(data, null, 2),
    }
  }

  async generateToStream(context: ArtefactGeneratorContext, artefact: DataSpecificationArtefact, specification: DataSpecification, output: StreamDictionary): Promise<void> {
    if (!artefact.outputPath) {
      throw new Error("No output path specified.");
    }

    const model = await this.generateToObject(context, artefact, specification);
    const m = model === null ? ({ data: "data" } as JsonExampleGeneratorObject) : model;
    const stream = output.writePath(artefact.outputPath);
    await stream.write(m.data.toString());
    await stream.close();
  }
}
