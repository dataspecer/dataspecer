import {
  CreateExtendSelectionControllerType,
  ExtendSelectionState,
  ExtensionCheckboxData,
  createExtendSelectionState,
  useExtendSelectionController
} from "./extend-selection-dialog-controller";
import { DialogProps, DialogWrapper } from "../dialog-api";
import { Selections } from "../../action/filter-selection-action";
import { t } from "../../application";
import React from "react";

export const createExtendSelectionDialog = (
  onConfirm: ((state: ExtendSelectionState) => void | Promise<void>) | null,
  onClose: () => void,
  areIdentifiersFromVisualModel: boolean,
  selections: Selections,
  setSelectionsInDiagram: (newSelection: Selections) => void,
): DialogWrapper<ExtendSelectionState> => {
  return {
    label: "extend-selection-dialog.label",
    component: CreateExtendSelectionDialog,
    state: createExtendSelectionState(selections, setSelectionsInDiagram, areIdentifiersFromVisualModel),
    confirmLabel: "extend-selection-dialog.btn-ok",
    cancelLabel: "extend-selection-dialog.btn-cancel",
    validate: null,
    onConfirm,
    onClose,
    dialogClassNames: "base-dialog p-4 bg-white bg-opacity-80 mt-12",
  };
};

export const CreateExtendSelectionDialog = (props: DialogProps<ExtendSelectionState>) => {
  const state = props.state;
  const controller = useExtendSelectionController(props);

  return <div>
    {createSelectorPanel(controller, state)}
    <SimpleHorizontalLineSeparator/>
  </div>;
};

/**
 * Component representing the part of dialog with the extension settings
 */
const createSelectorPanel = (
  controller: CreateExtendSelectionControllerType,
  state: ExtendSelectionState
) => {
  /**
     * Represent grid based style which places elements at columns of size 2.
     */
  const gridContainerStyle = {
    display: "grid",
    gridAutoFlow: "row",
    gridTemplateColumns: "repeat(3, auto)",
    gap: "0px",
    columnGap: "50px",
    justifyContent: "start",
  };

  return <div>
    <div className="flex flex-row">
      <div style={gridContainerStyle}>
        <label>
          <input type="checkbox"
            checked={state.shouldExtendOnlyThroughEdges}
            onChange={(_) => {
              controller.toggleExtendOnlyThroughEdges()
            }}>
          </input>
          {t("extend-selection-dialog.only-edges-checkbox")}
        </label>
        <div>{t("extend-by-outgoing-header")}</div>
        <div>{t("extend-by-incoming-header")}</div>
        <div></div>
        <SimpleHorizontalLineSeparator/>
        <SimpleHorizontalLineSeparator/>
        {state.extensionCheckboxes.map((checkboxState, index) => {
          return createExtensionCheckbox(controller, checkboxState, index);
        })}
      </div>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-0 px-4 border border-blue-700 rounded ml-12"
        onClick={controller.performExtensionBasedOnExtensionState}>
        {t("extend-selection-dialog.extend-button")}
      </button>
    </div>
  </div>;
};

/**
 * Component which renders given {@link CheckboxData} as checkbox.
 */
const createExtensionCheckbox = (
  controller: CreateExtendSelectionControllerType,
  checkboxData: ExtensionCheckboxData,
  index: number
) => {
  const isNewRow = index % 2 === 0;
  return <React.Fragment key={`extension-checkbox-div${index}`}>
    {isNewRow ? <div>{t(checkboxData.checkboxText)}</div> : null}
    <div>
      <label>
        <input type="checkbox"
          checked={checkboxData.checked}
          onChange={(event) => {
            controller.setExtensionCheckboxActivness({ index, isActive: event.target.checked })
          }}>
        </input>
      </label>
    </div>
  </React.Fragment>;
};

const SimpleHorizontalLineSeparator = () => {
  return <div className="mb-2 mt-2 border-t border-gray-300"></div>;
};
