import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetDatatype } from "../operation/index.ts";
import { executeDataPsmSetDatatype } from "./data-psm-set-datatype-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

test("Update data PSM attribute datatype.", async () => {
  const operation = new DataPsmSetDatatype();
  operation.dataPsmAttribute = "http://attribute";
  operation.dataPsmDatatype = "http://type";

  const before = {
    "http://attribute": {
      iri: "http://attribute",
      types: [PSM.ATTRIBUTE],
    },
  };

  const actual = executeDataPsmSetDatatype(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://attribute": {
      iri: "http://attribute",
      types: [PSM.ATTRIBUTE],
      dataPsmDatatype: operation.dataPsmDatatype,
    },
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
