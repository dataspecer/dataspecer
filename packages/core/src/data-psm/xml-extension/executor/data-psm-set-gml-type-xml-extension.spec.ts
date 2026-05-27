import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../../core/index.ts";
import * as PSM from "../../data-psm-vocabulary.ts";
import { DataPsmXmlPropertyExtension } from "../model/index.ts";
import { DataPsmSetGmlTypeXmlExtension } from "../operation/index.ts";
import { executeDataPsmSetGmlTypeXmlExtension } from "./data-psm-set-gml-type-xml-extension.ts";
import { XML_EXTENSION } from "../vocabulary.ts";
import { expect, test } from "vitest";

test("Update data PSM gml type.", async () => {
  const operation = new DataPsmSetGmlTypeXmlExtension();
  operation.dataPsmProperty = "http://property";
  operation.gmlType = "http://www.opengis.net/gml/3.2#EnvelopeType";

  const before = {
    "http://property": {
      iri: "http://property",
      types: [PSM.ATTRIBUTE],
    },
  };

  const actual = executeDataPsmSetGmlTypeXmlExtension(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://property": {
      iri: "http://property",
      types: [PSM.ATTRIBUTE],
      extensions: {
        [XML_EXTENSION]: {
          gmlType: "http://www.opengis.net/gml/3.2#EnvelopeType",
        }
      }
    } as DataPsmXmlPropertyExtension,
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}