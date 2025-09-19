import { useEffect, useMemo, useState } from "react";

import type { WritableVisualModel } from "@dataspecer/visual-model";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";

import { shortenStringTo } from "../util/utils";
import { useModelGraphContext } from "../context/model-context";
import { useEditInput } from "../components/input/edit-input";
import { ModelTypeIcon } from "../components/model-type-icon";
import { ColorPicker } from "../features/color-picker";
import { randomColorFromPalette } from "../util/color-utils";
import {
  ShowAllClassesFromSemanticModelButton,
} from "./components/add-entities-from-semantic-model-to-visual-button";
import {
  HideAllClassesFromSemanticModelButton,
} from "./components/remove-entities-in-semantic-model-from-visual-button";

const ModelName = (props: { displayName: string | null }) => (
  <div className="flex-grow text-nowrap">{props.displayName}</div>
);

export const ModelItemRow = (props: { modelId: string }) => {
  const { models, setModelAlias, setModelIri, removeModel, aggregatorView } = useModelGraphContext();
  const { EditInput, isEditInputActive, openEditInput } = useEditInput();

  const { modelId } = props;
  const model = models.get(modelId);

  const modelAlias = model?.getAlias();
  const displayName = modelAlias ?? shortenStringTo(modelId);

  const { activeVisualModel } = useMemo(() => {
    return { activeVisualModel: aggregatorView.getActiveVisualModel() as WritableVisualModel };
  }, [aggregatorView]);

  const [currentColor, setCurrentColor] = useState(activeVisualModel?.getModelColor(modelId) || "#000001");

  useEffect(() => {
    let color = activeVisualModel?.getModelColor(modelId);

    if (!color) {
      color = randomColorFromPalette();
      activeVisualModel?.setModelColor(modelId, color);
    }

    setCurrentColor(color ?? "#ff00ff");
  }, [modelId, activeVisualModel]);

  const handleSaveColor = (color: string) => {
    setCurrentColor(color);
    activeVisualModel?.setModelColor(modelId, color);
  };

  const saveAlias = (value: string | null) => {
    if (!model) {
      return;
    }
    setModelAlias(value, model);
  };

  const saveModelIri = (value: string | null) => {
    if (!model || !(model instanceof InMemorySemanticModel)) {
      return;
    }
    setModelIri(value ?? "", model);
  };

  const handleRemoveButtonClicked = () => {
    removeModel(props.modelId);
  };

  const handleModifyModelAliasClicked = () => {
    openEditInput(saveAlias, modelAlias ?? undefined, "model alias");
  };

  return (
    <div className="my-2 flex flex-row justify-between">
      <div className="flex flex-grow flex-row overflow-x-clip">
        <div className="mr-2 flex flex-row">
          <span>Ⓜ</span>
          <ModelTypeIcon
            model={model}
            onClick={(baseIri: string | null) =>
              openEditInput(saveModelIri, baseIri ?? undefined, "model base iri")
            }
          />
        </div>
        {isEditInputActive ? <EditInput /> : <ModelName displayName={displayName} />}
      </div>
      <div className="flex flex-row">
        {
          model === undefined ? null :
            <div>
              <ShowAllClassesFromSemanticModelButton semanticModel={model} />
              <HideAllClassesFromSemanticModelButton semanticModel={model} />
            </div>
        }
        <ColorPicker currentColor={currentColor} saveColor={handleSaveColor} />
        <button className="hover:shadow-sm" onClick={handleModifyModelAliasClicked}>
          ✏
        </button>
        <button className="my-auto" onClick={handleRemoveButtonClicked}>
          🗑️
        </button>
      </div>
    </div>
  );
};
