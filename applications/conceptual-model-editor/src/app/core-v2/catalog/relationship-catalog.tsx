import { useModelGraphContext } from "../context/model-context";
import { EntitiesOfModel } from "./entities-of-model";

export const RelationshipCatalog = () => {
    const { models } = useModelGraphContext();

    return (
        <>
            <ul>
                {[...models.entries()].map(([modelId, model]) => (
                    <EntitiesOfModel entityType="relationship" key={modelId + model.getAlias()} model={model} />
                ))}
            </ul>
        </>
    );
};
