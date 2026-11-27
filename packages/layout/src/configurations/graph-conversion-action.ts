import { Direction } from "../util/utils.ts";
import { ElkForceAlgType, ElkForceConfiguration, ElkLayeredConfiguration, ElkRadialConfiguration, ElkSporeOverlapConfiguration, ElkStressAdvancedUsingClustersConfiguration, ElkStressConfiguration, ElkStressProfileLayoutConfiguration } from "./elk/elk-configurations.ts";
import { Edge } from "../graph/representation/edge.ts";
import { AlgorithmName } from "../layout-algorithms/list-of-layout-algorithms.ts";
import { isUserGivenAlgorithmConfigurationStressWithClusters, UserGivenAlgorithmConfigurationBase } from "./user-algorithm-configurations.ts";

export type AffectedNodesGroupingsType = "ALL" | "GENERALIZATION";

export type EdgeRouting = "ORTHOGONAL" | "SPLINES" | "POLYLINE";

export interface MemoryAllocationControl {
    shouldCreateNewGraph: boolean,
}

export interface GraphConversionActionConfiguration extends MemoryAllocationControl {
    actionName: SpecificGraphConversionActions,
    data: object,
    affectedNodes: AffectedNodesGroupingsType | string[],       // Either grouping or list of individual nodes
}


export type SpecificGraphConversionActions = "CREATE_GENERALIZATION_SUBGRAPHS" | "TREEIFY" | "CLUSTERIFY" | "LAYOUT_CLUSTERS_ACTION" | "RESET_LAYOUT";

export class DefaultGraphConversionActionConfiguration implements GraphConversionActionConfiguration {
    static createSpecificAlgorithmConversionAction(
        name: SpecificGraphConversionActions,
        userGivenAlgorithmConfiguration: UserGivenAlgorithmConfigurationBase | null,
    ): DefaultGraphConversionActionConfiguration {
        switch(name) {
            case "CREATE_GENERALIZATION_SUBGRAPHS":
                return new DefaultGraphConversionActionConfiguration(name, {}, "ALL", false);
            case "TREEIFY":
                return new DefaultGraphConversionActionConfiguration(name, {}, "ALL", false);
            case "CLUSTERIFY":
                return new ClusterifyAction(name, {clusters: null}, "ALL", false);
            case "LAYOUT_CLUSTERS_ACTION":
                if(!isUserGivenAlgorithmConfigurationStressWithClusters(userGivenAlgorithmConfiguration)) {
                    console.error("Using actions for clusters but not using cluster layouting algorithm");
                    return;
                }
                const layoutClustersActionData = {
                    clusterifyAction: null,
                    edgeLength: userGivenAlgorithmConfiguration.stress_edge_len
                };
                return new LayoutClustersAction(name, layoutClustersActionData, "ALL", false);
            case "RESET_LAYOUT":
                return new DefaultGraphConversionActionConfiguration(name, {}, "ALL", false);
            default:
                throw new Error("Forgot to extend createSpecificAlgorithmConversionAction for new conversion")
        }
    }


    constructor(
        actionName: SpecificGraphConversionActions,
        data: object,
        affectedNodes: AffectedNodesGroupingsType | string[],
        shouldCreateNewGraph: boolean
    ) {
        this.actionName = actionName;
        this.data = data;
        this.affectedNodes = affectedNodes;
        this.shouldCreateNewGraph = shouldCreateNewGraph;
    }

    actionName: SpecificGraphConversionActions;
    data: object;
    affectedNodes: AffectedNodesGroupingsType | string[];
    shouldCreateNewGraph: boolean;
}

export class ClusterifyAction extends DefaultGraphConversionActionConfiguration {
    data: Record<"clusters", Record<string, Edge[]> | null> = { clusters: null };
}

export class LayoutClustersAction extends DefaultGraphConversionActionConfiguration {
    constructor(
        actionName: SpecificGraphConversionActions,
        data: LayoutClustersActionDataType,
        affectedNodes: AffectedNodesGroupingsType | string[],
        shouldCreateNewGraph: boolean
    ) {
        super(actionName, data, affectedNodes, shouldCreateNewGraph);
        this.data = data;
    }

    data: LayoutClustersActionDataType = {
        "clusterifyAction": null,
        "edgeLength": 800
    };
}

type LayoutClustersActionDataType = {
    "clusterifyAction": ClusterifyAction | null,
    "edgeLength": number
};
