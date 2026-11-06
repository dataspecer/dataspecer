import type { EntityModel } from "@dataspecer/core-v2";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { ExternalSemanticModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { getModelIri } from "../util/iri-utils";

export const ModelTypeIcon = (props: { model: EntityModel | undefined; onClick: (baseIri: string | null) => void }) => {
  const { model, onClick } = props;
  let modelType: React.JSX.Element;
  if (model instanceof InMemorySemanticModel && model.getMainEntity()?.source) {
    modelType = <span title="imported vocabulary">📁</span>;
  } else if (model instanceof InMemorySemanticModel) {
    const modelBaseIri = model.getBaseIri();
    const defaultModelIri = modelBaseIri?.length === 0 ? getModelIri(model) : modelBaseIri;
    modelType = (
      <>
        <span title={"local model\nbase iri: <" + model.getBaseIri() + ">"}>🏠</span>
        <button title={"click to edit base iri"} onClick={() => onClick(defaultModelIri)}>
          📑
        </button>
      </>
    );
  } else if (model instanceof ExternalSemanticModel) {
    modelType = <span title="slovník.gov.cz">sgov</span>;
  } else {
    modelType = <span title="vocabulary">📁</span>;
  }

  return modelType;
};
