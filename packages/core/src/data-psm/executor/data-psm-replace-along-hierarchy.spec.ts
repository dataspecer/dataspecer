import {CoreResource, CoreResourceReader, ReadOnlyMemoryStore,} from "../../core/index.ts";
import {DataPsmReplaceAlongInheritance} from "../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import {DataPsmAssociationEnd, DataPsmClass, DataPsmSchema} from "../model/index.ts";
import {executeDataPsmReplaceAlongInheritance} from "./data-psm-replace-along-inheritance.ts";

describe("Replace class along its hierarchy.", () => {
  let resources: Record<string, CoreResource>;

  beforeEach(() => {
    resources = {
      "http://schema": {
        iri: "http://schema",
        types: [PSM.SCHEMA],
        dataPsmParts: ["http://class", "http://association_end/1", "http://class/1", "http://class/2"],
        dataPsmRoots: [],
      } as DataPsmSchema,
      "http://class": {
        iri: "http://class",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://association/0",
          "http://association/1",
          "http://association/2",
          "http://association/3",
        ],
      } as DataPsmClass,
      "http://association_end/1": {
        iri: "http://association_end/1",
        types: [PSM.ASSOCIATION_END],
        dataPsmPart: "http://class/1"
      } as DataPsmAssociationEnd,
      "http://class/1": {
        iri: "http://class/1",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://resource/1",
          "http://resource/2",
        ]
      } as DataPsmClass,
      "http://class/2": {
        iri: "http://class/2",
        types: [PSM.CLASS],
        dataPsmParts: []
      } as DataPsmClass,
    };
  });

  test("Simple replacement.", async () => {
    const operation = new DataPsmReplaceAlongInheritance();
    operation.dataPsmOriginalClass = "http://class/1";
    operation.dataPsmReplacingClass = "http://class/2";

    const actual = executeDataPsmReplaceAlongInheritance(
      wrapResourcesWithReader(resources),
      undefined,
      operation
    );

    expect(actual.failed).toBeFalsy();
    expect(actual.created).toEqual({});
    expect(actual.changed).toEqual({
      "http://class/1": {
        iri: "http://class/1",
        types: [PSM.CLASS],
        dataPsmParts: []
      } as DataPsmClass,
      "http://class/2": {
        iri: "http://class/2",
        types: [PSM.CLASS],
        dataPsmParts: [
          "http://resource/1",
          "http://resource/2",
        ]
      } as DataPsmClass,
      "http://association_end/1": {
        iri: "http://association_end/1",
        types: [PSM.ASSOCIATION_END],
        dataPsmPart: "http://class/2"
      } as DataPsmAssociationEnd,
    });
    expect(actual.deleted).toEqual([]);
  });
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
