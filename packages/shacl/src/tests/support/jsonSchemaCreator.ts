import { structureModelToJsonSchema } from "../../../../json/src/json-schema/json-schema-model-adapter.ts";
import {OutputStream} from "@dataspecer/core/io/stream/output-stream";
import * as Support from "./testSupport.ts";
import {
    StructureModel,
    StructureModelClass,
    StructureModelType,
    StructureModelComplexType,
    StructureModelProperty,
    StructureModelPrimitiveType,
    StructureModelSchemaRoot,
  } from "@dataspecer/core/structure-model/model";
  import {
    assert,
    assertFailed,
    assertNot,
    CoreResource,
    defaultStringSelector,
    MemoryStore,
    ReadOnlyMemoryStore,
    StringSelector,
  } from "@dataspecer/core/core";
  import { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
  import { DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
  import { DataSpecification } from "@dataspecer/core/data-specification/model/data-specification";
  import { DefaultJsonConfiguration } from "../../../../json/src/configuration.ts";
  import { JsonConfiguration } from "../../../../json/src/configuration.ts";
  import {JSON_SCHEMA} from "../../../../json/src/json-schema/index.ts";
  import { ShaclAdapter } from "../../shacl-adapter.ts";
  import  ModelCreator  from "./SimpleObjectModelCreator.ts";
  import  ConceptualModelCreator  from "./conceptualModelCreator.ts";
  import {ArtefactGenerator, ArtefactGeneratorContext, StructureClassLocation} from "@dataspecer/core/generator";
import { JsonSchema } from "../../../../json/src/json-schema/json-schema-model.ts";
import { CoreResourceReader } from "@dataspecer/core/core/core-reader";
import { JsonLdGenerator } from "../../../../json/src/json-ld/json-ld-generator.ts";
import { JsonSchemaGenerator } from "../../../../json/src/json-schema/json-schema-generator.ts";
import {StreamDictionary} from "@dataspecer/core/io/stream/stream-dictionary";
import {MemoryStreamDictionary} from "@dataspecer/core/io/stream/memory-stream-dictionary";
import { MemoryOutputStream } from "@dataspecer/core/io/stream/memory-output-stream";
import { baseDataPsmExecutors } from "@dataspecer/core/data-psm/executor";
import { ConceptualModelClass } from "@dataspecer/core/conceptual-model";
import { writeJsonSchema } from "../../../../json/src/json-schema/json-schema-writer.ts";
import { pimExecutors } from "@dataspecer/core/pim/executor";
import * as PSM from "@dataspecer/core/data-psm/data-psm-vocabulary";

import * as path from 'path';


interface Context {
    /**
     * Active specification.
     */
    specification: DataSpecification;

    /**
     * All specifications.
     */
    specifications: { [iri: string]: DataSpecification };

    /**
     * String selector.
     */
    stringSelector: StringSelector;

    /**
     * Current structural model we are generating for.
     */
    model: StructureModel;

    artefact: DataSpecificationArtefact;

    configuration: JsonConfiguration;
  }

class JsonSchemaCreator{
    async createJsonSchema(smc : StructureModel ) : Promise<String> {
        const structureModelClass = new ModelCreator;
        const conceptualModelClass = new ConceptualModelCreator;
        const jsonconfig = DefaultJsonConfiguration;
        jsonconfig.dereferenceSchema = true;
        jsonconfig.jsonIdRequired
        const spec = new DataSpecification();
        spec.pim = "https://example.com/class1/mojePimIri";
        const jsonschemagen = new JsonSchemaGenerator();
        var artefact = new DataSpecificationSchema();
        artefact.psm = "https://example.com/class1/mojePimIri"
        artefact.outputPath = path.resolve("data-json-ld-generated.json");
        artefact.type = "schema";
        var customConfig = DefaultJsonConfiguration;
        artefact.configuration = customConfig;
        //console.log(artefact.outputPath);
        const output: StreamDictionary =  new MemoryStreamDictionary();

        let counter = 0;

        const readOnlyMemoryStore : CoreResourceReader = ReadOnlyMemoryStore.create({["https://example.com/class1/mojePimIri"] : {
          iri: "https://example.com/class1/mojePimIri",
          types: [PSM.SCHEMA]}});
        const coreResourceReader : CoreResourceReader = MemoryStore.create(
          "http://localhost",
          baseDataPsmExecutors,
          (type) => `http://localhost/${type}/${++counter}`
        );
        await readOnlyMemoryStore.listResources();
        console.log("coreResourceReader.listResources() " + (await readOnlyMemoryStore.listResourcesOfType(PSM.SCHEMA)).at(0));
        console.log("coreResourceReader.listResourcesOfType() " + (await readOnlyMemoryStore.listResources()).at(0));
        const context: ArtefactGeneratorContext = {
            specifications: { ["https://example.com/class1/mojePimIri"]: spec },
            conceptualModels: { ["https://example.com/class1/mojePimIri"]: conceptualModelClass.createModel()},
            structureModels: { ["https://example.com/class1/mojePimIri"]: smc },
            reader: readOnlyMemoryStore,
            createGenerator(iri: string): Promise<ArtefactGenerator | null> { return null as any;},
            findStructureClass(iri: string): StructureClassLocation | null {return null}
          };

        //const model = await jsonschemagen.generateToObject(context, artefact, spec);
        //const stream = output.writePath(artefact.outputPath);
        //assert((await output.exists(artefact.outputPath)).valueOf(), "dOESNT EXIST");

        const specification = new DataSpecification();
        specification.iri = "https://example.com/class1/mojePimIri";
        specification.pim = "https://example.com/class1/mojePimIri";
        const actual = structureModelToJsonSchema(
          { root: specification },
          specification,
          smc,
          DefaultJsonConfiguration,
          {} as DataSpecificationArtefact,
          defaultStringSelector
        );


      // PART FROM STEPAN START
      const msd = new MemoryStreamDictionary();
      const jsonSchema = new DataSpecificationSchema();
      const psmSchemaIri = "https://example.com/class1/mojePimIri";
      const basePath = ".";
      const baseUrl = "http://localhost"
      jsonSchema.iri = `${psmSchemaIri}#jsonschema`;
      jsonSchema.outputPath = `${basePath}/schema.json`;
      jsonSchema.publicUrl = `${baseUrl}/schema.json`;
      jsonSchema.generator = JSON_SCHEMA.Generator;
      jsonSchema.psm = psmSchemaIri;
      jsonSchema.configuration = DefaultJsonConfiguration;
      const jsonGenerator = new JsonSchemaGenerator();
      const jsonArtifact = specification.artefacts.find(artefact => artefact.generator === JSON_SCHEMA.Generator);
      if(jsonSchema != undefined){
        await jsonGenerator.generateToStream(context, jsonSchema, specification, msd);
        if(jsonSchema.outputPath != null){
          const data = await msd.readPath(jsonSchema.outputPath).read();
          console.log(data);
        }
      }
      console.log("Data specification is null " + specification );
      console.log("specArtefacts " + spec.artefacts.length);
      console.log("jsonArtifact is undefined " + (jsonArtifact == undefined));
      console.log("After segment meant made by Stepan");

      // PART FROM STEPAN END

//Snaha napsat generovani podle Stepanovy rady
      const memoryStream = new MemoryStreamDictionary();
      //jsonschemagen.generateToStream(context,artefact,specification,memoryStream);
      //await memoryStream.readPath().read();
      var listFromMS : string[];
      listFromMS = await memoryStream.list();
      //console.log("memoryStream.list() .... ");
      listFromMS.forEach(item => console.log(item  + " item "));

      //console.log("Model .... " + JSON.stringify(model, null, 2));
      //console.log("Actual .... " + JSON.stringify(actual, null, 2));
      //console.log(model);
      //console.log(actual);
      const stream = new MemoryOutputStream();
      // FOR SCHEMA OUTPUT TO STDOUT
        //await writeJsonSchema(actual, stream);
        //console.log(stream.getContent());
      // FOR JSONLD OUTPUT TO STDOUT
        //Support.syncWriteFile('../data/schema.json', JSON.stringify(model, null, 2));
        //await writeJsonLd(model, stream);
        await stream.close();
        const jsonSchemaGenerator = structureModelToJsonSchema({ ["https://example.com/class1/mojePimIri"]: spec }, spec, structureModelClass.createModel(), jsonconfig, new DataSpecificationArtefact());
        //return jsonSchemaGenerator;
        //return JSON.stringify(model, null, 2);
        return JSON.stringify("fileName", null, 2);
    }
}

async function writeJsonLd(
    schema: object,
    stream: OutputStream
  ): Promise<void> {
    await stream.write(JSON.stringify(schema, undefined, 2));
    await stream.close();
  }

export default JsonSchemaCreator;