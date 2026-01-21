import { VisualModelOptions } from "@/configuration/options";
import { LanguageString } from "../../../dataspecer/entity-model";
import {
  EntityColor, LabelVisual, ProfileOfColor, ProfileOfVisual,
} from "../../../diagram/model";

export interface EditVisualModelDialogState {

  language: string,

  label: LanguageString,

  labelVisual: string;

  entityMainColor: string;

  profileOfVisual: string;

  profileOfColor: string;

  displayRangeDetail: boolean;

  displayRelationshipProfileArchetype: boolean;

}

export function createEditVisualModelDialogState(
  language: string,
  visualModelLabel: LanguageString | null,
  options: VisualModelOptions,
): EditVisualModelDialogState {
  return {
    label: visualModelLabel ?? { en: "Visual Model" },
    language,
    labelVisual: String(options.labelVisual),
    entityMainColor: String(options.entityMainColor),
    profileOfVisual: String(options.profileOfVisual),
    profileOfColor: String(options.profileOfColor),
    displayRangeDetail: options.displayRangeDetail,
    displayRelationshipProfileArchetype:
      options.displayRelationshipProfileArchetype,
  };
}
