import z from "zod";
import express from "express";
import { resourceModel } from "../main.ts";
import { asyncHandler } from "../utils/async-handler.ts";
import {
  FakeDataspecerMetadataProvider,
  generateApp,
} from "@dataspecer/app-generator";
import configuration from "../configuration.ts";
import { AssociationKind, FieldKind } from "@dataspecer/app-generator";
import { getSpecification } from "../utils/data-specification.ts";

export const generateApplicationByModelId = asyncHandler(
  async (request: express.Request, response: express.Response) => {
    const querySchema = z.object({
      iri: z.string().min(1),
    });
    const query = querySchema.parse(request.query);

    const modelStore = await resourceModel.getOrCreateResourceModelStore(
      query.iri,
    );
    const data: any = await modelStore.getJson();
    const baseUrl = configuration.host ?? "";
    const resourceBaseUrl = `${baseUrl}/resources?iri=`;
    const blobBaseUrl = `${baseUrl}/resources/blob?iri=`;

    const dataSpecification = await fetch(
      resourceBaseUrl + encodeURIComponent(data.dataSpecificationIri),
    ).then((res) => res.json());
    const nodes = await Promise.all(
      data.nodes.map(async (n: any) => {
        const resource = await fetch(
          resourceBaseUrl + encodeURIComponent(n.structure),
        );
        const blob = await fetch(blobBaseUrl + encodeURIComponent(n.structure));
        const resourceResult =
          resource.status !== 200
            ? {
                error: `Error fetching resource for structure ${n.structure} of node "${n.label}": status: ${resource.status}`,
              }
            : await resource.json();
        const blobResult =
          blob.status !== 200
            ? {
                error: `Error fetching blob for structure ${n.structure} of node "${n.label}": status: ${blob.status}`,
              }
            : await blob.json();
        return {
          resource: resourceResult,
          blob: blobResult,
        };
      }),
    );
    const newDataSpecification = await getSpecification(
      data.dataSpecificationIri,
    );
    const result = await generateApp({
      graph: data,
      metadataProvider: new FakeDataspecerMetadataProvider({
        [data.dataSpecificationIri]: {
          dataSpecificationIri: data.dataSpecificationIri,
          aggregates: [
            {
              iri: "https://example.org/aggregate/book-list",
              name: "BookList",
              classIri: "https://example.org/class/book",
              fields: [
                {
                  path: "id",
                  label: "ID",
                  kind: FieldKind.Primitive,
                  datatype: "string",
                },
                {
                  path: "title",
                  label: "Title",
                  kind: FieldKind.Primitive,
                  datatype: "string",
                },
                {
                  path: "author",
                  label: "Author",
                  kind: FieldKind.Association,
                  targetAggregateIri:
                    "https://example.org/aggregate/author-detail",
                  targetClassIri: "https://example.org/class/author",
                  associationKind: AssociationKind.Aggregation,
                },
              ],
            },
            {
              iri: "https://example.org/aggregate/book-detail",
              name: "BookDetail",
              classIri: "https://example.org/class/book",
              fields: [
                {
                  path: "title",
                  label: "Title",
                  kind: FieldKind.Primitive,
                  datatype: "string",
                },
                {
                  path: "author",
                  label: "Author",
                  kind: FieldKind.Association,
                  targetAggregateIri:
                    "https://example.org/aggregate/author-detail",
                  targetClassIri: "https://example.org/class/author",
                  associationKind: AssociationKind.Aggregation,
                },
              ],
            },
            {
              iri: "https://example.org/aggregate/author-detail",
              name: "AuthorDetail",
              classIri: "https://example.org/class/author",
              fields: [
                {
                  path: "name",
                  label: "Name",
                  kind: FieldKind.Primitive,
                  datatype: "string",
                },
              ],
            },
          ],
        },
      }),
      outputDirectory:
        "/home/evaganov/Desktop/my/MFF/predmety/Výzkumný projekt/dataspecer-fork/packages/app-generator/tmp/test-app",
    });
    response.setHeader("Content-Type", "application/json");
    response.send(result);
  },
);
