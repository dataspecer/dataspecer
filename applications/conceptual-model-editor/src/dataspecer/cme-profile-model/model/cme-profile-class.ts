import { LanguageString } from "../../entity-model";
import { CmeProfileEntity } from "./cme-profile-entity";

export interface CmeProfileClass extends CmeProfileEntity {

  iri: string | null;

  name: LanguageString | null;

  nameSource: string | null;

  description: LanguageString | null;

  descriptionSource: string | null;

  profiling: string[];

  usageNote: LanguageString | null;

  usageNoteSource: string | null;

  externalDocumentationUrl: string | null;

  tags: string[];

}

export const CME_PROFILE_CLASS =
  "cme-profile-class";

export function isCmeProfileClass(
  what: CmeProfileEntity | undefined | null,
): what is CmeProfileClass {
  return what?.type.includes(CME_PROFILE_CLASS) ?? false;
}
