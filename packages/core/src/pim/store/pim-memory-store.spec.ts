import * as Operations from "../operation/index.ts";
import { MemoryStore } from "../../core/index.ts";
import { pimExecutors } from "../executor/index.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Create PIM schema with class and attribute.", async () => {
  let counter = 0;
  const store = MemoryStore.create(
    "http://localhost",
    pimExecutors,
    (type) => `http://localhost/${type}/${++counter}`
  );

  const pimSchema = new Operations.PimCreateSchema();
  pimSchema.pimHumanLabel = { en: "Test schema." };
  const pimSchemaChange = store.applyOperation(pimSchema);
  expect(pimSchemaChange.operation.iri).toBeDefined();
  expect(pimSchemaChange.created).toEqual(["http://localhost/schema/1"]);
  expect(pimSchemaChange.changed).toEqual([]);
  expect(pimSchemaChange.deleted).toEqual([]);

  const pimClass = new Operations.PimCreateClass();
  pimClass.pimInterpretation = "http://localhost/cim/TheClass";
  const pimClassChange = store.applyOperation(pimClass);
  expect(pimClassChange.operation.iri).toBeDefined();
  expect(pimClassChange.created).toEqual(["http://localhost/class/3"]);
  expect(pimClassChange.changed.sort()).toEqual(
    ["http://localhost/schema/1"].sort()
  );
  expect(pimSchemaChange.deleted).toEqual([]);

  const pimAttribute = new Operations.PimCreateAttribute();
  pimAttribute.pimDatatype = "xsd:string";
  pimAttribute.pimInterpretation = "http://localhost/cim/TheProperty";
  pimAttribute.pimOwnerClass = "http://localhost/class/3";
  const pimAttributeChange = store.applyOperation(pimAttribute);
  expect(pimAttributeChange.operation.iri).toBeDefined();
  expect(pimAttributeChange.created).toEqual(["http://localhost/attribute/5"]);
  expect(pimAttributeChange.changed.sort()).toEqual(
    ["http://localhost/schema/1"].sort()
  );
  expect(pimSchemaChange.deleted).toEqual([]);

  //

  expect(store.listResources().sort()).toEqual(
    [
      "http://localhost/schema/1",
      "http://localhost/class/3",
      "http://localhost/attribute/5",
    ].sort()
  );

  expect(store.readResource("http://localhost/schema/1")).toMatchObject({
    iri: "http://localhost/schema/1",
    types: [PIM.SCHEMA],
    pimHumanLabel: pimSchema.pimHumanLabel,
    pimHumanDescription: pimSchema.pimHumanDescription,
    pimParts: ["http://localhost/class/3", "http://localhost/attribute/5"],
  });

  expect(store.readResource("http://localhost/class/3")).toMatchObject({
    iri: "http://localhost/class/3",
    types: [PIM.CLASS],
    pimInterpretation: pimClass.pimInterpretation,
    pimTechnicalLabel: pimClass.pimTechnicalLabel,
    pimHumanLabel: pimClass.pimHumanLabel,
    pimHumanDescription: pimClass.pimHumanDescription,
    pimExtends: pimClass.pimExtends,
    pimCodelistUrl: [],
    pimIsCodelist: false,
  });

  expect(store.readResource("http://localhost/attribute/5")).toMatchObject({
    iri: "http://localhost/attribute/5",
    types: [PIM.ATTRIBUTE],
    pimInterpretation: pimAttribute.pimInterpretation,
    pimTechnicalLabel: pimAttribute.pimTechnicalLabel,
    pimHumanLabel: pimAttribute.pimHumanLabel,
    pimHumanDescription: pimAttribute.pimHumanDescription,
    pimOwnerClass: pimAttribute.pimOwnerClass,
    pimDatatype: pimAttribute.pimDatatype,
    pimCardinalityMax: null,
    pimCardinalityMin: null,
  });
});

test("Create and delete PIM class", async () => {
  let counter = 0;
  const store = MemoryStore.create(
    "http://localhost",
    pimExecutors,
    (type) => `http://localhost/${type}/${++counter}`
  );

  const pimSchema = new Operations.PimCreateSchema();
  const pimSchemaChange = store.applyOperation(pimSchema);
  expect(pimSchemaChange.operation.iri).toBeDefined();
  expect(pimSchemaChange.created).toEqual(["http://localhost/schema/1"]);
  expect(pimSchemaChange.changed).toEqual([]);
  expect(pimSchemaChange.deleted).toEqual([]);

  const pimCreate = new Operations.PimCreateClass();
  const pimCreateChange = store.applyOperation(pimCreate);
  expect(pimCreateChange.operation.iri).toBeDefined();
  expect(pimCreateChange.created).toEqual(["http://localhost/class/3"]);
  expect(pimCreateChange.changed.sort()).toEqual(
    ["http://localhost/schema/1"].sort()
  );
  expect(pimSchemaChange.deleted).toEqual([]);

  const pimDelete = new Operations.PimDeleteClass();
  pimDelete.pimClass = "http://localhost/class/3";
  const pimDeleteChange = store.applyOperation(pimDelete);
  expect(pimDeleteChange.operation.iri).toBeDefined();
  expect(pimDeleteChange.changed).toEqual(["http://localhost/schema/1"]);
  expect(pimDeleteChange.deleted).toEqual(["http://localhost/class/3"]);

  expect(store.listResources().sort()).toEqual(
    ["http://localhost/schema/1"].sort()
  );
});
