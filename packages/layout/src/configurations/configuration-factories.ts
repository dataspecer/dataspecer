import { VisualProfileRelationship, VisualRelationship } from "@dataspecer/visual-model";
import { getBestLayoutFromMetricResultAggregation, performLayoutFromGraph, XY } from "../index.ts";
import { GraphAlgorithms, ToConsiderFilter } from "../graph-algoritms.ts";
import { MainGraph } from "../graph/representation/graph.ts";
import { Direction } from "../util/utils.ts";
import { ConfigurationsContainer } from "./configurations-container.ts";
import {
    DefaultGraphConversionActionConfiguration,
    ClusterifyAction,
    LayoutClustersAction,
    SpecificGraphConversionActions,
    AffectedNodesGroupingsType,
    GraphConversionActionConfiguration,
} from "./graph-conversion-action.ts";
import {
    ElkForceConfiguration,
    ElkLayeredConfiguration,
    ElkRadialConfiguration,
    ElkSporeOverlapConfiguration,
    ElkStressAdvancedUsingClustersConfiguration,
    ElkStressConfiguration,
    ElkStressProfileLayoutConfiguration
} from "./elk/elk-configurations.ts";
import { getDefaultUserGivenAlgorithmConfigurationsFull, isUserGivenAlgorithmConfigurationInterface, UserGivenAlgorithmConfigurationBase, UserGivenAlgorithmConfigurationRandom, UserGivenAlgorithmConfigurations, UserGivenAlgorithmConfigurationStress } from "./user-algorithm-configurations.ts";
import { AlgorithmConfiguration, AlgorithmPhases, AutomaticConfiguration, RandomConfiguration } from "./algorithm-configurations.ts";


function getOverlapConfigurationToRunAfterMainAlgorithm(
    affectedNodes: AffectedNodesGroupingsType,
    minSpaceBetweenNodes: number | null
) {
    const input = ElkSporeOverlapConfiguration.getDefaultUserConfiguration();
    input.min_distance_between_nodes = minSpaceBetweenNodes ?? 50;
    return new ElkSporeOverlapConfiguration(input, affectedNodes, true);
}


/**
 * This factory class takes care of creating configruations based on given user configuration
 */
class AlgorithmConfigurationFactory {

