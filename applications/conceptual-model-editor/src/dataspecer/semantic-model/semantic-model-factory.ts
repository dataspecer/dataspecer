import { createLogger } from "../../application";
import { createRdfsModel, createSgovModel, ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { EntityDsIdentifier } from "../entity-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { EntityModel } from "@dataspecer/core-v2";

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
  const model = await createRdfsModel([url], httpFetch);
  model.alias = alias;
  model.fetchFromPimStore();
  return model;
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
