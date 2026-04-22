import { PimCreateSchema, PimCreateSchemaResult } from "../operation/index.ts";
import { executePimCreateSchema } from "./pim-create-schema-executor.ts";
import { MemoryStore } from "../../core/index.ts";
import { baseDataPsmExecutors } from "../../data-psm/executor/index.ts";
import * as PIM from "../pim-vocabulary.ts";

test("Create schema.", async () => {
  const operation = new PimCreateSchema();
  operation.pimHumanLabel = { en: "Label" };
  operation.pimHumanDescription = { en: "Desc" };

  let counter = 0;
  const store = MemoryStore.create(
    "http://localhost",
    baseDataPsmExecutors,
    (type) => `http://localhost/${type}/${++counter}`
  );

  const actual = executePimCreateSchema(
    store,
    (type) => `http://localhost/${type}/${++counter}`,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    "http://localhost/schema/1": {
      iri: "http://localhost/schema/1",
      types: [PIM.SCHEMA],
      pimHumanLabel: operation.pimHumanLabel,
      pimHumanDescription: operation.pimHumanDescription,
      pimParts: [],
    },
  });
  expect(actual.changed).toEqual({});
  expect(actual.deleted).toEqual([]);
  expect(PimCreateSchemaResult.is(actual.operationResult)).toBeTruthy();
  const result = actual.operationResult as PimCreateSchemaResult;
  expect(result.createdPimSchema).toBe("http://localhost/schema/1");
});

test("Create schema with given IRI.", async () => {
  const operation = new PimCreateSchema();
  operation.pimHumanLabel = { en: "Label" };
  operation.pimHumanDescription = { en: "Desc" };
  operation.pimNewIri = "urn";

  let counter = 0;
  const store = MemoryStore.create(
    "http://localhost",
    baseDataPsmExecutors,
    (type) => `http://localhost/${type}/${++counter}`
  );

  const actual = executePimCreateSchema(
    store,
    (type) => `http://localhost/${type}/${++counter}`,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({
    [operation.pimNewIri]: {
      iri: operation.pimNewIri,
      types: [PIM.SCHEMA],
      pimHumanLabel: operation.pimHumanLabel,
      pimHumanDescription: operation.pimHumanDescription,
      pimParts: [],
    },
  });
  expect(actual.changed).toEqual({});
  expect(actual.deleted).toEqual([]);
  expect(PimCreateSchemaResult.is(actual.operationResult)).toBeTruthy();
  const result = actual.operationResult as PimCreateSchemaResult;
  expect(result.createdPimSchema).toEqual(operation.pimNewIri);
});
