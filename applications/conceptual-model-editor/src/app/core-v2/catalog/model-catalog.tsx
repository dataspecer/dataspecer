import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createSgovModel, createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { useModelGraphContext } from "../context/graph-context";
import { useAddModelDialog } from "../dialogs/add-model-dialog";
import { SGOV_MODEL_ID, DCTERMS_MODEL_ID, LOCAL_MODEL_ID } from "../util/constants";
import { useState } from "react";

export const ModelCatalog = () => {
    const { aggregator, aggregatorView, setAggregatorView, addModelToGraph, models, removeModelFromModels } =
        useModelGraphContext();
    const { isAddModelDialogOpen, AddModelDialog, openAddModelDialog } = useAddModelDialog();

    const handleAddModel = async (modelType: string) => {
        console.log("handle add model called");

        if (modelType === SGOV_MODEL_ID) {
            const model = createSgovModel("https://slovník.gov.cz/sparql", httpFetch);
            model.allowClass("https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");
            model.allowClass("https://slovník.gov.cz/veřejný-sektor/pojem/fyzická-osoba");
            addModelToGraph(model);
        } else if (modelType === DCTERMS_MODEL_ID) {
            const model = await createRdfsModel(
                ["https://mff-uk.github.io/demo-vocabularies/original/dublin_core_terms.ttl"],
                httpFetch
            );
            model.fetchFromPimStore();
            addModelToGraph(model);
        } else if (modelType === LOCAL_MODEL_ID) {
            const model = new InMemorySemanticModel();
            addModelToGraph(model);
        } else {
            alert(`unsupported model type ${modelType}`);
            return;
        }

        const aggregatedView = aggregator.getView();
        setAggregatorView(aggregatedView);

        console.log("in add model", models);
    };

    const AddModelDialogButton = () => (
        <button
            onClick={() => openAddModelDialog()}
            disabled={isAddModelDialogOpen}
            type="button"
            className="cursor-pointer border bg-indigo-600 text-white disabled:cursor-default disabled:bg-zinc-500"
        >
            + <span className=" font-mono">Model</span>
        </button>
    );

    const AddModelButton = (props: { disabled: boolean; modelType: string }) => (
        <button
            onClick={() => handleAddModel(props.modelType)}
            disabled={props.disabled}
            type="button"
            className="cursor-pointer border bg-indigo-600 text-white disabled:cursor-default disabled:bg-zinc-500"
        >
            + <span className=" font-mono">{props.modelType}</span>
        </button>
    );

    const ModelItem = (props: { modelId: string }) => {
        return (
            <div className={`m-2 flex flex-row justify-between`}>
                <h4 onClick={() => console.log(models.get(props.modelId))}>Model - {props.modelId}</h4>
                <div>{models.get(props.modelId)?.getId()}</div>
                <button className="my-auto" onClick={() => removeModelFromModels(props.modelId)}>
                    🗑️
                </button>
            </div>
        );
    };

    return (
        <>
            <div className="overflow-y-scroll bg-teal-100">
                <h3 className=" font-semibold">Add Model Section</h3>
                <ul>
                    {[...models.keys()].map((modelId, index) => (
                        <li key={"model" + index}>
                            <ModelItem modelId={modelId} />
                        </li>
                    ))}
                </ul>
                <AddModelDialogButton />
                <AddModelButton disabled={models.has(SGOV_MODEL_ID)} modelType={SGOV_MODEL_ID} />
                <AddModelButton disabled={models.has(DCTERMS_MODEL_ID)} modelType={DCTERMS_MODEL_ID} />
                <AddModelButton disabled={models.has(LOCAL_MODEL_ID)} modelType={LOCAL_MODEL_ID} />
            </div>
            {isAddModelDialogOpen && <AddModelDialog />}
        </>
    );
};
