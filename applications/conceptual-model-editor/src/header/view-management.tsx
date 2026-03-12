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

  const { updateViewId: setViewIdSearchParam } = useQueryParamsContext();

  const activeViewId = aggregatorView.getActiveViewId();
  const availableVisualModelIds = aggregatorView.getAvailableVisualModels()
    .map(item => [
      item.getIdentifier(),
      item.getLabel() === null ? null : languageStringToString(
        configuration().languagePreferences, language, item.getLabel()!),
    ] as [string, string]);

  useEffect(() => {
    if (activeViewId === undefined) {
      console.log("Ignore change in activeViewId as it is null.");
      return;
    }
    setViewIdSearchParam(activeViewId ?? null);
  }, [activeViewId, setViewIdSearchParam]);

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
      <button 
        className="ml-2 white" 
        onClick={() => actions.saveViewportPosition()} 
        title="Save current viewport position as default for this view"
      >
        <SaveViewportIcon />
      </button>
    </div>
  );
};

const SaveViewportIcon = () => {
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
      <path d="M12 5v14M5 12l7 7 7-7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

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