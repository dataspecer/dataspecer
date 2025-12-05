import { LanguageString } from "../../entity-model";
import { CmeEntityAggregate } from "./cme-entity-aggregate";
import { CmeProfileAggregate } from "./cme-profile-aggregate";

export interface CmeProfileClassAggregate extends CmeProfileAggregate {

  type: typeof CME_PROFILE_CLASS_AGGREGATE;

  iri: string | null;

  name: LanguageString | null;

  nameSource: string | null;

  nameAggregate: LanguageString | null;

  description: LanguageString | null;

  descriptionSource: string | null;

  descriptionAggregate: LanguageString | null;

  profiling: string[];

  usageNote: LanguageString | null;

  usageNoteSource: string | null;

  usageNoteAggregate: LanguageString | null;

  externalDocumentationUrl: string | null;

  tags: string[];

}

const CME_PROFILE_CLASS_AGGREGATE =
  "cme-profile-class-aggregate";

export function isCmeProfileClassAggregate(
  what: CmeEntityAggregate | undefined | null,
): what is CmeProfileClassAggregate {
  return what?.type === CME_PROFILE_CLASS_AGGREGATE;
}
