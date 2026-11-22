import { DialogProps, DialogWrapper } from "../dialog-api";
import {
  CreateFilterSelectionControllerType,
  SelectionFilterState,
  createFilterSelectionState,
  useFilterSelectionController
} from "./filter-selection-dialog-controller";
import { Selections, SelectionsWithIdInfo } from "../../action/filter-selection-action";
import { t } from "../../application";

/**
 * Represents one concrete filter data used to render checkbox for the filter.
 */
type CheckboxData = {
    checked: boolean;
    checkboxText: string;
    checkboxTooltip: string;
}

export const createFilterSelectionDialog = (
  onConfirm: ((state: SelectionFilterState) => void | Promise<void>) | null,
  selections: SelectionsWithIdInfo,
  setSelectionInDiagram: (selections: Selections) => void,
): DialogWrapper<SelectionFilterState> => {
  return {
    label: "filter-selection-dialog.label",
    component: CreateFilterSelectionDialog,
    state: createFilterSelectionState(selections, setSelectionInDiagram),
    confirmLabel: "filter-selection-dialog.btn-ok",
    cancelLabel: "filter-selection-dialog.btn-cancel",
    validate: null,
    onConfirm,
    onClose: null,
    dialogClassNames: "base-dialog z-30 p-4 ",
  };
};

export const CreateFilterSelectionDialog = (props: DialogProps<SelectionFilterState>) => {
  const state = props.state;
  const controller = useFilterSelectionController(props);

  return <div>
    <FilterControls controller={controller} state={state}/>
    <SimpleHorizontalLineSeparator/>
  </div>;
};

/**
 * Component with controls for the reduction of current selection.
 */
const FilterControls = (props: { state: SelectionFilterState, controller: CreateFilterSelectionControllerType }) => {
  return <div>
    {props.state.selectionFilters.map((checkboxState, index) => {
      return createCheckboxComponent(props.controller, checkboxState, index);
    })}
  </div>;
};

/**
     * Component which renders given {@link CheckboxData} as checkbox.
     */
const createCheckboxComponent = (
  controller: CreateFilterSelectionControllerType,
  checkboxData: CheckboxData,
  index: number
) => {
  return <div key={`filter-checkbox-div${index}`}>
    <label title={checkboxData.checkboxTooltip === "" ? "" : t(checkboxData.checkboxTooltip)}>
      <input type="checkbox"
        checked={checkboxData.checked}
        onChange={(event) => {
          controller.setFilterActivness({ index, isActive: event.target.checked });
        }}>
      </input>
      {t(checkboxData.checkboxText)}
    </label>
  </div>;
};

const SimpleHorizontalLineSeparator = () => {
  return <div className="mb-2 mt-2 border-t border-gray-300"></div>;
};