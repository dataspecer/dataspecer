import { generate } from "@dataspecer/core-v2/semantic-model/lightweight-owl";
import { useModelGraphContext } from "../context/model-context";
import { SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { getRandomName } from "../../utils/random-gen";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";
import { useEffect, useMemo, useState } from "react";
import { ExportedConfigurationType, modelsToWorkspaceString, useLocalStorage } from "../util/export-utils";
import { EntityModel } from "@dataspecer/core-v2/entity-model";
import { VisualEntityModel } from "@dataspecer/core-v2/visual-model";

export const ExportManagement = () => {
    const {
        aggregator,
        aggregatorView,
        models,
        addModelToGraph,
        visualModels,
        setAggregatorView,
        addVisualModelToGraph,
        cleanModels,
    } = useModelGraphContext();
    const service = useMemo(() => new BackendPackageService("fail-if-needed", httpFetch), []);
    const { getWorkspaceState, saveWorkspaceState } = useLocalStorage();
    const [autosaveActive, setAutosaveActive] = useState(false);
    const [autosaveInterval, setAutosaveInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (autosaveActive) {
            saveWorkspaceState(models, visualModels, aggregatorView.getActiveViewId());
            const res = setInterval(() => {
                saveWorkspaceState(models, visualModels);
            }, 30000);
            setAutosaveInterval(res);
        } else {
            clearInterval(autosaveInterval!);
            setAutosaveInterval(null);
        }
    }, [autosaveActive]);

    const uploadConfiguration = (contentType: string = "application/json") => {
        return new Promise<string | undefined>((resolve) => {
            let input = document.createElement("input");
            input.type = "file";
            input.multiple = false;
            input.accept = contentType;

            input.onchange = () => {
                const file = input.files?.[0];
                if (!file) {
                    resolve(undefined);
                    return;
                }

                const fileReader = new FileReader();
                fileReader.readAsText(file);

                fileReader.onload = (readerEvent) => {
                    const content = readerEvent?.target?.result;
                    if (typeof content == "string") {
                        resolve(content);
                        return;
                    }
                    resolve(undefined);
                };
            };

            input.click();
        });
    };

    const download = (content: string, name: string, type: string) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: type });
        element.href = URL.createObjectURL(file);
        element.download = name;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const useConfiguration = (entityModels: EntityModel[], visualModels: VisualEntityModel[], activeView?: string) => {
        cleanModels();

        addVisualModelToGraph(...visualModels);
        aggregatorView.changeActiveVisualModel(activeView ?? visualModels.at(0)?.getId() ?? null);

        addModelToGraph(...entityModels);

        setAggregatorView(aggregator.getView());
    };

    return (
        <div className="mr-2 flex flex-row">
            <div className="ml-1">
                <button
                    className="bg-[#c7556f] px-1"
                    title="open workspace from configuration file"
                    onClick={async () => {
                        const configuration = await uploadConfiguration();

                        const loadConfiguration = async (configuration: string) => {
                            const { packageId, modelDescriptors, activeView } = JSON.parse(
                                configuration
                            ) as ExportedConfigurationType;
                            const [entityModels, visualModels] = await service.getModelsFromModelDescriptors(
                                modelDescriptors
                            );

                            useConfiguration(entityModels, visualModels, activeView);
                        };
                        if (configuration) {
                            loadConfiguration(configuration);
                        }
                    }}
                >
                    📥ws
                </button>
            </div>
            <div className="ml-1">
                <button
                    className="bg-[#c7556f] px-1"
                    title="open auto-saved configuration from local storage"
                    onClick={async () => {
                        const result = await getWorkspaceState();
                        if (!result) {
                            return;
                        }
                        const { packageId, entityModels, visualModels, activeView } = result;
                        useConfiguration(entityModels, visualModels, activeView);
                    }}
                >
                    📥autosave
                </button>
            </div>
            <div className="ml-1">
                <button
                    className="bg-[#c7556f] px-1"
                    title={`autosave: ${autosaveActive ? "active" : "inactive"}, ${
                        autosaveActive ? "stop" : "start"
                    } autosave to local storage`}
                    onClick={() => setAutosaveActive((prev) => !prev)}
                >
                    {autosaveActive ? "🟢" : "🔴"}autosave
                </button>
            </div>
            <div className="ml-1">
                <button
                    className="bg-[#c7556f] px-1"
                    title="generate workspace configuration file"
                    onClick={async () => {
                        const activeView = aggregatorView.getActiveVisualModel()?.getId();
                        const date = Date.now();
                        const workspace = modelsToWorkspaceString(models, visualModels, date, activeView);
                        download(workspace, `dscme-workspace-${date}.json`, "application/json");
                        saveWorkspaceState(models, visualModels, activeView);
                    }}
                >
                    💾ws
                </button>
            </div>
            <div className="ml-1">
                <button
                    className="bg-[#c7556f] px-1"
                    title="generate lightweight ontology"
                    onClick={async () => {
                        const generatedLightweightOwl = await generate(
                            Object.values(aggregatorView.getEntities())
                                .map((aggregatedEntityWrapper) => aggregatedEntityWrapper.aggregatedEntity)
                                .filter(
                                    (
                                        entityOrNull
                                    ): entityOrNull is /* FIXME: jak dostat spravnej typ, tzn SemEntity a ne Entity? */ SemanticModelEntity => {
                                        return entityOrNull != null;
                                    }
                                )
                        );
                        download(generatedLightweightOwl, `dscme-lw-ontology-${getRandomName(8)}.ttl`, "text/plain");
                    }}
                >
                    💾lw-onto
                </button>
            </div>
        </div>
    );
};
