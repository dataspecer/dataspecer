import type { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { useEntityProxy } from "../util/detail-utils";
import { useModelGraphContext } from "../context/model-context";
import { useClassesContext } from "../context/classes-context";
import { getIri, getModelIri } from "../util/iri-utils";
import { sourceModelOfEntity } from "../util/model-utils";
import { useOptions } from "../configuration/options";
import {
  SemanticModelClassProfile,
  SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";

const DEFAULT_MODEL_COLOR = "#ffffff";

export const ResourceDetailClickThrough = (props: {
  resource:
  SemanticModelClass
  | SemanticModelRelationship
  | SemanticModelClassProfile
  | SemanticModelRelationshipProfile;
  detailDialogLanguage?: string;
  onClick: () => void;
  withCardinality?: string;
  withIri?: boolean;
}) => {
  const { language } = useOptions();
  const classesContext = useClassesContext();
  const graph= useModelGraphContext();

  const { resource, onClick, withCardinality, withIri, detailDialogLanguage } = props;
  const name = useEntityProxy(resource, detailDialogLanguage ?? language).name;
  const modelColor =
    graph.getActiveVisualModel()?.getModelColor(classesContext.sourceModelOfEntityMap.get(resource.id) ?? "")
    ?? DEFAULT_MODEL_COLOR;
  const iri = withIri ? getIri(resource, getModelIri(sourceModelOfEntity(resource.id, classesContext.semanticModelsList))) : null;

  return (
    <div className="flex flex-row">
      <div className="flex cursor-pointer flex-row hover:underline" onClick={onClick}>
        <div className="my-auto mr-1 h-3 w-3" style={{ backgroundColor: modelColor }} />
        <span>{name}</span>
      </div>
      {iri && <span className="ml-1.5">({iri})</span>}
      {withCardinality && <span className="ml-1.5">: {withCardinality}</span>}
    </div>
  );
};