    private static getRandomLayoutConfiguration(
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ): RandomConfiguration {
        const randomConfig: UserGivenAlgorithmConfigurationRandom = {
            layout_alg: "random",
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: false,
            interactive: false
        };
        return new RandomConfiguration(randomConfig, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
    }

    static addAlgorithmConfigurationLayoutActions(
        userGivenAlgorithmConfiguration: UserGivenAlgorithmConfigurationBase,
        layoutActionsBeforeMainRun: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[] | null,
        layoutActionsToSet: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[],
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean
    ): void {
        const isConfigurationCorrectlyTyped = isUserGivenAlgorithmConfigurationInterface(userGivenAlgorithmConfiguration);
        if(isConfigurationCorrectlyTyped === false) {
            return;
        }

        switch(userGivenAlgorithmConfiguration.layout_alg) {
            case "elk_stress":
                const elkStress = new ElkStressConfiguration(
                    userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph);
                if(userGivenAlgorithmConfiguration.number_of_new_algorithm_runs > 1) {
                    layoutActionsToSet.push(AlgorithmConfigurationFactory.getRandomLayoutConfiguration(affectedNodes, true));
                    elkStress.addAlgorithmConfiguration("interactive", "true");
                }
                layoutActionsToSet.push(elkStress);
                break;
            case "elk_stress_profile":
                const elkStressProfile = new ElkStressProfileLayoutConfiguration(
                    userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph);
                if(userGivenAlgorithmConfiguration.number_of_new_algorithm_runs > 1) {
                    layoutActionsToSet.push(AlgorithmConfigurationFactory.getRandomLayoutConfiguration(affectedNodes, true));
                    elkStressProfile.addAlgorithmConfiguration("interactive", "true");
                }
                layoutActionsToSet.push(elkStressProfile);
                break;
            case "elk_layered":
                layoutActionsToSet.push(new ElkLayeredConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph));
                break;
            case "elk_force":
                if(userGivenAlgorithmConfiguration.number_of_new_algorithm_runs > 1) {
                    layoutActionsToSet.push(new ElkForceConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph, "ONLY-RUN"));
                }
                else {
                    layoutActionsToSet.push(new ElkForceConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph));
                }
                break;
            case "random":
                layoutActionsToSet.push(AlgorithmConfigurationFactory.getRandomLayoutConfiguration(affectedNodes, shouldCreateNewGraph));
                break;
            case "elk_radial":
                layoutActionsToSet.push(DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction("RESET_LAYOUT", null));
                layoutActionsToSet.push(DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction("TREEIFY", null));
                layoutActionsToSet.push(new ElkRadialConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph));
                break;
            case "elk_overlapRemoval":
                layoutActionsToSet.push(new ElkSporeOverlapConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph));
                break;
            case "elk_stress_advanced_using_clusters":
                const elkStressUsingClusters = new ElkStressAdvancedUsingClustersConfiguration(userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph);
                layoutActionsToSet.push(AlgorithmConfigurationFactory.getRandomLayoutConfiguration(affectedNodes, true));
                elkStressUsingClusters.addAlgorithmConfiguration("interactive", "true");
                layoutActionsToSet.push(elkStressUsingClusters);
                const layoutClustersAction = DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction(
                    "LAYOUT_CLUSTERS_ACTION", userGivenAlgorithmConfiguration);
                const clusterifyAction = layoutActionsBeforeMainRun
                    .find(action => (action as GraphConversionActionConfiguration)?.actionName === "CLUSTERIFY");
                if(clusterifyAction === undefined) {
                    throw new Error("Missing CLUSTERIFY");
                }
                (layoutClustersAction as LayoutClustersAction).data.clusterifyAction = clusterifyAction as ClusterifyAction;
                layoutActionsToSet.push(layoutClustersAction);
                layoutActionsToSet.push(DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction("RESET_LAYOUT", null));
                break;
            case "none":
                console.info("The chosen algorithm is none");
                const noActionLayout = this.getRandomLayoutConfiguration(affectedNodes, true);
                noActionLayout.algorithmName = "none";
                layoutActionsToSet.push(noActionLayout);
                break;
            case "automatic":
                console.info("The chosen algorithm is automatic");
                const automaticConfiguration = new AutomaticConfiguration(
                    userGivenAlgorithmConfiguration, affectedNodes, shouldCreateNewGraph);
                layoutActionsToSet.push(automaticConfiguration);
                break;
            default:
                throw new Error("Implementation error You forgot to extend the AlgorithmConfigurationFactory factory for new algorithm");
        }

        if(userGivenAlgorithmConfiguration.run_node_overlap_removal_after) {
            // Just use the deafult small value, I think that it behaves better.
            // Even though the results are "nicer" if we set it the edge length of the physical based algorithm (stress)
            // The nodes are too far from each other, so we lose the compactness and there is no way for us to get it,
            // if we use the length instead of some small default value.
            layoutActionsToSet.push(getOverlapConfigurationToRunAfterMainAlgorithm(affectedNodes, null));
        }

        if(userGivenAlgorithmConfiguration.run_layered_after) {
            const configLayeredAfter = getDefaultUserGivenAlgorithmConfigurationsFull();
            configLayeredAfter.chosenMainAlgorithm = "elk_layered";
            configLayeredAfter.main.elk_layered.interactive = true;
            AlgorithmConfigurationFactory.addAlgorithmConfigurationLayoutActions(
                configLayeredAfter.main.elk_layered, layoutActionsBeforeMainRun, layoutActionsToSet, affectedNodes, false);
        }
    }

    static addToLayoutActionsInPreMainRunBasedOnConfiguration(
        config: UserGivenAlgorithmConfigurations,
        layoutActionsBeforeMainRun: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[],
    ): void {
        if(config.chosenGeneralAlgorithm === "elk_layered") {
            const convertGeneralizationSubgraphs = DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction("CREATE_GENERALIZATION_SUBGRAPHS", null);
            layoutActionsBeforeMainRun.push(convertGeneralizationSubgraphs);
            AlgorithmConfigurationFactory.addAlgorithmConfigurationLayoutActions(
                config.general.elk_layered, layoutActionsBeforeMainRun, layoutActionsBeforeMainRun, "GENERALIZATION", true);
        }

        switch(config.chosenMainAlgorithm) {
            case "elk_stress":
                break;
            case "elk_stress_profile":
                break;
            case "elk_layered":
                break;
            case "elk_force":
                layoutActionsBeforeMainRun.push(new ElkForceConfiguration(config.main[config.chosenMainAlgorithm], "ALL", true, "ONLY-PREPARE"));
                break;
            case "random":
                break;
            case "elk_radial":
                break;
            case "elk_overlapRemoval":
                break;
            case "elk_stress_advanced_using_clusters":
                layoutActionsBeforeMainRun.push(DefaultGraphConversionActionConfiguration.createSpecificAlgorithmConversionAction("CLUSTERIFY", null));
                break;
            case "automatic":
                break;
            case "none":
                break;
            default:
                throw new Error("Implementation error You forgot to extend the AlgorithmConfigurationFactory factory for new algorithm");
        }
    }

    static addToLayoutActionsInMainRunBasedOnConfiguration(
        config: UserGivenAlgorithmConfigurations,
        layoutActionsBeforeMainRun: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[],
        layoutActions: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[],
    ): void {
        AlgorithmConfigurationFactory.addAlgorithmConfigurationLayoutActions(
            config.main[config.chosenMainAlgorithm], layoutActionsBeforeMainRun, layoutActions, "ALL", false);
    }
}

