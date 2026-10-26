import { DialogProps } from "../../../../dialog/dialog-api";
import {
  EditVisualDiagramNodeDialogState,
} from "../edit-visual-diagram-node/edit-visual-diagram-node-dialog-controller";
import { getLocalizedStringFromLanguageString } from "../../../../util/language-utils";
import { useState } from "react";
import { t } from "../../../../application";
import { DialogDetailRow } from "../../../../components/dialog/dialog-detail-row";

export const VisualDiagramNodeInfoDialog = (props: DialogProps<EditVisualDiagramNodeDialogState>) => {
  const state = props.state;
  const [language, setCurrentLanguage] = useState<string>(props.state.language);
  const languages = Object.keys(state.representedVisualModelName);
  return (
    <>
      <div className="bg-slate-100">
        <div className="flex">
          <div className="ml-auto mr-8">
            Language:&nbsp;
            <select
              name="langs"
              id="langs"
              className="w-32"
              onChange={(e) => setCurrentLanguage(e.target.value)}
              defaultValue={state.language}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="grid gap-y-3 bg-slate-100 md:grid-cols-[20%_80%] md:pl-8">
        <DialogDetailRow detailKey={t("visual-diagram-node-info-dialog.represented-visual-model-name")}>
          {getLocalizedStringFromLanguageString(state.representedVisualModelName, language)}
        </DialogDetailRow>
      </div>
    </>
  );
};
