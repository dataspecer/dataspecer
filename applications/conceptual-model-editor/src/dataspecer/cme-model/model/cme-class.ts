import { LanguageString, EntityDsIdentifier, ModelDsIdentifier } from "../../entity-model";
import { CmeEntity } from "./cme-entity";

export interface NewCmeClass {

  model: ModelDsIdentifier;

  iri: string | null;

  name: LanguageString | null;

  description: LanguageString | null;

  externalDocumentationUrl: string | null;

  order?: string | null;

}

export interface CmeClass extends CmeEntity, NewCmeClass {

  identifier: EntityDsIdentifier;

}
