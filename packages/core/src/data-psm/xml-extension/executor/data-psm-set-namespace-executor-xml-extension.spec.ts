import {
  CoreResource,
  CoreResourceReader,
  ReadOnlyMemoryStore,
} from "../../../core/index.ts";
import { DataPsmSetNamespaceXmlExtension } from "../operation/index.ts";
import { executeDataPsmSetNamespaceXmlExtension } from "./data-psm-set-namespace-executor-xml-extension.ts";
import * as PSM from "../../data-psm-vocabulary.ts";
import {DataPsmSchemaXmlExtension} from "../model/index.ts";
import {XML_EXTENSION} from "../vocabulary.ts";

test("Update data PSM namespace and namespace prefix.", async () => {
  const operation = new DataPsmSetNamespaceXmlExtension();
  operation.dataPsmSchema = "http://schema";
  operation.namespace = "http://namespace";
  operation.namespacePrefix = "nsp";

  const before = {
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
    },
  };

  const actual = executeDataPsmSetNamespaceXmlExtension(
    wrapResourcesWithReader(before),
    undefined,
    operation
  );

  expect(actual.failed).toBeFalsy();
  expect(actual.created).toEqual({});
  expect(actual.changed).toEqual({
    "http://schema": {
      iri: "http://schema",
      types: [PSM.SCHEMA],
      extensions: {
        [XML_EXTENSION]: {
          namespace: "http://namespace",
          namespacePrefix: "nsp",
        }
      }
    } as DataPsmSchemaXmlExtension,
  });
  expect(actual.deleted).toEqual([]);
});

function wrapResourcesWithReader(resources: {
  [iri: string]: CoreResource;
}): CoreResourceReader {
  return ReadOnlyMemoryStore.create(resources);
}
