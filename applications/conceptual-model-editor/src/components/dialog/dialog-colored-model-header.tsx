import type { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { useModelGraphContext } from "../../context/model-context";
import { DialogDetailRow } from "./dialog-detail-row";
import { isSemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityDetailSupportedType } from "../../util/detail-utils";
import { getLanguagesForNamedThing } from "../../util/language-utils";

import { t } from "../../application";
import { getModelLabel } from "../../service/model-service";
import { type ChangeEvent } from "react";
import { VisualModel } from "@dataspecer/visual-model";
import { useClassesContext } from "../../context/classes-context";

export const DialogColoredModelHeader = (props: { activeModel: EntityModel | null; style?: string }) => {
  const graph = useModelGraphContext();
  const { activeModel, style } = props;

  return (
    <div
      className={style}
      style={{ backgroundColor: getModelColor(graph.getActiveVisualModel(), activeModel?.getId()) }}
    >
      <DialogDetailRow detailKey={t("model")}>{getModelLabel(activeModel)}</DialogDetailRow>
    </div>
  );
};

function getModelColor(visualModel: VisualModel | null, modelIdentifier: string | undefined): string {
  if (modelIdentifier === undefined) {
    return "";
  }
  if (visualModel === null) {
    return "";
  }
  return visualModel.getModelColor(modelIdentifier) ?? "";
}

export const DialogColoredModelHeaderWithLanguageSelector = (props: {
    style?: string;
    activeModel?: EntityModel;
    viewedEntity: EntityDetailSupportedType;
    currentLanguage: string;
    setCurrentLanguage: (l: string) => void;
}) => {
  const graph = useModelGraphContext();
  const { activeModel, viewedEntity, currentLanguage, setCurrentLanguage, style } = props;
  const languages = isSemanticModelGeneralization(viewedEntity) ? [] : getLanguagesForNamedThing(viewedEntity);
  return (
    <div
      className={style}
      style={{ backgroundColor: getModelColor(graph.getActiveVisualModel(), activeModel?.getId()) }}
    >
      <div className="font-semibold">{t("model")}:</div>
      <div className="flex">
        <div>{getModelLabel(activeModel)}</div>
        <div className="ml-auto mr-8">
          Language:&nbsp;
          <select
            name="langs"
            id="langs"
            className="w-32"
            onChange={(e) => setCurrentLanguage(e.target.value)}
            defaultValue={currentLanguage}
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
  );
};

export const DialogColoredModelHeaderWithModelSelector = (props: {
    activeModel?: string;
    onModelSelected: (mId: string, model: InMemorySemanticModel) => void;
    style?: string;
}) => {
  const graph= useModelGraphContext();
  const classesContext = useClassesContext();
  const { activeModel, style } = props;

  const availableModels = classesContext.semanticModels.values()
    .filter(model => model instanceof InMemorySemanticModel)
    .map(model => ({
      id: model.getId(),
      label: getModelLabel(model),
      model: model as InMemorySemanticModel,
    }));

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const identifier = event.target.value;
    for (const modelWrapper of availableModels) {
      if (modelWrapper.id === identifier) {
        props.onModelSelected(identifier, modelWrapper.model);
      }
    }
  };

  return (
    <div
      className={style}
      style={{ backgroundColor: getModelColor(graph.getActiveVisualModel(), activeModel) }}
    >
      <DialogDetailRow detailKey={t("model")}>
        <select
          className="w-full"
          name="models"
          id="models"
          onChange={onChange}
          defaultValue={activeModel}
        >
          {availableModels.map(item => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </DialogDetailRow>
    </div>
  );
};