/**
 * Class with static methods to create {@link ConfigurationsContainer}s
 */
export class ConfigurationFactory {
    /**
     *
     * @param userGivenConfigurations
     * @returns {@link ConfigurationsContainer} for the whole graph based on given {@link userGivenConfigurations}.
     */
    static createConfigurationsContainer(
        userGivenConfigurations: UserGivenAlgorithmConfigurations,
    ): ConfigurationsContainer {
        const layoutActionsBeforeMainRun: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[] = [];
        const layoutActions: (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> | GraphConversionActionConfiguration)[] = [];

        AlgorithmConfigurationFactory.addToLayoutActionsInPreMainRunBasedOnConfiguration(
            userGivenConfigurations, layoutActionsBeforeMainRun);

        if((userGivenConfigurations.main[userGivenConfigurations.chosenMainAlgorithm].interactive === true || userGivenConfigurations.chosenGeneralAlgorithm === "elk_layered") &&
           userGivenConfigurations.chosenMainAlgorithm !== "elk_stress_advanced_using_clusters") {
            if((userGivenConfigurations.main[userGivenConfigurations.chosenMainAlgorithm] as any).number_of_new_algorithm_runs !== undefined) {
               (userGivenConfigurations.main[userGivenConfigurations.chosenMainAlgorithm] as any).number_of_new_algorithm_runs = 1;
            }
        }

        AlgorithmConfigurationFactory.addToLayoutActionsInMainRunBasedOnConfiguration(userGivenConfigurations, layoutActionsBeforeMainRun, layoutActions);

        const configurationsContainer = new ConfigurationsContainer(
            layoutActionsBeforeMainRun, layoutActions, (userGivenConfigurations.main[userGivenConfigurations.chosenMainAlgorithm] as any).number_of_new_algorithm_runs ?? 1);

        return configurationsContainer
    }
}




export type SpecificGraphConversionMethod = (graphConversionConfiguration: DefaultGraphConversionActionConfiguration, graph: MainGraph) => Promise<MainGraph>;

