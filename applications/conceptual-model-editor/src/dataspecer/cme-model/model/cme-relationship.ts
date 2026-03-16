import { LanguageString } from "../../entity-model";
import { EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";
import { CmeCardinality } from "./cme-cardinality";
import { CmeEntity } from "./cme-entity";

export interface NewCmeRelationship {

  model: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  domain: EntityDsIdentifier | null;

  domainCardinality: CmeCardinality | null;

  range: EntityDsIdentifier | null;

  rangeCardinality: CmeCardinality | null;

  externalDocumentationUrl: string | null;

  order?: string | null;

}

export interface CmeRelationship extends CmeEntity, NewCmeRelationship {

  identifier: EntityDsIdentifier;

}
