import { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createSgovModel } from "@dataspecer/sgov-adapter";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { createRdfsModel } from "@dataspecer/rdfs/semantic-model";
import { createLogger } from "../../application";
import { EntityDsIdentifier } from "../entity-model";

const LOG = createLogger(import.meta.url);

export async function createInMemorySemanticModel(
  alias: string,
): Promise<EntityModel> {
  const model = new InMemorySemanticModel();
  model.setAlias(alias);
  // Create base IRI from identifier.
  const baseIri = `https://example.com/${model.getId()}/#`;
  model.setBaseIri(baseIri);
  return model;
}

export async function createRdfsSemanticModel(
  url: string, alias: string,
): Promise<EntityModel> {
  const model = new InMemorySemanticModel();
  const entities = await createRdfsModel(model.getId(), [url], httpFetch, { en: alias });
  return model.fromEntities(entities);
}

export async function createCzechSemanticVocabulary(): Promise<EntityModel> {
  const model = createSgovModel("https://slovník.gov.cz/sparql", httpFetch);
  await addEntityToExternalSemanticModel(
    model,
    "https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba");
  await addEntityToExternalSemanticModel(
    model,
    "https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");
  return model;
}

async function addEntityToExternalSemanticModel(
  model: ExternalSemanticModel, identifier: EntityDsIdentifier,
): Promise<void> {
  try {
    await model.allowClass(identifier);
  } catch {
    LOG.error("Failed to add entity to external semantic model.",
      { identifier });
  }
}
