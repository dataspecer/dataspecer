import { type DialogProps } from "../../dialog-api";
import { t } from "../../../application";
import { InputLanguageString } from "../../components/input-language-string";
import { SelectBuildIn } from "../../components/select-build-in";
import { DialogDetailRow } from "../../../components/dialog/dialog-detail-row";
import { EditVisualModelDialogState } from "./edit-visual-model-dialog-state";
import { useEditVisualModelDialogController } from "./edit-visual-model-dialog-controller";
import { Checkbox } from "@/dialog/components";

export const CreateVisualModelDialogView = (
  props: DialogProps<EditVisualModelDialogState>,
) => {
  const controller = useEditVisualModelDialogController(props);
  const state = props.state;
  console.log(">", state);
  return (
    <>
      <div className="grid bg-slate-100 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey={t("create-visual-model-dialog.label")} className="text-xl">
          <InputLanguageString
            value={state.label}
            onChange={controller.setLabel}
            defaultLanguage={state.language}
            inputType="text"
          />
        </DialogDetailRow>
      </div>
      <br/>
      <div className="grid bg-slate-100 md:grid-cols-[25%_75%] md:gap-y-3 md:pl-8 md:pr-16 md:pt-2">
        <DialogDetailRow detailKey="Class or class profile label" className="text-xl">
          <SelectBuildIn
            value={state.labelVisual.toString()}
            items={[{
              value: "0",
              label: "create-visual-model-dialog.label-visual-label.iri",
            }, {
              value: "1",
              label: "create-visual-model-dialog.label-visual-label.entity",
            }, {
              value: "2",
              label: "create-visual-model-dialog.label-visual-label.entity-vocabulary",
            }]}
            onChange={controller.setLabelVisual}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey="Class or class profile color" className="text-xl">
          <SelectBuildIn
            value={state.entityMainColor.toString()}
            items={[{
              value: "0",
              label: "create-visual-model-dialog.entity-color.entity",
            }, {
              value: "1",
              label: "create-visual-model-dialog.entity-color.entity-vocabulary",
            }]}
            onChange={controller.setEntityMainColor}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey="How to display profile of" className="text-xl">
          <SelectBuildIn
            value={state.profileOfVisual.toString()}
            items={[{
              value: "0",
              label: "create-visual-model-dialog.profile.none",
            }, {
              value: "1",
              label: "create-visual-model-dialog.profile.entity",
            }, {
              value: "2",
              label: "create-visual-model-dialog.profile.iri",
            }]}
            onChange={controller.setProfileOfVisual}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey="Display range detail" className="text-xl">
          <Checkbox
            checked={state.displayRangeDetail as any}
            onChange={event => controller.setDisplayRangeDetail(event.target.checked)}
          />
        </DialogDetailRow>
        <DialogDetailRow detailKey="Display <<profile>> for relationships" className="text-xl">
          <Checkbox
            checked={state.displayRelationshipProfileArchetype as any}
            onChange={event => controller.setDisplayRelationshipProfileArchetype(event.target.checked)}
          />
        </DialogDetailRow>
      </div>
    </>
  );
};
