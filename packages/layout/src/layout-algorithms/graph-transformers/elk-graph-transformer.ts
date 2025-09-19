import { isVisualDiagramNode, isVisualProfileRelationship, isVisualRelationship, Position, VisualNode, VisualProfileRelationship, VisualRelationship } from "@dataspecer/visual-model";
import { ElkConfiguration } from "../../configurations/elk/elk-configurations.ts";
import { VisualNodeComplete } from "../../graph/representation/node.ts";
import { GraphTransformer } from "./graph-transformer-interface.ts";
import { DefaultGraph, DefaultMainGraph, Graph, isSubgraph, MainGraph } from "../../graph/representation/graph.ts";
import { ElkExtendedEdge, ElkLabel, ElkNode, ElkPort } from "elkjs";
import { ElkConfigurationsContainer } from "../../configurations/configurations-container.ts";
import { ALGORITHM_TO_ELK_ALGORITHM_MAP, CONFIG_TO_ELK_CONFIG_MAP } from "../../configurations/elk/elk-utils.ts";
import { ReactflowDimensionsConstantEstimator, XY } from "../../index.ts";
import { VisualEntities } from "../../migration-to-cme-v2.ts";
import { EdgeEndPoint } from "../../graph/representation/edge.ts";
import _ from "lodash";
import { SemanticModelClassProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { UserGivenAlgorithmConfigurationBase } from "../../configurations/user-algorithm-configurations.ts";
import { AlgorithmConfiguration } from "../../configurations/algorithm-configurations.ts";

type VisualEntitiesType = (VisualNodeComplete | VisualRelationship | VisualProfileRelationship)[];

/**
 * The Transformer class for conversion between our graph representation and ELK graph representation. For more info check {@link GraphTransformer} docs.
 */
export class ElkGraphTransformer implements GraphTransformer {
    constructor(graph: Graph, options?: object) {
        this.mainGraph = graph.mainGraph;
    }

    convertGraphToLibraryRepresentation(
        graph: Graph,
        shouldSetLayoutOptions: boolean,
        configurations: ElkConfigurationsContainer,
        elkNodeToSet?: ElkNode
    ): ElkNode {
        return this.convertGraphToLibraryRepresentationInternal(graph, shouldSetLayoutOptions, configurations, elkNodeToSet);
    }

    convertLayoutOptionsToElkLayoutOptions(
        layoutOptions: Record<string, string>,
    ) {
        const elkLayoutOptions: Record<string, string> = {};
        Object.entries(layoutOptions).forEach(([key, value]) => {
            if(CONFIG_TO_ELK_CONFIG_MAP[key] === undefined || CONFIG_TO_ELK_CONFIG_MAP[key] === null) {
                elkLayoutOptions[key] = value;
            }
            else {
                for (const elkKey of CONFIG_TO_ELK_CONFIG_MAP[key]) {
                    elkLayoutOptions[elkKey] = value;
                }
            }
        });
        return Object.values(elkLayoutOptions).length === 0 ? undefined : elkLayoutOptions;
    }

    /**
     * Internal function for conversion from our graph representation to ELK representation. The method is called recursively for subgraphs.
     */
    convertGraphToLibraryRepresentationInternal(
        graph: Graph,
        shouldSetLayoutOptions: boolean,
        configurations?: ElkConfigurationsContainer,
        elkNodeToSet?: ElkNode
    ): ElkNode {
        let nodes = Object.entries(graph.nodes).map(([id, node]) => {
            if(node.isConsideredInLayout === false) {
                return null;
            }

            if(node.isProfile) {
                return this.createElkNode(
                    id, configurations, node, elkNodeToSet, true,
                    "PROFILE OF: " + (node.semanticEntityRepresentingNode as SemanticModelClassProfile)?.profiling);
            }
            else {
                const elkNode = this.createElkNode(
                    id, configurations, node, elkNodeToSet, true, node?.semanticEntityRepresentingNode?.iri);
                if(node instanceof DefaultGraph) {
                    this.convertGraphToLibraryRepresentationInternal(node, true, configurations, elkNode);
                }
                return elkNode;
            }
        }).filter(n => n !== null);

        const edges = [];

        Object.entries(graph.nodes).map(([id, node]) => {
            for(const edge of node.getAllOutgoingEdges()) {
                if(edge.isConsideredInLayout === false) {
                    continue;
                }

                const source = edge.reverseInLayout === false ? edge.start.id : edge.end.id;
                const target = edge.reverseInLayout === false ? edge.end.id : edge.start.id;

                const layoutOptions = this.convertLayoutOptionsToElkLayoutOptions(edge.layoutOptions);
                let elkEdge: ElkExtendedEdge = {
                    id: edge.id,
                    sources: [ source ],
                    targets: [ target ],
                    layoutOptions,
                }
                edges.push(elkEdge);
            }
        });


        let elkGraph: ElkNode;
        if(elkNodeToSet === undefined) {
            elkGraph = {
                id: "root",
                children: nodes,
                edges: edges
            };
        }
        else {
            elkGraph = elkNodeToSet;
            elkGraph.children = nodes;
            elkGraph.edges = edges;
        }

        if(shouldSetLayoutOptions) {
            if((configurations.currentLayoutAction.action.affectedNodes === "GENERALIZATION" && isSubgraph(this.mainGraph, elkGraph.id)) ||
                (configurations.currentLayoutAction.action.affectedNodes === "ALL" && (graph instanceof DefaultMainGraph))) {
                elkGraph.layoutOptions = (configurations.currentLayoutAction.action as (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase> & ElkConfiguration)).elkData;
            }
            else if(isSubgraph(this.mainGraph, elkGraph.id)) {
                const nodesInOriginalGraph = Object.values(graph.nodes);
                let isAnchored = false;
                if(nodesInOriginalGraph.length > 0) {
                    isAnchored = nodesInOriginalGraph[0].completeVisualNode.isAnchored;
                }
                elkGraph.layoutOptions = {
                    "algorithm": "fixed",
                    "org.eclipse.elk.stress.fixed": String(isAnchored),
                };
            }
        }

        return elkGraph;
    }

    private approximatelyEqual(xy1: XY, xy2: XY, epsilon: number = 0.001) {
        return Math.abs(xy1.x - xy2.x) < epsilon && Math.abs(xy1.y - xy2.y) < epsilon ;
    }

    updateExistingGraphRepresentationBasedOnLibraryRepresentation(
        libraryRepresentation: ElkNode | null,
        graphToBeUpdated: Graph,
        includeNewVertices: boolean,
        shouldUpdateEdges: boolean
    ): VisualEntities {
        if(libraryRepresentation === null) {
            console.error("Update of existing graph representation based on elk represetantion failed, " +
                          "because given library representation is not defined")
            return {};
        }

        const anchoredNode = this.findAnchoredNodeWithUnchanchoredEnd(graphToBeUpdated);
        const tmpPos = anchoredNode?.completeVisualNode?.coreVisualNode?.position ?? {x: 0, y: 0};
        const anchoredPositionBeforeLayout: XY = {...tmpPos};

        const visualEntities = this.recursivelyUpdateGraphBasedOnElkNode(libraryRepresentation, graphToBeUpdated, 0, 0, shouldUpdateEdges);
        // Note: Previously we were moving the graph to the origin point [0, 0], but that is sometimes unwanted
        //       For example when using the elk.stress algorithm to find position for 1 element, then
        //       we don't want to move everything, but just the 1 node. So either

        let positionShiftDueToAnchors: XY = {x: 0, y: 0};
        if(anchoredNode !== null) {
            positionShiftDueToAnchors.x = anchoredNode.completeVisualNode.coreVisualNode.position.x - anchoredPositionBeforeLayout.x;
            positionShiftDueToAnchors.y = anchoredNode.completeVisualNode.coreVisualNode.position.y - anchoredPositionBeforeLayout.y;
        }

        visualEntities.forEach(visualEntity => {
            if(DefaultGraph.isVisualNodeComplete(visualEntity)) {
                visualEntity.addToPositionInCoreVisualNode(-positionShiftDueToAnchors.x, -positionShiftDueToAnchors.y);
            }
            else if(isVisualRelationship(visualEntity) || isVisualProfileRelationship(visualEntity)) {
                for(let i = 0; i < visualEntity.waypoints.length; i++) {
                    visualEntity.waypoints[i].x -= positionShiftDueToAnchors.x;
                    visualEntity.waypoints[i].y -= positionShiftDueToAnchors.y;
                }
            }
        });

        return Object.fromEntries(visualEntities.map(visualEntity => {
            if(DefaultGraph.isVisualNodeComplete(visualEntity)) {
                if(isVisualDiagramNode(visualEntity.coreVisualNode)) {
                    return [visualEntity.coreVisualNode.representedVisualModel, visualEntity.coreVisualNode];
                }
                else {
                    return [visualEntity.coreVisualNode.representedEntity, visualEntity.coreVisualNode];
                }
            }
            else if(isVisualRelationship(visualEntity)) {
                return [visualEntity.representedRelationship, visualEntity];
            }
            else if(isVisualProfileRelationship(visualEntity)) {
                return [visualEntity.entity, visualEntity];
            }
        })) as VisualEntities;
    }


    /**
     * Recursively updates {@link graphToBeUpdated} based on positions in {@link elkNode}.
     */
    recursivelyUpdateGraphBasedOnElkNode(elkNode: ElkNode, graphToBeUpdated: Graph, referenceX: number, referenceY: number, shouldUpdateEdges: boolean): VisualEntitiesType {
        let visualEntities : VisualEntitiesType = [];

        for(let ch of elkNode.children) {
            const newPosition = this.convertElkNodeToPosition(ch, referenceX, referenceY);
            const node = graphToBeUpdated.mainGraph.findNodeInAllNodes(ch.id);
            node.completeVisualNode.coreVisualNode.position = {
                ...newPosition,
                anchored: node.completeVisualNode.coreVisualNode.position.anchored,
            };

            visualEntities.push(node.completeVisualNode);

            if(isSubgraph(this.mainGraph, ch.id)) {
                node.completeVisualNode.width = elkNode.width ?? node.completeVisualNode.width;
                node.completeVisualNode.height = elkNode.height ?? node.completeVisualNode.height;

                let subgraphReferenceX = referenceX + ch.x;
                let subgraphReferenceY = referenceY + ch.y;

                const childVisualEntities = this.recursivelyUpdateGraphBasedOnElkNode(
                    ch, graphToBeUpdated, subgraphReferenceX, subgraphReferenceY, shouldUpdateEdges);
                visualEntities = visualEntities.concat(childVisualEntities);
            }
        }

        if(shouldUpdateEdges) {
            for(let edge of elkNode.edges) {
                const waypoints = this.convertElkEdgeToWaypoints(edge, referenceX, referenceY);
                const edgeInGraph = graphToBeUpdated.mainGraph.findEdgeInAllEdges(edge.id);
                if(edgeInGraph?.reverseInLayout === true) {
                    waypoints.reverse();
                }
                edgeInGraph.visualEdge.visualEdge.waypoints = waypoints;
                visualEntities.push(edgeInGraph.visualEdge.visualEdge);
            }
        }
        return visualEntities;
    };

    private mainGraph: MainGraph;

    /**
     * @returns Top left corner of the top left entity in given {@link visualNodes}
     */
    findTopLeftPosition(visualNodes: VisualNode[]) {
        let [leftX, topY] = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
        for(const visEnt of visualNodes) {
            if(visEnt.position.x <= leftX && visEnt.position.y <= topY) {
                leftX = visEnt.position.x;
                topY = visEnt.position.y;
            }
        }

        return [leftX, topY];
    }


    /**
     * We have to do this, because Elk is being funny. Because even when node is anchored it can be moved.
     * The relative positions are kept, but the absolute ones are not, so we have to
     * shift it all back if there was anchored node in the visual model (alternative solution could be to move the viewport in editor after layout).
     * To make it more clear why we need this: For performance reasons, in the visual model we update only those nodes, which were not anchored
     * Therefore we have to perform the shift, otherwise we add nodes to wrong positions.
     *
     * Not only that, there is difference between nodes with at least 1 edge and nodes without edges.
     * Those without edges are layouted as if there was no anchor.
     * Since we don't care about those no edges node, we have to find the one with at least one edge.
     * Edit: On top of that, there is difference between nodes which are connected to only anchored nodes and those which are not.
     * (Or maybe when the whole subgraph is anchored ... I didn't check that)
     */
    private findAnchoredNodeWithUnchanchoredEnd(graph: Graph): EdgeEndPoint | null {
        for(const [identifier, node] of Object.entries(graph.nodes)) {
            if(node.completeVisualNode.isAnchored === true) {
                (node.getAllOutgoingEdges().next().done !== true || node.getAllIncomingEdges().next().done !== true);
                let hasUnanchoredEnd = false;
                for(const outgoingEdge of node.getAllOutgoingEdges()) {
                    if(outgoingEdge.isConsideredInLayout && !outgoingEdge.end.completeVisualNode.isAnchored) {
                        hasUnanchoredEnd = true;
                        break;
                    }
                }
                if(hasUnanchoredEnd) {
                    return node;
                }

                for(const incomingEdge of node.getAllIncomingEdges()) {
                    if(incomingEdge.isConsideredInLayout && !incomingEdge.start.completeVisualNode.isAnchored) {
                        hasUnanchoredEnd = true;
                        break;
                    }
                }
                if(hasUnanchoredEnd) {
                    return node;
                }
            }
        }

        return null;
    }


    // TODO: Maybe the referenceX and referenceY have to be also used for edges in case of subgraphs (in same way as for nodes)
    /**
     * Converts given {@link elEdge} to the waypoints within the edge
     * @param referenceX is the reference x coordinate used to shift the x position in the resulting visual entity.
     * This is used because elk returns positions relative to the parent subgraph.
     * @param referenceY same as {@link referenceX} but for y coordinate.
     * @returns Waypoints from the given {@link elkEdge}
     */
    private convertElkEdgeToWaypoints(elkEdge: ElkExtendedEdge, referenceX: number, referenceY: number): Position[] {
        const bendpoints = elkEdge?.sections?.[0].bendPoints;
        const waypoints: Position[] = bendpoints?.map(bendpoint => {
            return {
                x: bendpoint.x,
                y: bendpoint.y,
                anchored: null
            };
        }) ?? [];

        return waypoints;
    }

    /**
     *
     * @param referenceX is the reference x coordinate used to shift the x position in the resulting visual entity.
     * This is used because elk returns positions relative to the parent subgraph.
     * @param referenceY same as {@link referenceX} but for y coordinate.
     * @returns Position for the given {@link elkNode}, the position should be put into corresponding graph node.
     */
    private convertElkNodeToPosition(elkNode: ElkNode, referenceX: number, referenceY: number): XY {
        return {
            x: referenceX + elkNode.x,
            y: referenceY + elkNode.y,
        };
    }


    /**
     * @deprecated I used it for some experimentation with ports, but left the idea do to complexness and no gain, keeping it deprectaed
     * instead of removing it. But free to remove
     * @returns Array with 4 ports, one for each side.
     * The ports have id created from the given {@link id}, which should be the id of the node, which will use the ports.
     */
    createDefaultPorts(id: string): ElkPort[] {
        const ports: ElkPort[] = [];
        const portSides: string[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
        for(let i = 0; i < 4; i++) {
            const port: ElkPort = {
                'id': `${portSides[i].slice(0, 1)}-${id}`,
                layoutOptions: {
                    'port.side': portSides[i],
                    'port.index': `${i}`,
                },

            };
            ports.push(port);
        };

        return ports;
    }


    /**
     *
     * @returns default layout options which will be inserted to node.
     */
    getDefaultLayoutOptionsForNode() {
        const portOptions = {
            "nodeLabels.placement": "[H_LEFT, V_TOP, OUTSIDE]",

            // Some commented code with experiments, but in the end it was the best to just use the basic ones
            // "portConstraints": "FIXED_SIDE",        // Actually disabling this really improves the layouted graphs (but they are much more compact)
            // "org.eclipse.elk.portAlignment.default": "CENTER",      // Put all to center, can also specify based on side (north, west, east, south), ie.
            // "org.eclipse.elk.portAlignment.north": "BEGIN",         // But the actual side is based on the direction of layout alg!
        };

        return portOptions;
    }

    /**
     * Creates node in the ELK library representation (type {@link ElkNode}) based on given data.
     */
    createElkNode(
        id: string,
        configurations: ElkConfigurationsContainer,
        graphNode: EdgeEndPoint,
        parentElkNode?: ElkNode,
        shouldComputeSize?: boolean,
        label?: string
    ): ElkNode {
        const width: number = shouldComputeSize ? graphNode?.completeVisualNode?.width : ReactflowDimensionsConstantEstimator.getDefaultWidth();
        const height: number = shouldComputeSize ? graphNode?.completeVisualNode?.height : ReactflowDimensionsConstantEstimator.getDefaultHeight();

        if(graphNode?.completeVisualNode?.width === undefined) {
            throw new Error("Something wrong, the width and height should be always present on graph node");
        }

        const portOptions = this.getDefaultLayoutOptionsForNode();

        const nodeLabel: ElkLabel = { text: label === undefined ? id : label };
        const layoutOptions = this.convertLayoutOptionsToElkLayoutOptions(graphNode.layoutOptions);
        const node: ElkNode = {
            id: id,
            labels: [ nodeLabel ],
            width: width,
            height: height,
            layoutOptions: {
                ...portOptions,
                ...layoutOptions
            },
        };

        const currentLayoutAction = configurations.currentLayoutAction?.action as (AlgorithmConfiguration<UserGivenAlgorithmConfigurationBase>);

        const isNodeSubgraph = isSubgraph(this.mainGraph, node.id);
        const position = graphNode?.completeVisualNode?.coreVisualNode?.position;
        const isInteractiveGeneralization = configurations?.currentLayoutAction?.action?.affectedNodes === "GENERALIZATION" &&
            String(currentLayoutAction?.userGivenConfiguration?.["interactive"]) === "true" &&
            !isNodeSubgraph;
        const isInteractiveAll = configurations?.currentLayoutAction.action.affectedNodes === "ALL" &&
            String(currentLayoutAction?.userGivenConfiguration?.["interactive"]) === "true" &&
            ((configurations.isGeneralizationPerformedBefore() && isNodeSubgraph) ||
                !configurations.isGeneralizationPerformedBefore());
        const isInteractiveGeneralizationSubgraphs = configurations?.currentLayoutAction.action.affectedNodes === "ALL" &&
            configurations.isGeneralizationPerformedBefore() && !isNodeSubgraph;


        const hasParentGraphFixedLayout = parentElkNode !== undefined;


        const originalAlgorithm = currentLayoutAction?.userGivenConfiguration.layout_alg;
        let elkAlgorithm = "not elk algorithm";
        if(originalAlgorithm !== undefined) {
            elkAlgorithm = ALGORITHM_TO_ELK_ALGORITHM_MAP[originalAlgorithm]
        }

        if(position !== undefined &&
            (isInteractiveGeneralization || isInteractiveAll || isInteractiveGeneralizationSubgraphs || hasParentGraphFixedLayout)
          ) {
            const parentPosition = graphNode.getSourceGraph()?.completeVisualNode?.coreVisualNode?.position;
            node.x = position.x - (parentPosition?.x ?? 0);
            node.y = position.y - (parentPosition?.y ?? 0);
            if(elkAlgorithm === "stress") {
                node.layoutOptions["org.eclipse.elk.stress.fixed"] = graphNode.completeVisualNode.isAnchored.toString();
            }
        }

        return node;
    }
}
