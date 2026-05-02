import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../core/index.ts";
import { DataPsmSetOrder } from "../operation/index.ts";
import { executeDataPsmSetOrder } from "./data-psm-set-order-executor.ts";
import * as PSM from "../data-psm-vocabulary.ts";

describe("Change order in data PSM class.", () => {
  let resources: Record<string, CoreResource>;

  beforeEach(() => {
    resources = {
      "http://schema": {
        iri: "http://schema",
        types: [PSM.SCHEMA],
        dataPsmParts: ["http://class"],
      } as CoreResource,
      "http://class": {
        iri: "http://class",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://attribute/0",
          "http://attribute/1",
          "http://attribute/2",
          "http://attribute/3",
        ],
      } as CoreResource,
      "http://attribute/1": {
        iri: "http://attribute/1",
        types: [PSM.ATTRIBUTE],
      },
      "http://attribute/2": {
        iri: "http://attribute/2",
        types: [PSM.ATTRIBUTE],
      },
    };
  });

  test("Move inside a list.", async () => {
    const operation = new DataPsmSetOrder();
    operation.dataPsmOwnerClass = "http://class";
    operation.dataPsmResourceToMove = "http://attribute/1";
    operation.dataPsmMoveAfter = "http://attribute/2";

    const actual = executeDataPsmSetOrder(
      wrapResourcesWithReader(resources),
      undefined,
      operation
    );

    expect(actual.failed).toBeFalsy();
    expect(actual.created).toEqual({});
    expect(actual.changed).toEqual({
      "http://class": {
        iri: "http://class",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://attribute/0",
          "http://attribute/2",
          "http://attribute/1",
          "http://attribute/3",
        ],
      },
    });
    expect(actual.deleted).toEqual([]);
  });

  test("Move to the first position.", async () => {
    const operation = new DataPsmSetOrder();
    operation.dataPsmOwnerClass = "http://class";
    operation.dataPsmResourceToMove = "http://attribute/1";
    operation.dataPsmMoveAfter = null;

    const actual = executeDataPsmSetOrder(
      wrapResourcesWithReader(resources),
      undefined,
      operation
    );

    expect(actual.failed).toBeFalsy();
    expect(actual.created).toEqual({});
    expect(actual.changed).toEqual({
      "http://class": {
        iri: "http://class",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://attribute/1",
          "http://attribute/0",
          "http://attribute/2",
          "http://attribute/3",
        ],
      },
    });
    expect(actual.deleted).toEqual([]);
  });
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
