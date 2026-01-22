import { useEffect } from "react";
import { useModelGraphContext } from "../context/model-context";
import { DropDownCatalog } from "../components/management/dropdown-catalog";
import { useQueryParamsContext } from "../context/query-params-context";
import { languageStringToString } from "../utilities/string";
import { configuration } from "../application";
import { useOptions } from "../configuration/options";
import { useActions } from "@/action/actions-react-binding";

export const ViewManagement = () => {
  const {
    aggregatorView,
    visualModels,
    removeVisualModel
  } = useModelGraphContext();
  const { language } = useOptions();

  const actions = useActions();

  const { viewId } = useQueryParamsContext();

  const activeViewId = aggregatorView.getActiveViewId();
  const availableVisualModelIds = aggregatorView.getAvailableVisualModels()
    .map(item => [
      item.getIdentifier(),
      item.getLabel() === null ? null : languageStringToString(
        configuration().languagePreferences, language, item.getLabel()!),
    ] as [string, string]);

  const handleViewSelected = (viewId: string) => {
    actions.changeVisualModel(viewId);
  };

  const handleCreateNewView = () => {
    actions.openCreateVisualModelDialog();
  };

  const handleViewDeleted = (viewId: string) => {
    const visualModel = visualModels.get(viewId);
    if (!visualModel) {
      return;
    }
    removeVisualModel(viewId);
  };

  return (
    <div className="flex">
      <DropDownCatalog
        label="View"
        valueSelected={activeViewId ?? null}
        openCatalogTitle="change view"
        availableValues={availableVisualModelIds}
        onValueSelected={(value) => handleViewSelected(value)}
        onValueEdit={(value) => actions.openEditVisualModelDialog(value)}
        onValueDeleted={(value) => handleViewDeleted(value)}
        extraCatalogItems={[{
          content: "📦",
          callback: (value: string) => actions.addVisualDiagramNodeForExistingModelToVisualModel(value)
        }]}
      />
      <button className="ml-2 white" onClick={handleCreateNewView} title="Create a new view">
        <AddIcon />
      </button>
    </div>
  );
};

const AddIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}