export const SPECIFIC_ALGORITHM_CONVERSIONS_MAP: Record<SpecificGraphConversionActions, SpecificGraphConversionMethod> = {
    CREATE_GENERALIZATION_SUBGRAPHS: async (
        graphConversionConfiguration: DefaultGraphConversionActionConfiguration,
        graph: MainGraph
    ): Promise<MainGraph> => {
        graph.createGeneralizationSubgraphs();
        return Promise.resolve(graph);
    },
    TREEIFY: async (
        graphConversionConfiguration: DefaultGraphConversionActionConfiguration,
        graph: MainGraph
    ): Promise<MainGraph> => {
        GraphAlgorithms.treeify(graph);
        return Promise.resolve(graph);
    },
    CLUSTERIFY: async (
        graphConversionConfiguration: ClusterifyAction,
        graph: MainGraph
    ): Promise<MainGraph> => {
        const clusteredEdges = GraphAlgorithms.clusterifyAdvanced(graph, null);
        graphConversionConfiguration.data.clusters = clusteredEdges;
        return Promise.resolve(graph);
    },
    LAYOUT_CLUSTERS_ACTION: async (
        graphConversionConfiguration: LayoutClustersAction,
        graph: MainGraph
    ): Promise<MainGraph> => {
        const visualEdgesWithWaypoints: (VisualRelationship | VisualProfileRelationship)[] = [];
        const clusterPositionsWhenLayoutingLayered: Record<string, XY> = {};

        for (const [cluster, edgesInCluster] of Object.entries(graphConversionConfiguration.data.clusterifyAction.data.clusters)) {
            for (const node of graph.getAllNodesInMainGraph()) {
                const isInCluster = edgesInCluster
                    .find(edge => edge.start.id === node.id || edge.end.id === node.id) !== undefined;
                if (isInCluster) {
                    node.isConsideredInLayout = true;
                }
                else {
                    node.isConsideredInLayout = false;
                }
            }

            for(const edge of graph.getAllEdgesInMainGraph()) {
                edge.isConsideredInLayout = false;
            }

            const edgesInClusterCurrentVersion = edgesInCluster.map(edge => graph.findEdgeInAllEdges(edge.id)).filter(edge => edge !== null);
            for(const edgeInCluster of edgesInClusterCurrentVersion) {
                edgeInCluster.isConsideredInLayout = true;
            }
            GraphAlgorithms.pointAllEdgesFromRoot(cluster, edgesInClusterCurrentVersion);

            const clusterRoot = graph.findNodeInAllNodes(cluster);
            const clusterRootPositionBeforeLayout = { ...clusterRoot.completeVisualNode.coreVisualNode.position };
            const sectorPopulations = GraphAlgorithms.findSectorNodePopulation(graph, clusterRoot, edgesInCluster, ToConsiderFilter.OnlyNotLayouted);
            const sectorPopulationsEdges = GraphAlgorithms.findSectorEdgePopulation(graph, clusterRoot, edgesInCluster, ToConsiderFilter.OnlyNotLayouted);
            Object.entries(sectorPopulationsEdges).forEach(([sector, population]) => {
                sectorPopulations[sector as Direction] += population;
            });
            const populatedSectorsAscending = Object.entries(sectorPopulations)
                .sort(([, edgesA], [, edgesB]) => edgesA - edgesB);

            let leastPopulatedSector = populatedSectorsAscending[0][0];
            // It is better to choose vertical direction if the populations are the same
            if((populatedSectorsAscending[1][0] === "UP" || populatedSectorsAscending[1][0] === "DOWN") &&
                (populatedSectorsAscending[0][0] === "LEFT" || populatedSectorsAscending[0][0] === "RIGHT") &&
                populatedSectorsAscending[0][1] === populatedSectorsAscending[1][1]) {
                leastPopulatedSector = populatedSectorsAscending[1][0];
            }

            const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
            configuration.main.elk_layered.alg_direction = leastPopulatedSector as Direction;
            configuration.main.elk_layered.in_layer_gap = 50;
            if(leastPopulatedSector === "UP" || leastPopulatedSector === "DOWN") {
                configuration.main.elk_layered.layer_gap = 80;
            }
            else {
                configuration.main.elk_layered.layer_gap = 120;
            }
            configuration.main.elk_layered.edge_routing = "ORTHOGONAL";
            graph = await getBestLayoutFromMetricResultAggregation(await performLayoutFromGraph(graph, configuration));

            const clusterRootAfterLayout = graph.findNodeInAllNodes(clusterRoot.id);
            const clusterRoorPositionAfterLayout = clusterRootAfterLayout.completeVisualNode.coreVisualNode.position;
            const positionShift = {
                x: clusterRoorPositionAfterLayout.x - clusterRootPositionBeforeLayout.x,
                y: clusterRoorPositionAfterLayout.y - clusterRootPositionBeforeLayout.y,
            };
            for (const node of graph.getAllNodesInMainGraph()) {
                if (node.isConsideredInLayout) {
                    const nodePosition = node.completeVisualNode.coreVisualNode.position;
                    nodePosition.x -= positionShift.x;
                    nodePosition.y -= positionShift.y;
                }
            }
            for (const edge of graph.getAllEdgesInMainGraph()) {
                if (edge.isConsideredInLayout) {
                    for (const waypoint of edge.visualEdge.visualEdge.waypoints) {
                        waypoint.x -= positionShift.x;
                        waypoint.y -= positionShift.y;
                    }

                    visualEdgesWithWaypoints.push({...edge.visualEdge.visualEdge});
                }
            }

            clusterPositionsWhenLayoutingLayered[clusterRoot.id] = clusterRoorPositionAfterLayout;
        }

        graph.resetForNewLayout();
        for (const [cluster, edgesInCluster] of Object.entries(graphConversionConfiguration.data.clusterifyAction.data.clusters)) {
            // Anchor clusters ... alternative solution is to layout subgraphs, but elk doesn't like that
            // (the results are really bad, but maybe that was issue on my side)
            for (const node of graph.getAllNodesInMainGraph()) {
                const isInCluster = node.id === cluster || edgesInCluster
                    .find(edge => edge.start.id === node.id || edge.end.id === node.id) !== undefined;
                if (isInCluster) {
                    node.completeVisualNode.isAnchored = true;
                }
            }
        }

        const configuration = getDefaultUserGivenAlgorithmConfigurationsFull();
        configuration.chosenMainAlgorithm = "elk_stress";
        configuration.main.elk_stress.interactive = true;
        configuration.main.elk_stress.run_node_overlap_removal_after = true;
        configuration.main.elk_stress.stress_edge_len = graphConversionConfiguration.data.edgeLength;
        graph = await getBestLayoutFromMetricResultAggregation(await performLayoutFromGraph(graph, configuration));


        // Keep the orthogonal layout of edges for clusters
        for (const [clusterRoot, clusterRootPositionBefore] of Object.entries(clusterPositionsWhenLayoutingLayered)) {
            const clusterRootPositionCurrent = graph.findNodeInAllNodes(clusterRoot).completeVisualNode.coreVisualNode.position;
            const positionShift = {
                x: clusterRootPositionCurrent.x - clusterRootPositionBefore.x,
                y: clusterRootPositionCurrent.y - clusterRootPositionBefore.y
            };
            const edgesInCluster = graphConversionConfiguration.data.clusterifyAction.data.clusters[clusterRoot];
            for(const edgeInCluster of edgesInCluster) {
                const edgeInCurrentGraph = graph.findEdgeInAllEdges(edgeInCluster.id);
                const layoutedEdge = visualEdgesWithWaypoints.find(e => e.identifier === edgeInCluster.id);
                if(layoutedEdge === undefined || edgeInCurrentGraph === undefined) {
                    continue;
                }
                for (const waypoint of layoutedEdge.waypoints) {
                    waypoint.x += positionShift.x;
                    waypoint.y += positionShift.y;
                }

                edgeInCurrentGraph.visualEdge.visualEdge = layoutedEdge;
            }
        }

        return Promise.resolve(graph);
    },
    RESET_LAYOUT: function (_graphConversionConfiguration: DefaultGraphConversionActionConfiguration, graph: MainGraph): Promise<MainGraph> {
        graph.mainGraph.resetForNewLayout();
        return Promise.resolve(graph);
    }
}
