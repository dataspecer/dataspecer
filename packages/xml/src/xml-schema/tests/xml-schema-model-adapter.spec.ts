import { coreResourcesToConceptualModel } from "@dataspecer/core/conceptual-model";
import { CoreResource, ReadOnlyMemoryStore } from "@dataspecer/core/core";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataPsmSchemaXmlExtension } from "@dataspecer/core/data-psm/xml-extension/model";
import { DataSpecification, DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import { ArtefactGeneratorContext } from "@dataspecer/core/generator";
import { coreResourcesToStructuralModel } from "@dataspecer/core/structure-model";
import { iriElementName } from "../../conventions.ts";
import { getResource } from "../../xml/tests/resources/resource-provider.ts";
import { XmlSchemaGenerator } from "../xml-schema-generator.ts";
import { XmlSchemaComplexContentElement, xmlSchemaComplexContentIsElement, XmlSchemaComplexSequence, xmlSchemaComplexTypeDefinitionIsExtension, xmlSchemaComplexTypeDefinitionIsSequence, XmlSchemaSimpleType, xmlSchemaTypeIsComplex } from "../xml-schema-model.ts";

const testPrefix = "XSD generator: ";

type DataSpecifications = {[iri: string]: DataSpecification};
type CoreResources = {[iri: string]: CoreResource};

async function createObject(
  specifications: DataSpecifications, storeResources: CoreResources
) {
  const specification = Object.values(specifications)[0];

  const psmIri = specification.psms[0];

  const store = ReadOnlyMemoryStore.create(storeResources);

  const conceptualModel = await coreResourcesToConceptualModel(
    store,
    specification.pim
  );

  let structureModel = await coreResourcesToStructuralModel(
    store,
    psmIri
  );

  const artifact = specification.artefacts.find(
    a => DataSpecificationSchema.is(a) && a.psm === psmIri
  );

  const generator = new XmlSchemaGenerator();

  const context: ArtefactGeneratorContext = {
    specifications: specifications,
    conceptualModels: {[conceptualModel.pimIri]: conceptualModel},
    structureModels: {[structureModel.psmIri]: structureModel},
    reader: {
      readResource: async function(iri: string): Promise<CoreResource> {
        return storeResources[iri];
      },
      listResources: null,
      listResourcesOfType: null
    },
    createGenerator: null,
    findStructureClass: null
  };

  const result = await generator.generateToObject(context, artifact, specification);

  return {
    schema: result.xmlSchema,
    resource: storeResources[psmIri] as DataPsmSchema
  }
}

let object1: ReturnType<typeof createObject>;

async function getSchema1() {
  if (object1 == null) {
    const specifications = getResource("data_specifications.json");
    const store = getResource("merged_store.json");
    object1 = createObject(specifications, store);
  }
  return await object1;
}

function expectTrue(condition: boolean): asserts condition {
  expect(condition).toBeTruthy();
}

test.skip(testPrefix + "namespace declaration", async () => {
  const {schema, resource} = await getSchema1();
  const extension = DataPsmSchemaXmlExtension.getExtensionData(resource);
  expect(schema.targetNamespace).toBe(extension.namespace);
  expect(schema.targetNamespacePrefix).toBe(extension.namespacePrefix);
});

test.skip(testPrefix + "defines langString", async () => {
  const {schema} = await getSchema1();
  expectTrue(schema.defineLangString);
  //expectCondition(!schema.defineLangString).toBeTruthy();
});

test.skip(testPrefix + "root element exists", async () => {
  const {schema} = await getSchema1();
  expect(schema.elements.length).toBe(1);
  const element = schema.elements[0];
  expect(await element.name).toEqual([null, "tourist_destination"]);
  expect(element.type.name).toBe(null);
});

test.skip(testPrefix + "root has IRI element", async () => {
  const {schema} = await getSchema1();
  const type = schema.elements[0].type;
  expectTrue(xmlSchemaTypeIsComplex(type));
  const sequence = type.complexDefinition;
  expectTrue(xmlSchemaComplexTypeDefinitionIsSequence(sequence));
  const item = sequence.contents[0];
  expectTrue(xmlSchemaComplexContentIsElement(item));
  const element = item.element;

  expect(item.cardinalityMin).toBe(0);
  expect(item.cardinalityMax).toBe(1);
  expect(await element.name).toEqual(iriElementName);
  expect(element.type).toBe(null);
});

test.skip(testPrefix + "root has simple elements", async () => {
  const {schema} = await getSchema1();
  const type = schema.elements[0].type;
  expectTrue(xmlSchemaTypeIsComplex(type));
  const sequence = type.complexDefinition;
  expectTrue(xmlSchemaComplexTypeDefinitionIsSequence(sequence));
  const item = sequence.contents[2];
  expectTrue(xmlSchemaComplexContentIsElement(item));
  const element = item.element;

  expect(item.cardinalityMin).toBe(1);
  expect(item.cardinalityMax).toBe(1);
  expect(await element.name).toEqual([null, "public_accessibility"]);
  expect(element.type).toEqual({
    name: ["xs", "dateTimeStamp"],
    annotation: null,
    entityType: "type"
  } as XmlSchemaSimpleType);
  expect(element.annotation.modelReference).toBe("https://slovník.gov.cz/datový/turistické-cíle/pojem/veřejná-přístupnost");
});

test.skip(testPrefix + "root has abstract element", async () => {
  const {schema} = await getSchema1();
  const type = schema.elements[0].type;
  expectTrue(xmlSchemaTypeIsComplex(type));
  const sequence = type.complexDefinition;
  expectTrue(xmlSchemaComplexTypeDefinitionIsSequence(sequence));
  const item = sequence.contents[6];
  expectTrue(xmlSchemaComplexContentIsElement(item));
  const element = item.element;

  expect(await element.name).toEqual([null, "has_operator"]);
  const elementType = element.type;
  expectTrue(xmlSchemaTypeIsComplex(elementType));
  expectTrue(elementType.abstract);
  expect(elementType.complexDefinition).toEqual({
    xsType: "sequence",
    xsAny: false,
    contents: [
      {
        cardinalityMin: 0,
        cardinalityMax: 1,
        element: {
          "name": iriElementName,
          "annotation": null,
          "type": null
        }
      } as XmlSchemaComplexContentElement
    ]
  } as XmlSchemaComplexSequence);

  const derivingTypes = schema.types.filter(
    type =>
      xmlSchemaTypeIsComplex(type) &&
      xmlSchemaComplexTypeDefinitionIsExtension(type.complexDefinition) &&
      type.complexDefinition.base[1] === elementType.name[1]
  )

  expect(derivingTypes.length).toBe(5);
});

test.skip(testPrefix + "imports are present", async () => {
  const {schema} = await getSchema1();
  expect(schema.imports.length).toBe(2);
  const importDecl = schema.imports[0];
  expect(await importDecl.namespace).toBe(null);
  expect(importDecl.schemaLocation).toBe("../contact/schema.xsd");
});
