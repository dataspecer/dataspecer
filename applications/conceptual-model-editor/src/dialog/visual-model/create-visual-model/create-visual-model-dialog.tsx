import { type DialogProps } from "../../dialog-api";
import { t } from "../../../application";
import { MultiLanguageInputForLanguageString } from "../../../components/input/multi-language-input-4-language-string";
import { DialogDetailRow } from "../../../components/dialog/dialog-detail-row";
import { CreateVisualModelDialogState, useCreateVisualModelDialogController } from "./create-visual-model-dialog-controller";

export const CreateVisualModelDialog = (props: DialogProps<CreateVisualModelDialogState>) => {
  const controller = useCreateVisualModelDialogController(props);
  const state = props.state;
  return (
    <>
      <div className="grid bg-slate-100 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey={t("create-visual-model-dialog.label")} className="text-xl">
          <MultiLanguageInputForLanguageString
            ls={state.label}
            setLs={controller.setLabel}
            defaultLang={state.language}
            inputType="text"
          />
        </DialogDetailRow>
      </div>
    </>
  );
};
