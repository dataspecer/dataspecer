import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { getSemanticModelMainEntity, type MainSemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import type { LanguageString } from "@dataspecer/core/core";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { RdfHttpSource } from "@dataspecer/core/io/rdf/http/http-rdf-source";
import { Store } from "n3";
import { createRdfsSemanticModelAdapter } from "../adapter/adapter.ts";
import { isRdfsSnapshot, type VocabularySourceRdfs } from "./source.ts";

export async function createRdfsModel(modelId: string, urls: string[], httpFetch: HttpFetch, label: LanguageString = {}): Promise<EntityRecord> {
  const store = new Store();

  const downloader = new RdfHttpSource();
  // we fetch in parallel, it is the responsibility of the downloader to handle
  // the requests properly (e.g. rate limiting, retries, etc.)
  const op = urls.map((url) => downloader.fetch(httpFetch, url));
  await Promise.all(op);
  store.addQuads(downloader.getQuads());

  const source: VocabularySourceRdfs = { type: "snapshot", provider: "rdfs", urls: [...urls] };
  const mainEntity: MainSemanticModelEntity = {
    id: modelId,
    type: [LOCAL_SEMANTIC_MODEL],
    label,
    source,
  };
  return {
    ...createRdfsSemanticModelAdapter(store).getAllSemanticEntities(),
    [modelId]: mainEntity,
  };
}

export async function reloadRdfsModel(entities: EntityRecord, httpFetch: HttpFetch, urls?: string[]): Promise<EntityRecord> {
  const main = getSemanticModelMainEntity(entities);
  if (!main || !isRdfsSnapshot(main.source)) throw new Error("Expected an RDFS snapshot model.");
  const next = await createRdfsModel(main.id, urls ?? main.source.urls, httpFetch, main.label);
  next[main.id] = {
    ...main,
    source: { ...main.source, urls: [...(urls ?? main.source.urls)] },
  } as MainSemanticModelEntity;
  return next;
}
