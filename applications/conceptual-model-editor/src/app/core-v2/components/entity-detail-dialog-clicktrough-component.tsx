import { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
    SemanticModelClassUsage,
    SemanticModelRelationshipUsage,
} from "@dataspecer/core-v2/semantic-model/usage/concepts";
import { EntityProxy } from "../util/detail-utils";
import { useModelGraphContext } from "../context/model-context";
import { useClassesContext } from "../context/classes-context";
import { useConfigurationContext } from "../context/configuration-context";
import { getIri, getModelIri } from "../util/iri-utils";
import { sourceModelOfEntity } from "../util/model-utils";

export const ResourceDetailClickThrough = (props: {
    resource: SemanticModelClass | SemanticModelRelationship | SemanticModelClassUsage | SemanticModelRelationshipUsage;
    onClick: () => void;
    withCardinality?: string;
    withIri?: boolean;
}) => {
    const { language } = useConfigurationContext();
    const { sourceModelOfEntityMap } = useClassesContext();
    const { aggregatorView, models } = useModelGraphContext();

    const { resource, onClick, withCardinality, withIri } = props;
    const name = EntityProxy(resource, language).name;
    const modelColor = aggregatorView.getActiveVisualModel()?.getColor(sourceModelOfEntityMap.get(resource.id) ?? "");
    const iri = withIri ? getIri(resource, getModelIri(sourceModelOfEntity(resource.id, [...models.values()]))) : null;

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
