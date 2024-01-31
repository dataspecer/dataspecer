import { useState } from "react";
import { useModelGraphContext } from "./context/graph-context";
import { VisualEntityModelImpl } from "@dataspecer/core-v2/visual-model";

export const ViewManagement = () => {
    const { aggregatorView, aggregator, setAggregatorView, setVisualModels } = useModelGraphContext();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const activeViewId = aggregatorView.getActiveViewId();
    const availableVisualModelIds = aggregatorView.getAvailableVisualModelIds();

    const setActiveViewId = (modelId: string) => {
        aggregatorView.changeActiveVisualModel(modelId);
    };

    const handleViewSelected = (viewId: string) => {
        setActiveViewId(viewId);
        setAggregatorView(aggregator.getView());
        toggleDropdown();
    };

    const handleCreateNewView = () => {
        const model = new VisualEntityModelImpl(undefined);
        aggregator.addModel(model);
        setAggregatorView(aggregator.getView());
        setVisualModels((prev) => new Map(prev.set(model.getId(), model)));
    };

    const toggleDropdown = () => {
        setDropdownOpen((prev) => !prev);
    };

    return (
        <div className="my-auto">
            <div className="flex flex-col text-[15px]">
                <div className="flex flex-row">
                    <div>
                        view:<span className="ml-2 font-mono">{activeViewId}</span>
                    </div>
                    <button className="white ml-2 text-[15px]" title="change view" onClick={toggleDropdown}>
                        🗃️
                    </button>
                    <button className="white ml-2 text-[15px]" onClick={handleCreateNewView} title="create a new view">
                        <span className="font-bold">+</span>🖼️
                    </button>
                </div>
                {dropdownOpen && (
                    <ul className="absolute z-10 mt-8 flex flex-col bg-[#5438dc]">
                        {availableVisualModelIds.map((viewId) => (
                            <li key={viewId} className="w-full">
                                <button onClick={() => handleViewSelected(viewId)}>{viewId}</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
