import { isSemanticModelGeneralization, isSemanticModelRelationship, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { Position, VisualModel } from "@dataspecer/core-v2/visual-model";

import {
	DefaultGraphConversionActionConfiguration,
} from "./configurations/graph-conversion-action.ts";
import { MainGraph, VisualModelWithOutsiders } from "./graph/representation/graph.ts";
import { ConfigurationsContainer } from "./configurations/configurations-container.ts";
import { Entities, Entity, EntityModel } from "@dataspecer/core-v2";
import { ConfigurationFactory, SPECIFIC_ALGORITHM_CONVERSIONS_MAP } from "./configurations/configuration-factories.ts";
import { ReactflowDimensionsEstimator } from "./dimension-estimators/reactflow-dimension-estimator.ts";
import type { LayoutedVisualEntities, VisualEntitiesWithModelVisualInformation } from "./migration-to-cme-v2.ts";
export { type LayoutedVisualEntities } from "./migration-to-cme-v2.ts";
export type { VisualEntitiesWithModelVisualInformation };
import { EdgeCrossingMetric } from "./graph/graph-metrics/implemented-metrics/edge-crossing.ts";
import { EdgeNodeCrossingMetric } from "./graph/graph-metrics/implemented-metrics/edge-node-crossing.ts";


import { Direction } from "./util/utils.ts";
export { Direction };

export { ReactflowDimensionsEstimator };
export { ReactflowDimensionsConstantEstimator } from "./dimension-estimators/constant-dimension-estimator.ts";

import type { EdgeRouting } from "./configurations/graph-conversion-action.ts";
export type { EdgeRouting };

import { placeCoordinateOnGrid, placePositionOnGrid } from "./util/utils.ts";
import { ExplicitAnchors } from "./explicit-anchors.ts";
import { ComputedMetricValues, Metric } from "./graph/graph-metrics/graph-metric.ts";
import { Node } from "./graph/representation/node.ts";
export { type Node };
import { GraphFactory } from "./graph/representation/graph-factory.ts";
import { ALGORITHM_NAME_TO_LAYOUT_MAPPING, AlgorithmName } from "./layout-algorithms/list-of-layout-algorithms.ts";
import { LayoutAlgorithm } from "./layout-algorithms/layout-algorithms-interfaces.ts";
import _ from "lodash";
import { UserGivenAlgorithmConfigurations } from "./configurations/user-algorithm-configurations.ts";
import { DefaultAlgorithmConfiguration } from "./configurations/algorithm-configurations.ts";
import { isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
export type { AlgorithmName };
export { AnchorOverrideSetting } from "./explicit-anchors.ts";
export { placeCoordinateOnGrid, placePositionOnGrid };

export { type ExplicitAnchors } from "./explicit-anchors.ts";
export { type VisualModelWithOutsiders } from "./graph/representation/graph.ts";

export type {
	UserGivenAlgorithmConfigurationBase,
	UserGivenAlgorithmConfigurationElkForce,
	UserGivenAlgorithmConfigurationExtraAlgorithmsToRunAfter,
	UserGivenAlgorithmConfigurationLayered,
	UserGivenAlgorithmConfigurationStress,
	UserGivenAlgorithmConfigurations,
	UserGivenAlgorithmConfigurationsMap,
	UserGivenAlgorithmConfigurationOverlapRemoval,
	UserGivenAlgorithmConfigurationStressProfile,
	UserGivenAlgorithmConfigurationStressWithClusters,
	UserGivenAlgorithmConfigurationRadial,
	UserGivenAlgorithmConfigurationRandom,
} from "./configurations/user-algorithm-configurations.ts";

export  {
	getDefaultUserGivenAlgorithmConfigurationsFull,
	isUserGivenAlgorithmConfigurationStressProfile,
} from "./configurations/user-algorithm-configurations.ts";

export { type ElkForceAlgType } from "./configurations/elk/elk-configurations.ts";

export * from "./layout-configuration-model.ts";

/**
 * The object (class) implementing this interface handles the act of getting width and height of given node. The act has to be separated from the reactflow visualization library,
 * because either the library may be switched for some other (highly unlikely from my point of view), but more importantly the layouting may be performed outside the diagram/editor.
 * component, so there has to be other way(s) to get the width and height of nodes needed for layouting.
 * For such case the implemented variants are (so far) {@link ReactflowDimensionsEstimator} and {@link ReactflowDimensionsConstantEstimator}.
 */
export interface NodeDimensionQueryHandler {
	getWidth(node: Node);
	getHeight(node: Node);
}

export type XY = Omit<Position, "anchored">;

// Just writing again, what is already written in README, so check README and if you don't understand
// this low level explanation may help

// The layout works like this. The layout package gets configuration from user, usually inserted through dialog.
// This configuration is converted to different set of configurations, this looked like over-engineering at first, but actually after working with it a bit, while
// programming my own algorithm, it is quite flexible.
// There are different set of configurations:
// 1) Actions which should be performed before we start the layouting. Meaning layouting in sense that we enter the loop which runs the algorithm 1 or more times to find the best layout.
// 2) Then actions which should be performed in the loop (For example run random layout, followed by stress layout, followed by layered algorithm)
// The actions in 1) and 2) are either GraphConversionActionConfigurations or AlgorithmConfiguration, depending on the type of action


/**
 * Contains the visual entities (that is entities present in visual model). Those contain also the relevant edges
 *
 * And outsiders - which represent classes or class profiles, which are not in the visual model.
 * We don't pass the edges (relationships, generalizations, ...) to outsiders, since we expect
 * that we want to have all edges connected to those class/class profiles inside the layouting graph.
 */
export type VisualEntitiesWithOutsiders = {
	visualEntities: string[],
	outsiders: Record<string, XY | null>;
};


/**
 * Layout given visual entities.
 * @param visualModel The visual model the entities are part ofperform layout on.
 * @param semanticModels map of the semantic models
 * @param entitiesToLayout the entities to be layouted
 * @param config the layout configuration
 * @param nodeDimensionQueryHandler optional parameter to estimate dimensions of nodes for the layouting
 * @param explicitAnchors If this is undefined then use the anchors of visual model, otherwise it depends on the given anchors' settings.
 * @returns Promise with new positions of the visual entities.
 */
export async function performLayout(
	visualModel: VisualModel,
	semanticModels: Map<string, EntityModel>,
	entitiesToLayout: VisualEntitiesWithOutsiders,
	config: UserGivenAlgorithmConfigurations,
	nodeDimensionQueryHandler?: NodeDimensionQueryHandler,
	explicitAnchors?: ExplicitAnchors
): Promise<LayoutedVisualEntities> {
	const visualEntitiesPromise = performLayoutInternal(visualModel, semanticModels, entitiesToLayout, config, nodeDimensionQueryHandler, explicitAnchors);
	return visualEntitiesPromise;
}


// TODO: Maybe just return VisualEntities - so without the information about entity being an outsider
//                  On one side, I have the info in nice format so why shouldn't I give it out
//                  On other side, the caller should know about the outsiders, and the API - especially here should be probably minimal
/**
 * Layout given visual model.
 * @param visualModel The visual model to perform layout on.
 * @param semanticModels
 * @param config
 * @param nodeDimensionQueryHandler
 * @param explicitAnchors If this is undefined then use the anchors of visual model, otherwise it depends on the given anchors' settings.
 * @returns Promise with new positions of the visual entities.
 */
export async function performLayoutOfVisualModel(
	visualModel: VisualModelWithOutsiders,
	semanticModels: Map<string, EntityModel>,
	config: UserGivenAlgorithmConfigurations,
	nodeDimensionQueryHandler?: NodeDimensionQueryHandler,
	explicitAnchors?: ExplicitAnchors
): Promise<LayoutedVisualEntities> {
	const entitiesToLayout: VisualEntitiesWithOutsiders = {
		visualEntities: [...visualModel.visualModel.getVisualEntities().keys()],
		outsiders: visualModel.outsiders
	};

	const visualEntitiesPromise = performLayoutInternal(visualModel.visualModel, semanticModels, entitiesToLayout, config, nodeDimensionQueryHandler, explicitAnchors);
	return visualEntitiesPromise;
}


/**
 * Layout given semantic model.
 */
export async function performLayoutOfSemanticModel(
	inputSemanticModel: Record<string, SemanticModelEntity>,
	semanticModelId: string,
	config: UserGivenAlgorithmConfigurations,
	nodeDimensionQueryHandler?: NodeDimensionQueryHandler
): Promise<LayoutedVisualEntities> {
	// If we want to layout more than one, then just change the arguments and fill the semanticModels variable in loop.

	const entityModelUsedForConversion: EntityModel = {
		getEntities: function (): Entities {
			return inputSemanticModel;
		},
		subscribeToChanges: function (callback: (updated: Record<string, Entity>, removed: string[]) => void): () => void {
			throw new Error("Function not implemented.");
		},
		getId: function (): string {
			throw new Error("Function not implemented.");
		},
		getAlias: function (): string | null {
			throw new Error("Function not implemented.");
		},
		setAlias: function (alias: string | null): void {
			throw new Error("Function not implemented.");
		}
	};
	const semanticModels: Map<string, EntityModel> = new Map();
	semanticModels.set(semanticModelId, entityModelUsedForConversion);

	const semanticModelEntities = [...semanticModels.values()][0].getEntities();

	const outsiders: Record<string, XY | null> = {};
	Object.keys(semanticModelEntities)
		.filter(entity => !isPossibleEdge(semanticModelEntities[entity]))
		.forEach(identifier => {
			outsiders[identifier] = null;
		});
	const entitiesToLayout: VisualEntitiesWithOutsiders = {
		visualEntities: [],
		outsiders,
	};

	const visualEntitiesPromise = performLayoutInternal(null, semanticModels, entitiesToLayout, config, nodeDimensionQueryHandler);
	return visualEntitiesPromise;
}

const isPossibleEdge = (entity: Entity) => {
	return isSemanticModelRelationship(entity) ||
					isSemanticModelRelationshipProfile(entity) ||
					isSemanticModelGeneralization(entity);
}


function performLayoutInternal(
	visualModel: VisualModel,
	semanticModels: Map<string, EntityModel>,
	entitiesToLayout: VisualEntitiesWithOutsiders,
	config: UserGivenAlgorithmConfigurations,
	nodeDimensionQueryHandler?: NodeDimensionQueryHandler,
	explicitAnchors?: ExplicitAnchors
): Promise<LayoutedVisualEntities> {
	const graph = GraphFactory.createMainGraph(null, semanticModels, visualModel, entitiesToLayout, nodeDimensionQueryHandler, explicitAnchors);
	const visualEntitiesPromise = performLayoutFromGraph(graph, config).then(async (resultAggregations) => {
		const resultingGraph = await getBestLayoutFromMetricResultAggregation(resultAggregations);
		return resultingGraph.convertWholeGraphToDataspecerRepresentation();
	});

	if(visualEntitiesPromise == undefined) {
		console.error("LAYOUT FAILED")
		throw new Error("Layout Failed");
	}


	return visualEntitiesPromise;
}


/**
 * Layout given graph based on given layout configuration
 */
export async function performLayoutFromGraph(
	graph: MainGraph,
	config: UserGivenAlgorithmConfigurations
): Promise<Record<string, MetricResultsAggregation>> {
	const configurations = ConfigurationFactory.createConfigurationsContainer(config);
	const resultingAggregationsPromise = performLayoutingBasedOnConfigurations(graph, configurations);
	return resultingAggregationsPromise;
}


/**
 * Performs all relevant layout operations based on given configurations
 */
const performLayoutingBasedOnConfigurations = async (
	graph: MainGraph,
	configurations: ConfigurationsContainer
): Promise<Record<string, MetricResultsAggregation>> => {
	let workGraph = graph;
	for(const action of configurations.layoutActionsIteratorBefore) {
		if (action.shouldCreateNewGraph) {
			workGraph = _.cloneDeep(workGraph);
	 	}

		if(action instanceof DefaultGraphConversionActionConfiguration) {
			SPECIFIC_ALGORITHM_CONVERSIONS_MAP[action.actionName](action, workGraph);
		}
		else if(action instanceof DefaultAlgorithmConfiguration) {
			const layoutAlgorithm: LayoutAlgorithm = ALGORITHM_NAME_TO_LAYOUT_MAPPING[action.algorithmName];
			if(action.algorithmPhasesToCall === "ONLY-PREPARE" || action.algorithmPhasesToCall === "PREPARE-AND-RUN") {
				layoutAlgorithm.prepareFromGraph(workGraph, configurations);
			}
			if(action.algorithmPhasesToCall === "ONLY-RUN" || action.algorithmPhasesToCall === "PREPARE-AND-RUN") {
				if(action.affectedNodes === "GENERALIZATION") {
					workGraph = await layoutAlgorithm.runGeneralizationLayout();
				}
				else {
					workGraph = await layoutAlgorithm.run();
				}
			}
		}
	}

	return runMainLayoutAlgorithm(workGraph, configurations).then(aggregationResult => {
		return aggregationResult;
	});

}

/**
 * Run the main layouting algorithm for the given graph. The algorithm is ran multiple times based on settings.
 * The algorithm is set of steps, it isn't just call of one method, the set of steps depends on the implementation of algorithm.
 * The steps can be for example - run stress algorithm, after that run node overlap removal algorithm.
 */
const runMainLayoutAlgorithm = async (
	graph: MainGraph,
	configurations: ConfigurationsContainer
): Promise<Record<string, MetricResultsAggregation>> => {
	const metricsWithWeights: MetricWithWeight[] = [
		{
			name: "EdgeCrossingMetric",
			metric: new EdgeCrossingMetric(),
			weight: 1
		},
		// {
		// 	name: "EdgeCrossingAngleMetric",
		// 	metric: new EdgeCrossingAngleMetric(),
		// 	weight: 0
		// },
		{
			name: "EdgeNodeCrossingMetric",
			metric: new EdgeNodeCrossingMetric(),
			weight: 20
		},
		// {
		// 	name: "AreaMetric",
		// 	metric: new AreaMetric(),
		// 	weight: 0
		// },
		// {
		// 	name: "NodeOrthogonalityMetric",
		// 	metric: new NodeOrthogonalityMetric(),
		// 	weight: 0.0
		// },
	];
	const computedMetricsData = createObjectsToHoldMetricsData(metricsWithWeights);
	const numberOfAlgorithmRuns = configurations.numberOfAlgorithmRuns;


	for(let i = 0; i < numberOfAlgorithmRuns; i++) {
		let workGraph = graph;
		let layoutedGraphPromise: Promise<MainGraph>;
		for(const action of configurations.layoutActionsIterator) {
			if (action.shouldCreateNewGraph) {
 				workGraph = _.cloneDeep(workGraph);
			}
			if(action instanceof DefaultGraphConversionActionConfiguration) {
				layoutedGraphPromise = SPECIFIC_ALGORITHM_CONVERSIONS_MAP[action.actionName](action, workGraph);
				workGraph = await layoutedGraphPromise;
			}
			else if(action instanceof DefaultAlgorithmConfiguration) {
				const layoutAlgorithm: LayoutAlgorithm = ALGORITHM_NAME_TO_LAYOUT_MAPPING[action.algorithmName];
				if(action.algorithmPhasesToCall === "ONLY-PREPARE" || action.algorithmPhasesToCall === "PREPARE-AND-RUN") {
					layoutAlgorithm.prepareFromGraph(workGraph, configurations);
				}
				if(action.algorithmPhasesToCall === "ONLY-RUN" || action.algorithmPhasesToCall === "PREPARE-AND-RUN") {
					if(action.affectedNodes === "ALL") {
						layoutedGraphPromise = layoutAlgorithm.run();
						workGraph = await layoutedGraphPromise;
					}
					else if(action.affectedNodes === "GENERALIZATION") {
						layoutedGraphPromise = layoutAlgorithm.runGeneralizationLayout();
						workGraph = await layoutedGraphPromise;
					}
				}
			}
		}

		performMetricsComputation(
			metricsWithWeights, computedMetricsData.metricResults,
			computedMetricsData.metricResultAggregations,
			workGraph, layoutedGraphPromise);
		configurations.resetLayoutActionsIterator();
	}

	for(const key of Object.keys(computedMetricsData.metricResultAggregations)) {
		computedMetricsData.metricResultAggregations[key].avg.absoluteValue /= numberOfAlgorithmRuns;
		computedMetricsData.metricResultAggregations[key].avg.relativeValue /= numberOfAlgorithmRuns;
	}

	// TODO RadStr DEBUG: Just for debug - I am keeping it here for future
	// console.log("Metrics aggregations result: ", computedMetricsData.metricResultAggregations);
	// console.log("Metrics all results: ", computedMetricsData.metricResults);
	// console.log(await computedMetricsData.metricResultAggregations["total"].max.graphPromise);
	return computedMetricsData.metricResultAggregations;
}

type MetricWithWeight = {
	name: string,
	metric: Metric,
	weight: number
}

type MetricResultsAggregation = {
	avg: ComputedMetricValues,
	min: MetricWithGraphPromise | null,
	max: MetricWithGraphPromise | null,
}

type MetricWithGraphPromise = {
	value: ComputedMetricValues,
	graphPromise: Promise<MainGraph>
}

function createMetricMinDefault(): MetricWithGraphPromise {
	return {
		value: {
			absoluteValue: 100000000,
			relativeValue: 100000000
		},
		graphPromise: null
	};
}

function createMetricMaxDefault(): MetricWithGraphPromise {
	return {
		value: {
			absoluteValue: -100000000,
			relativeValue: -100000000
		},
		graphPromise: null
	};
}

function createObjectsToHoldMetricsData(metrics: MetricWithWeight[]) {
	const metricResultAggregations: Record<string, MetricResultsAggregation> = {};
	metrics
		.forEach(metric => metricResultAggregations[metric.name] = {
			avg: { absoluteValue: 0, relativeValue: 0 },
			min: createMetricMinDefault(),
			max: createMetricMaxDefault(),
		});
		metricResultAggregations["total"] = {
			avg: { absoluteValue: 0, relativeValue: 0 },
			min: createMetricMinDefault(),
			max: createMetricMaxDefault(),
		};

	const metricResults: Record<string, ComputedMetricValues[]> = {};
	metrics.forEach(metric => metricResults[metric.name] = []);
	metricResults["total"] = [];

		return {
			metricResultAggregations,
			metricResults
		};
}

export function getBestLayoutFromMetricResultAggregation(
	metricResultAggregations: Record<string, MetricResultsAggregation>
): Promise<MainGraph> {
	// TODO Hard to solve by myself - Radstr: If we want to use relative metric - use max instead of min
	const resultingGraph = metricResultAggregations["total"].min.graphPromise;
	return resultingGraph;
}

export function getBestMetricResultAggregation(
	metricResultAggregations: Record<string, MetricResultsAggregation>
): MetricWithGraphPromise {
	// TODO Hard to solve by myself - Radstr: If we want to use relative metric - use max instead of min
	const best = metricResultAggregations["total"].min;
	return best;
}

function performMetricsComputation(
	metricsToCompute: MetricWithWeight[],
	computedMetricsFromPreviousIterations: Record<string, ComputedMetricValues[]>,
	metricResultsAggregation: Record<string, MetricResultsAggregation>,
	graph: MainGraph,
	layoutedGraphPromise: Promise<MainGraph>,
) {
	const computedMetrics: ComputedMetricValues[] = [];
	for(const metricToCompute of metricsToCompute) {
		const computedMetric = metricToCompute.metric.computeMetric(graph);
		computedMetricsFromPreviousIterations[metricToCompute.name].push(computedMetric);
		computedMetrics.push(computedMetric);

		setMetricResultsAggregation(metricResultsAggregation, metricToCompute.name, computedMetric, layoutedGraphPromise);
	}

	const total: ComputedMetricValues = {
		absoluteValue: 0,
		relativeValue: 0
	}
	for(let i = 0; i < computedMetrics.length; i++) {
		total.absoluteValue += metricsToCompute[i].weight * computedMetrics[i].absoluteValue;
		total.relativeValue += metricsToCompute[i].weight * computedMetrics[i].relativeValue;
	}

	computedMetricsFromPreviousIterations["total"].push(total);
	setMetricResultsAggregation(metricResultsAggregation, "total", total, layoutedGraphPromise);
}

function setMetricResultsAggregation(
	metricResultsAggregation: Record<string, MetricResultsAggregation>,
	key: string,
	computedMetric: ComputedMetricValues,
	layoutedGraphPromise: Promise<MainGraph>,
) {
	metricResultsAggregation[key].avg.absoluteValue += computedMetric.absoluteValue;
	metricResultsAggregation[key].avg.relativeValue += computedMetric.relativeValue;
	// TODO Hard to solve by myself - Radstr: use relative values for metrics - possible future improvement
	//       Ideally we would work with the relativeValue (that is values in range [0, 1]),
	//       but to find the right normalization and weights for that is highly non-trivial task
	if(metricResultsAggregation[key].min.value.absoluteValue > computedMetric.absoluteValue) {
		metricResultsAggregation[key].min = {
			value: computedMetric,
			graphPromise: layoutedGraphPromise
		};
	}
	// TODO Hard to solve by myself - Radstr: again relative metric
	if(metricResultsAggregation[key].max.value.absoluteValue < computedMetric.absoluteValue) {
		metricResultsAggregation[key].max = {
			value: computedMetric,
			graphPromise: layoutedGraphPromise
		};
	}
}
