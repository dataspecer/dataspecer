import {
    isSemanticModelGeneralization,
    SemanticModelEntity,
    SemanticModelGeneralization,
    SemanticModelRelationship
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
    AllowedEdgeBundleTypes,
    ExtractedModels,
    extractModelObjects,
    GeneralizationBundle,
    RelationshipBundle,
    RelationshipProfileBundle
 } from "../../layout-algorithms/entity-bundles.ts";

import {
    VisualModel,
    isVisualNode,
    isVisualRelationship,
    isVisualProfileRelationship,
    VISUAL_NODE_TYPE,
    isVisualGroup,
    isVisualDiagramNode
} from "@dataspecer/visual-model";
import {
    findTopLevelGroup,
    getBotRightPosition,
    getGroupMappings,
    getNonGroupNodesInGroup,
    getTopLeftPosition,
    PhantomElementsFactory,
    placePositionOnGrid,
} from "../../util/utils.ts";
import { LayoutedVisualEntities } from "../../migration-to-cme-v2.ts";
import { EntityModel } from "@dataspecer/core-v2";
import { ExplicitAnchors } from "../../explicit-anchors.ts";
import {
    NodeDimensionQueryHandler,
    ReactflowDimensionsEstimator,
     VisualEntitiesWithOutsiders,
     XY
    } from "../../index.ts";
import {
    SemanticModelClassProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { getDomainAndRange } from "@dataspecer/core-v2/semantic-model/relationship-utils";
import { addNodeToGraph, getAllEdges, getAllIncomingEdges, getAllOutgoingEdges, Node, isNodeInVisualModel, VisualNodeComplete, getAllIncomingUniqueEdges, getAllOutgoingUniqueEdges, getAllUniqueEdges, AllowedVisualsForNodes } from "./node.ts";
import { GraphFactory } from "./graph-factory.ts";
import { AllowedEdgeBundleWithType, AllowedEdgeTypes, convertOutgoingEdgeTypeToIncoming, DefaultEdge, EdgeEndPoint, getEdgeTypeNameFromEdge, Edge } from "./edge.ts";


/**
 * This is special type for situations, when we want to layout the current visual model, but we also want to find positions for nodes, which are not yet in the visual model,
 * those are stored in {@link outsiders}.
 * Use-case is for example when adding existing class back to canvas. Because if we perform the usual 2 step addition, that is:
 *    1) Add node to visual model together with all its edges
 *    2) Layout visual model
 * Then the node has to be added to some position in step 1), but we move it in step 2). That results in node jumping, which is unwanted behavior.
 *
 * The type could be in future extended with filters against visual model - when we want to layout only part of the visual model.
 * The question for this is if should just completely remove the filtered nodes from graph or set the {@link isConsideredInLayout} variable to false.
 *
 */
export type VisualModelWithOutsiders = {
    /**
     * The visual model.
     */
    visualModel: VisualModel,
    /**
     * Nodes which are not part of the visual model, but should be layouted. The key is the identifier of semantic entity
     */
    outsiders: Record<string, XY | null>,
} | null;

/**
 * Interface which represents the (sub)graph,
 */
export interface Graph extends Node {
    layoutOptions: Record<string, string>;

    /**
     * Maps the visual identifier of node to the node.
     */
    nodes: Record<string, EdgeEndPoint>,
    initializeWithGivenContent(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        nodeContentOfGraph: Array<EdgeEndPoint> | null,
        isDummy: boolean,
        nodeDimensionQueryHandler?: NodeDimensionQueryHandler | null
    );
    initialize(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        inputModels: Map<string, EntityModel> | ExtractedModels | null,
        isDummy: boolean,
        visualModel: VisualModel,
        entitiesToLayout: VisualEntitiesWithOutsiders,
        nodeDimensionQueryHandler?: NodeDimensionQueryHandler | null,
        explicitAnchors?: ExplicitAnchors
    );
    insertSubgraphToGraph(
        subgraph: Graph,
        nodesInSubgraph: Array<EdgeEndPoint>,
        shouldSplitEdges: boolean
    ): void;

    /**
     * Creates the generalization subgraph and inserts into this instance of graph
     */
    createNewGraphAndInsertInGraph(nodesInSubgraph: Array<EdgeEndPoint>): Graph
}


/**
 * The reason for this is, that for example d3.js likes to have complete list of nodes and edges stored somewhere. Which is ok, but up until now
 * we extepcted the nodes/edges to be hierarchic - i.e. if there is group node - the graph above it only stores the group node and the content of the group node is
 * available only from the group node and not anywhere else.
 */
export interface MainGraph extends Graph {
    /**
     * Maps the semantic node to all its visuals.
     *
     * If the entity does not have semantic equivalent, its visual one is used as a key
     */
    semanticNodeToVisualMap: Record<string, EdgeEndPoint[]>,

    /**
     * List of all nodes/subgraphs in the graph.
     */
    allNodes: Record<string, EdgeEndPoint>,
    insertInAllNodes(node: EdgeEndPoint): void,
    getAllNodesInMainGraph(): EdgeEndPoint[],
    /**
     * List of all edges in the graph.
     */
    allEdges: Record<string, Edge>,
    insertInAllEdges(edge: Edge): void,
    getAllEdgesInMainGraph(): Edge[],

    nodeDimensionQueryHandler: NodeDimensionQueryHandler;

    findNodeInAllNodes(nodeIdentifier: string): EdgeEndPoint | null,
    findEdgeInAllEdges(edgeIdentifier: string): Edge | null,

    removeFromAllNodes(nodeIdentifier): void,
    removeFromAllEdges(edgeIdentifier): void,

    /**
     * Call this method on the "wrapper" graph to convert all entities within the graph to VisualEntites which can be used in Visual model
     */
    convertWholeGraphToDataspecerRepresentation(): LayoutedVisualEntities,
    /**
     * This method goes through all the nodes, subgraphs and edges inside this graph and sets properties modifying graph to default state - mainly {@link isConsideredInLayout} and reverseInLayout on edges
     */
    resetForNewLayout(): void,


    /**
     * Create generalization subgraphs.
     * Note: Currently doesn't have reverse operation.
     */
    createGeneralizationSubgraphs(): void,
}


/**
 * Class which stores (sub)graph.
 */
export class DefaultGraph implements Graph {
    private initializeGraphMetadata(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        isDummy: boolean,
        nodeDimensionQueryHandler: NodeDimensionQueryHandler | null,
    ) {
        this.sourceGraph = sourceGraph;
        if(!(this instanceof DefaultMainGraph)) {
            mainGraph.allNodes[graphIdentifier] = this;
        }
        else {
            if(nodeDimensionQueryHandler === undefined || nodeDimensionQueryHandler === null) {
                nodeDimensionQueryHandler = new ReactflowDimensionsEstimator();
            }
            this.nodeDimensionQueryHandler = nodeDimensionQueryHandler;
        }
        this.mainGraph = mainGraph;
        this.id = graphIdentifier;
        this.isDummy = isDummy;
        this.sourceModelIdentifier = null;
    }

    initializeWithGivenContent(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        nodeContentOfGraph: Array<EdgeEndPoint>,
        isDummy: boolean,
        nodeDimensionQueryHandler: NodeDimensionQueryHandler | null,
    ) {

        this.initializeGraphMetadata(mainGraph, sourceGraph, graphIdentifier, isDummy, nodeDimensionQueryHandler);

        const nodesMap = {};
        for(const node of nodeContentOfGraph) {
            nodesMap[node.id] = node;
            node.setSourceGraph(this);
        }
        this.nodes = nodesMap;
        const visualNodeRepresentingGraph = this.createNewVisualNodeForGraphBasedOnContainedNodes();
        const topLeft = getTopLeftPosition(Object.values(this.nodes));
        const botRight = getBotRightPosition(Object.values(this.nodes));
        const width = botRight.x - topLeft.x;
        const height = botRight.y - topLeft.y;
        visualNodeRepresentingGraph.position = { ...topLeft, anchored: null };
        this.completeVisualNode = new VisualNodeComplete(visualNodeRepresentingGraph, width, height, false, false);
    }

    private createNewVisualNodeForGraphBasedOnContainedNodes() {
        const position = getTopLeftPosition(Object.values(this.nodes));
        return {
            identifier: this.id,
            type: [VISUAL_NODE_TYPE],
            representedEntity: this.id,
            position: {
                ...position,
                anchored: null,
            },
            content: [],
            visualModels: [],
            model: "",
        };
    }


    /**
     * Initializes instance of this graph, the reason why this is not part of the constructor is that since {@link DefaultMainGraph} extends this class,
     * it uses the same initialize method, that results in situation that we can't update the list of all nodes in the constructor, since they are not initialized.
     */
    initialize(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        inputModels: Map<string, EntityModel> | ExtractedModels | null,
        isDummy: boolean,
        visualModel: VisualModel,
        entitiesToLayout: VisualEntitiesWithOutsiders,
        nodeDimensionQueryHandler?: NodeDimensionQueryHandler | null,
        explicitAnchors?: ExplicitAnchors
    ) {

        this.initializeGraphMetadata(mainGraph, sourceGraph, graphIdentifier, isDummy, nodeDimensionQueryHandler);

        if(inputModels === null) {
            return;
        }

        // https://stackoverflow.com/questions/46703364/why-does-instanceof-in-typescript-give-me-the-error-foo-only-refers-to-a-ty
        // Just simple check, dont check all elements it is not necessary
        const areInputModelsExtractedModels = (inputModels as ExtractedModels).entities && (inputModels as ExtractedModels).generalizations;
        const extractedModels = areInputModelsExtractedModels ? (inputModels as ExtractedModels) : extractModelObjects(inputModels as Map<string, EntityModel>);

        this.createGraphNodes(entitiesToLayout, visualModel, extractedModels, explicitAnchors);
        this.createGraphEdges(entitiesToLayout, visualModel, extractedModels);
        this.createGraphGroups(entitiesToLayout, visualModel, extractedModels);
    }

    private createGraphNodes(
        entitiesToLayout: VisualEntitiesWithOutsiders,
        visualModel: VisualModel | null,
        extractedModels: ExtractedModels,
        explicitAnchors?: ExplicitAnchors
    ) {
        if(visualModel !== null) {
            const nodes = entitiesToLayout.visualEntities
                .map(entity => visualModel.getVisualEntity(entity))
                .filter(entity => entity !== null)
                .filter(entity => isVisualNode(entity) || isVisualDiagramNode(entity));
            for(const node of nodes) {
                if(isVisualNode(node)) {
                    const cclass = extractedModels.classes.find(cclass => cclass.semanticClass.id === node.representedEntity);
                    if(cclass !== undefined) {
                        addNodeToGraph(
                            this.mainGraph, node, cclass.semanticClass, false, cclass.sourceModelIdentifier,
                            extractedModels, this, visualModel, entitiesToLayout, null, false, explicitAnchors);
                    }
                    else {
                        const classProfile = extractedModels.classesProfiles
                            .find(classProfile => classProfile.semanticClassProfile.id === node.representedEntity);
                        if(classProfile === undefined) {
                            addNodeToGraph(
                                this.mainGraph, node, null, true,
                                classProfile?.sourceModelIdentifier ?? null, extractedModels, this,
                                visualModel, entitiesToLayout, null, false, explicitAnchors);
                        }
                        else {
                            addNodeToGraph(
                                this.mainGraph, node, classProfile.semanticClassProfile, true,
                                classProfile.sourceModelIdentifier, extractedModels, this,
                                visualModel, entitiesToLayout, null, false, explicitAnchors);
                        }
                    }
                }
                else {
                    addNodeToGraph(
                        this.mainGraph, node, null, true, null, extractedModels, this,
                        visualModel, entitiesToLayout, null, false, explicitAnchors);
                }
            }
        }

        for(const [outsider, position] of Object.entries(entitiesToLayout.outsiders)) {
            // Almost the same as for the visual nodes, but there is difference for nodes without semantic equivalents
            const cclass = extractedModels.classes.find(cclass => cclass.semanticClass.id === outsider);
            if(cclass !== undefined) {
                addNodeToGraph(
                    this.mainGraph, null, cclass.semanticClass, false, cclass.sourceModelIdentifier,
                    extractedModels, this, visualModel, entitiesToLayout, position, false, explicitAnchors);
            }
            else {
                const classProfile = extractedModels.classesProfiles
                    .find(classProfile => classProfile.semanticClassProfile.id === outsider);
                if(classProfile === undefined) {
                    console.error("outsider is neither class or class profile");
                    throw new Error("Implementation error")
                    return;
                }
                addNodeToGraph(
                    this.mainGraph, null, classProfile.semanticClassProfile, true,
                    classProfile.sourceModelIdentifier, extractedModels, this,
                    visualModel, entitiesToLayout, position, false, explicitAnchors);
            }
        }
    }

    /**
     * Expects that the ends of edges to already exist.
     */
    private createGraphEdges(
        entitiesToLayout: VisualEntitiesWithOutsiders,
        visualModel: VisualModel | null,
        extractedModels: ExtractedModels
    ) {
        const sourceGraph = this;
        if(visualModel !== null) {
            const relationshipEdges = entitiesToLayout.visualEntities
                .map(visualId => visualModel.getVisualEntity(visualId))
                .filter(entity => entity !== null)
                .filter(edge => isVisualRelationship(edge));
            const classProfilesEdges = entitiesToLayout.visualEntities
                .map(visualId => visualModel.getVisualEntity(visualId))
                .filter(entity => entity !== null)
                .filter(edge => isVisualProfileRelationship(edge));

            for(const edge of relationshipEdges) {
                let semanticRelationshipBundle = getSemanticRelationshipBundle(edge.representedRelationship, extractedModels);
                if(semanticRelationshipBundle === undefined || semanticRelationshipBundle === null) {
                    // If this causes errors, just put here continue to skip it, but so far it seems to be fine.
                    console.warn("The visual relationship is not present in the semantic model, but we will try to put it into graph anyways");
                }

                let semanticRelationship: AllowedEdgeTypes = convertAllowedEdgeBundleToAllowedEdgeType(semanticRelationshipBundle);

                DefaultEdge.addNewEdgeToGraph(
                    sourceGraph, null, edge, semanticRelationship,
                    edge.visualSource, edge.visualTarget,
                    extractedModels, semanticRelationshipBundle?.type);
            }
            for(const edge of classProfilesEdges) {
                const semanticClassProfile = getSemanticRelationshipBundle(edge.entity, extractedModels);
                if(semanticClassProfile === undefined) {
                    // Here we skip it using continue unlike in relationship edges, don't allow profiles without semantic coutner part
                    console.warn("The visual relationship is not present in the semantic model");
                    continue;
                }
                DefaultEdge.addNewEdgeToGraph(
                    sourceGraph, null, edge, null,
                    edge.visualSource, edge.visualTarget,
                    extractedModels, "outgoingClassProfileEdges");
            }
        }


        const relationships = extractedModels.relationships
            .filter(relationshipBundle => {
                return checkIfEdgeShouldBePartOfGraph(
                    visualModel,
                    entitiesToLayout,
                    relationshipBundle.semanticRelationship.ends[0].concept,
                    relationshipBundle.semanticRelationship.ends[1].concept);
                }
            )
            .map(relationshipBundle => relationshipBundle.semanticRelationship);

        relationships.forEach((relationship) => {
            const { domain, range } = getDomainAndRange(relationship);
            const semanticStart = domain.concept;
            const semanticEnd = range.concept;
            if(entitiesToLayout.outsiders[semanticStart] === undefined &&       // It was already added
                entitiesToLayout.outsiders[semanticEnd] === undefined) {
                return;
            }

            let visualStarts = this.mainGraph.semanticNodeToVisualMap[semanticStart];
            let visualEnds = this.mainGraph.semanticNodeToVisualMap[semanticEnd];

            for(const visualStart of visualStarts) {
                for(const visualEnd of visualEnds) {
                    DefaultEdge.addNewEdgeToGraph(
                        sourceGraph, null, null, relationship,
                        visualStart.id, visualEnd.id,
                        extractedModels, "outgoingRelationshipEdges");
                }
            }
        });
        //
        const generalizations = extractedModels.generalizations
            .filter(generalizationBundle => {
                return checkIfEdgeShouldBePartOfGraph(
                    visualModel,
                    entitiesToLayout,
                    generalizationBundle.semanticGeneralization.child,
                    generalizationBundle.semanticGeneralization.parent);
                }
            )
            .map(generalizationBundle => generalizationBundle.semanticGeneralization);
        generalizations.forEach((generalization) => {
            const semanticStart = generalization.child;
            const semanticEnd = generalization.parent;
            if(entitiesToLayout.outsiders[semanticStart] === undefined &&       // It was already added
                entitiesToLayout.outsiders[semanticEnd] === undefined) {
                return;
            }

            let visualStarts = this.mainGraph.semanticNodeToVisualMap[semanticStart];
            let visualEnds = this.mainGraph.semanticNodeToVisualMap[semanticEnd];

            for(const visualStart of visualStarts) {
                for(const visualEnd of visualEnds) {
                    DefaultEdge.addNewEdgeToGraph(
                        sourceGraph, null, null, generalization,
                        visualStart.id, visualEnd.id,
                        extractedModels, "outgoingGeneralizationEdges");
                }
            }
        });
        //
        const relationshipsProfiles = extractedModels.relationshipsProfiles
            .filter(relationshipProfileBundle => {
                return checkIfEdgeShouldBePartOfGraph(
                    visualModel,
                    entitiesToLayout,
                    relationshipProfileBundle.semanticRelationshipProfile.ends[0].concept,
                    relationshipProfileBundle.semanticRelationshipProfile.ends[1].concept);
                }
            )
            .map(relationshipProfileBundle => relationshipProfileBundle.semanticRelationshipProfile);
        relationshipsProfiles.forEach((relationshipProfile) => {
            const semanticStart = relationshipProfile.ends[0].concept;
            const semanticEnd = relationshipProfile.ends[1].concept;
            if(entitiesToLayout.outsiders[semanticStart] === undefined &&       // It was already added
                entitiesToLayout.outsiders[semanticEnd] === undefined) {
                return;
            }

            let visualStarts = this.mainGraph.semanticNodeToVisualMap[semanticStart];
            let visualEnds = this.mainGraph.semanticNodeToVisualMap[semanticEnd];

            for(const visualStart of visualStarts) {
                for(const visualEnd of visualEnds) {
                    DefaultEdge.addNewEdgeToGraph(
                        sourceGraph, null, null, relationshipProfile,
                        visualStart.id, visualEnd.id,
                        extractedModels, "outgoingProfileEdges");
                }
            }
        });
        //
        const toClassProfileEdges: {
            source: SemanticModelClassProfile,
            target: string,
        }[] = [];
        for(const classProfileBundle of extractedModels.classesProfiles) {
            for(const profileOf of classProfileBundle.semanticClassProfile.profiling) {
                if(checkIfEdgeShouldBePartOfGraph(
                        visualModel,
                        entitiesToLayout,
                        classProfileBundle.semanticClassProfile.id, profileOf)) {
                    toClassProfileEdges.push({
                        source: classProfileBundle.semanticClassProfile,
                        target: profileOf
                    });
                }
            }
        }
        for(const toClassProfileEdge of toClassProfileEdges) {
            const semanticStart = toClassProfileEdge.source.id;
            const semanticEnd = toClassProfileEdge.target;
            if(entitiesToLayout.outsiders[semanticStart] === undefined &&       // It was already added
                entitiesToLayout.outsiders[semanticEnd] === undefined) {
                return;
            }

            let visualStarts = this.mainGraph.semanticNodeToVisualMap[semanticStart];
            let visualEnds = this.mainGraph.semanticNodeToVisualMap[semanticEnd];

            for(const visualStart of visualStarts) {
                for(const visualEnd of visualEnds) {
                    DefaultEdge.addNewEdgeToGraph(
                        sourceGraph, null, null, null,
                        visualStart.id, visualEnd.id,
                        extractedModels, "outgoingClassProfileEdges");
                }
            }
        }
    }

    private createGraphGroups(
        entitiesToLayout: VisualEntitiesWithOutsiders,
        visualModel: VisualModel | null,
        extractedModels: ExtractedModels
    ) {
        if(visualModel !== null) {
            const groups = entitiesToLayout.visualEntities
                .map(entity => visualModel.getVisualEntity(entity))
                .filter(entity => entity !== null)
                .filter(isVisualGroup);

            const { nodeToGroupMapping, existingGroups } = getGroupMappings(groups);
            const alreadyProcessedGroups: Record<string, true> = {};

            for(const group of groups) {
                const topLevelGroup = findTopLevelGroup(group.identifier, existingGroups, nodeToGroupMapping);

                if(alreadyProcessedGroups[topLevelGroup] === true) {
                    continue;
                }
                alreadyProcessedGroups[topLevelGroup] = true;

                const { nonGroupNodes, processedGroups } = getNonGroupNodesInGroup(existingGroups[topLevelGroup], existingGroups);
                for (const processedGroup of Object.keys(processedGroups)) {
                    alreadyProcessedGroups[processedGroup] = true;
                }

                const nodesInSubgraph = nonGroupNodes
                    .map(identifier => this.mainGraph.findNodeInAllNodes(identifier));
                GraphFactory.createGraph(
                    this.mainGraph, this, topLevelGroup, nodesInSubgraph, true, true);
            }
        }
    }

    private isEdgeInsideGraph(edge: Edge): boolean {
        return edge.start.getSourceGraph() === this || edge.end.getSourceGraph() === this;
    }

    public createGeneralizationSubgraphs() {
        const generalizationEdges: SemanticModelGeneralization[] = [];
        this.mainGraph.getAllEdgesInMainGraph().forEach(edge => {
            if(isSemanticModelGeneralization(edge.semanticEntityRepresentingEdge) && this.isEdgeInsideGraph(edge)) {
                generalizationEdges.push(edge.semanticEntityRepresentingEdge);
            }
        })

        // We pass in no visual model, since it is expected that the edges in the graph are exactly those which were at the visual model at the time of creation
        this.createGeneralizationSubgraphsInternal(generalizationEdges, null);
    }



    /**
     * Creates generalization subgraphs. The subgraphs are maximal, meaning any node which can be reached through the generalization path is in the subgraph.
     */
    private createGeneralizationSubgraphsInternal(
        generalizationEdges: SemanticModelGeneralization[],
        visualModel: VisualModel
    ): Graph[] {
        // For now 1 whole hierarchy (n levels) == 1 subgraph
        let parents: Record<string, string[]> = {};
        let children: Record<string, string[]> = {};
        generalizationEdges.forEach(g => {
            if(parents[g.child] === undefined) {
                parents[g.child] = [];
            }
            parents[g.child].push(g.parent);

            if(children[g.parent] === undefined) {
                children[g.parent] = [];
            }
            children[g.parent].push(g.child);
        });

        const subgraphs: string[][] = this.findGeneralizationSubgraphs(parents, children);
        let generalizationSubgraphs: EdgeEndPoint[][] = subgraphs.map(subgraph => {
            // Just paste in the original node, don't copy
            const generalizationSubgraphNonFlattened = subgraph
                .map(nodeID => {
                    const result: EdgeEndPoint[] = [];
                    for (const node of this.mainGraph.semanticNodeToVisualMap[nodeID]) {
                        result.push(this.nodes[node.id])
                    }
                    return result;
                });
            return generalizationSubgraphNonFlattened.flat();
        });

        generalizationSubgraphs = generalizationSubgraphs.map(subgraph => subgraph.filter(node => node !== undefined));


        let createdSubgraphs: Array<Graph> = [];
        generalizationSubgraphs.forEach(nodesInSubgraph => {
            createdSubgraphs.push(this.createNewGraphAndInsertInGraph(nodesInSubgraph));
        });


        return createdSubgraphs;
    }


    /**
     * Finds generalization subgraphs. The subgraphs are maximal, meaning any node which can be reached through the generalization path is in the subgraph.
     * @param parents is record maps node id to its parents (in the generalization hierarchy)
     * @param children is record maps node id to its children (in the generalization hierarchy)
     * @returns Returns 2D string array representing the subgraphs. So each string[] is one generalization subgraph.
     */
    findGeneralizationSubgraphs(parents: Record<string, string[]>, children: Record<string, string[]>): string[][] {
        let subgraphs: Record<string, number> = {};
        let stack: string[] = [];
        let currSubgraph = -1;

        for(let [child, concreteParents] of Object.entries(parents)) {
            if(subgraphs[child] === undefined) {
                currSubgraph++;
                stack.push(child);
                subgraphs[stack[0]] = currSubgraph;
            }

            while(stack.length > 0) {
                let currNode = stack.pop();
                parents[currNode] = parents[currNode] === undefined ? [] : parents[currNode];
                children[currNode] = children[currNode] === undefined ? [] : children[currNode];
                parents[currNode].concat(children[currNode]).forEach(n => {
                    if(subgraphs[n] === undefined) {
                        subgraphs[n] = currSubgraph;
                        stack.push(n);
                    }
                });
            }
        }
        currSubgraph++;     // So it is the same as number of subgraphs



        let subgraphsAsArrays: string[][] = [];
        for(let i = 0; i < currSubgraph; i++) {
            subgraphsAsArrays.push([]);
        }
        Object.entries(subgraphs).forEach(([nodeID, subgraphID]) => subgraphsAsArrays[subgraphID].push(nodeID));

        return subgraphsAsArrays;
    }



    // We have it as instance method, this way the identifiers are consistent between two graphs
    private subgraphUniqueIdentifier = 0;
    private createUniqueGeneralizationSubgraphIdentifier(): string {
        const identifier = `subgraph-${this.subgraphUniqueIdentifier}`;
        this.subgraphUniqueIdentifier++;

        return identifier;
    }

    createNewGraphAndInsertInGraph(nodesInSubgraph: Array<EdgeEndPoint>): Graph {
        const identifier = this.createUniqueGeneralizationSubgraphIdentifier();
        const subgraph: Graph = GraphFactory.createGraph(
            this.mainGraph, this, identifier, nodesInSubgraph, true, true);
        return subgraph;
    }

    insertSubgraphToGraph(subgraph: Graph, nodesInSubgraph: Array<EdgeEndPoint>, shouldSplitEdges: boolean): void {
        // Repair the old graph by substituting the nodes by the newly created subgraph
        this.replaceNodesInOriginalGraphWithTheSubgraph(subgraph, nodesInSubgraph);
        if(shouldSplitEdges) {
            // Repair edges by splitting them into two parts
            this.splitEdgesGoingBeyondSubgraph(subgraph, nodesInSubgraph);
        }
    }

    /**
     * Replaces the {@link nodesInSubgraph} stored in this instance of graph with one node (respectively graph) which stores them - the {@link subgraph}
     */
    replaceNodesInOriginalGraphWithTheSubgraph(subgraph: Graph, nodesInSubgraph: Array<EdgeEndPoint>) : void {
        for(const nodeInSubgraph of nodesInSubgraph) {
            delete this.nodes[nodeInSubgraph.id];
        }
        this.nodes[subgraph.id] = subgraph;
    }


    /**
     * Splits edges, the act of splitting is explained the {@link GraphFactory.createGraph}
     */
    splitEdgesGoingBeyondSubgraph(subgraph: Graph, changedNodes: Array<EdgeEndPoint>): void {
        this.splitEdgesGoingBeyondSubgraphInternal(subgraph, changedNodes, "sources");
        this.splitEdgesGoingBeyondSubgraphInternal(subgraph, changedNodes, "targets");
    }


    /**
     *
     * @param edgeEnd is either "sources" or "targets", if it is sources then it repairs edges going out of subgraph, "targets" then going in
     */
    private splitEdgesGoingBeyondSubgraphInternal(subgraph: Graph, changedNodes: Array<EdgeEndPoint>, edgeEnd: "sources" | "targets") {
        const edgesGoingBeyond: Edge[] = [];

        const nodesInsideSubgraph = changedNodes.concat(subgraph);
        if(edgeEnd === "sources") {
            changedNodes.forEach(node => {
                for(const edge of node.getAllOutgoingEdges()) {
                    if(nodesInsideSubgraph.find(changedNode => changedNode.id === edge.end.id) === undefined) {
                        edgesGoingBeyond.push(edge);
                    }
                }
            });
        }
        else if(edgeEnd === "targets") {
            changedNodes.forEach(node => {
                for(const edge of node.getAllIncomingEdges()) {
                    if(nodesInsideSubgraph.find(changedNode => changedNode.id === edge.start.id) === undefined) {
                        edgesGoingBeyond.push(edge);
                    }
                }
            });
        }

        edgesGoingBeyond.forEach(e => this.splitEdgeIntoTwo(e, subgraph));
    }

    /**
     * Performs the edge splitting - Constructs identifiers of the new edges, removes the old one and creates two new ones.
     * One going from the start node to the subgraph and the other from the subgraph to the other end.
     */
    splitEdgeIntoTwo(edge: Edge, subgraph: Graph): void {
        this.removeEdge(edge);
        const firstSplitIdentifier = PhantomElementsFactory.constructSplitID(edge.id, 0);
        const secondSplitIdentifier = PhantomElementsFactory.constructSplitID(edge.id, 1);

        DefaultEdge.addNewEdgeToGraph(
            subgraph, firstSplitIdentifier, null, edge.semanticEntityRepresentingEdge, edge.visualEdge.visualEdge.visualSource,
            subgraph.id, null, getEdgeTypeNameFromEdge(edge));
        DefaultEdge.addNewEdgeToGraph(
            subgraph, secondSplitIdentifier, null, edge.semanticEntityRepresentingEdge, subgraph.id,
            edge.visualEdge.visualEdge.visualTarget, null, getEdgeTypeNameFromEdge(edge));
    }


    /**
     * Removes given edge from nodes on both ends and also removes it from list of all edges of the main graph.
     */
    removeEdge(edge: Edge) {
        const edgeType = getEdgeTypeNameFromEdge(edge);
        const reverseEdgeType = convertOutgoingEdgeTypeToIncoming(edgeType);

        let index = edge.start[edgeType].indexOf(edge);
        edge.start[edgeType].splice(index, 1);
        index = edge.end[reverseEdgeType].indexOf(edge);
        edge.end[reverseEdgeType].splice(index, 1);

        this.mainGraph.removeFromAllEdges(edge.id);
    }

    /**
     * Removes {@link node} and all related edges and also removes it all from list of all nodes and all edges of the main graph.
     */
    removeNode(node: Node) {
        for(const edge of node.getAllEdges()) {
            this.removeEdge(edge);
        }
        this.mainGraph.removeFromAllNodes(node.id);
    }


    convertToDataspecerRepresentation(): AllowedVisualsForNodes | null {
        return this.completeVisualNode?.coreVisualNode ?? null;
    }


    nodes: Record<string, EdgeEndPoint> = {};

    sourceGraph: Graph;
    mainGraph: MainGraph;

    id: string = "";
    sourceModelIdentifier: string | null;
    semanticEntityRepresentingNode: SemanticModelEntity | null = null;
    isDummy: boolean = true;
    isProfile: boolean = false;
    isConsideredInLayout: boolean = true;
    layoutOptions: Record<string, string> = {};


    setOutgoingClassProfileEdge(outgoingClassProfileEdge: Edge) {
        throw new Error("Graphs can't be profiled.");
    }

    outgoingClassProfileEdges: Array<Edge> = [];
    incomingClassProfileEdges: Array<Edge> = [];

    outgoingRelationshipEdges: Array<Edge> = [];
    incomingRelationshipEdges: Array<Edge> = [];

    outgoingGeneralizationEdges: Array<Edge> = [];
    incomingGeneralizationEdges: Array<Edge> = [];

    outgoingProfileEdges: Array<Edge> = [];
    incomingProfileEdges: Array<Edge> = [];
    getAllIncomingEdges(): Generator<Edge> {
        return getAllIncomingEdges(this);
    }

    getAllOutgoingEdges(): Generator<Edge> {
        return getAllOutgoingEdges(this);
    }

    getAllEdges(): Generator<Edge> {
        return getAllEdges(this);
    }

    getAllIncomingUniqueEdges(): Generator<Edge, Record<string, true>, unknown> {
        return getAllIncomingUniqueEdges(this, null);
    }

    getAllOutgoingUniqueEdges(): Generator<Edge, Record<string, true>, unknown> {
        return getAllOutgoingUniqueEdges(this, null);
    }

    getAllUniqueEdges(): Generator<Edge, Record<string, true>, unknown> {
        return getAllUniqueEdges(this);
    }

    completeVisualNode: VisualNodeComplete;

    getAttributes(): SemanticModelRelationship[] {
        return [];
    }
    getSourceGraph(): Graph | null {
        return this.sourceGraph;
    }
    setSourceGraph(sourceGraph: Graph): void {
        this.sourceGraph = sourceGraph;
    }

    static isVisualNodeComplete(possibleNode: object): possibleNode is VisualNodeComplete {
        return "coreVisualNode" in possibleNode;
    }
}


export class DefaultMainGraph extends DefaultGraph implements MainGraph {
    semanticNodeToVisualMap: Record<string, EdgeEndPoint[]> = {};
    semanticEdgeToVisualMap: Record<string, Edge[]> = {};
    allNodes: Record<string, EdgeEndPoint> = {};
    allEdges: Record<string, Edge> = {};
    nodeDimensionQueryHandler: NodeDimensionQueryHandler;

    findNodeInAllNodes(nodeIdentifier: string): EdgeEndPoint | null {
        return this.allNodes[nodeIdentifier] ?? null;
    }
    findEdgeInAllEdges(edgeIdentifier: string): Edge | null {
        return this.allEdges[edgeIdentifier] ?? null;
    }

    getAllNodesInMainGraph(): EdgeEndPoint[] {
        return Object.values(this.allNodes);
    }
    getAllEdgesInMainGraph(): Edge[] {
        return Object.values(this.allEdges);
    }

    insertInAllNodes(node: EdgeEndPoint): void {
        this.allNodes[node.id] = node;
    }
    insertInAllEdges(edge: Edge): void {
        this.allEdges[edge.id] = edge;
    }

    removeFromAllNodes(nodeIdentifier: string): void {
        delete this.allNodes[nodeIdentifier];
    }
    removeFromAllEdges(edgeIdentifier: string): void {
        delete this.allEdges[edgeIdentifier];
    }

    resetForNewLayout(): void {
        this.getAllNodesInMainGraph().forEach(node => {
            node.isConsideredInLayout = true;
        });

        this.getAllEdgesInMainGraph().forEach(edge => {
            edge.reverseInLayout = false;
            edge.isConsideredInLayout = true;
        })
    }

    convertWholeGraphToDataspecerRepresentation(): LayoutedVisualEntities {
        const visualEntities: LayoutedVisualEntities = {};

        for(const node of this.getAllNodesInMainGraph()) {
            if(node.isDummy) {
                continue;
            }

            const visualEntityForNode = node.convertToDataspecerRepresentation();
            // TODO Hard to solve by myself - Radstr: We want to place it on grid, but
            // we can't access the cme configuration (applications/conceptual-model-editor/src/application/configuration.ts) from here
            // So I am not sure how one should solve this.
            placePositionOnGrid(visualEntityForNode.position, 10, 10)

            // node.id should be the same as visualEntityForNode.identifier
            visualEntities[visualEntityForNode.identifier] = {
                visualEntity: visualEntityForNode,
                isOutsider: node.completeVisualNode.isOutsider
            };
        }

        for(const edge of this.getAllEdgesInMainGraph()) {
            if(edge.isDummy) {
                continue;
            }

            const visualEntityForEdge = edge.convertToDataspecerRepresentation();
            // Just in case look-up if not set, but I think that in current version this never occurs, we always have the visual node to use
            if(visualEntityForEdge.visualSource === "") {
                const sourceGraphNode = this.findNodeInAllNodes(edge.start.id);
                visualEntityForEdge.visualSource = sourceGraphNode.completeVisualNode.coreVisualNode.identifier;
            }
            if(visualEntityForEdge.visualTarget === "") {
                const targetGraphNode = this.findNodeInAllNodes(edge.end.id);
                visualEntityForEdge.visualTarget = targetGraphNode.completeVisualNode.coreVisualNode.identifier;
            }

            if(PhantomElementsFactory.isSplitID(edge.id)) {
                visualEntityForEdge.waypoints = [];
                visualEntityForEdge.identifier = PhantomElementsFactory.deconstructSplitID(edge.id);
            }

            // Again edge.id should be the same as visualEntityForEdge.identifier
            visualEntities[visualEntityForEdge.identifier] = {
                visualEntity: visualEntityForEdge,
                isOutsider: edge.visualEdge.isOutsider,
            };
        }

        return visualEntities;
    }
}


function convertAllowedEdgeBundleToAllowedEdgeType(
    bundle: AllowedEdgeBundleWithType | null | undefined
): AllowedEdgeTypes {
    if(bundle === null || bundle === undefined) {
        return null;
    }
    if(bundle.type === "outgoingRelationshipEdges") {
        return (bundle.semanticRelationship as RelationshipBundle).semanticRelationship;
    }
    else if(bundle.type === "outgoingGeneralizationEdges") {
        return (bundle.semanticRelationship as GeneralizationBundle).semanticGeneralization;
    }
    else if(bundle.type === "outgoingProfileEdges") {
        return (bundle.semanticRelationship as RelationshipProfileBundle).semanticRelationshipProfile;
    }
}

/**
 * @returns Returns the semantic relationship - if null is returned then the relationship simply does not exist at all
 * (it is not even class profile like relationship)
 */
function getSemanticRelationshipBundle(
    identifier: string,
    extractedModels: ExtractedModels,
): AllowedEdgeBundleWithType | null {
    let semanticRelationship: AllowedEdgeBundleTypes;

    semanticRelationship = extractedModels.relationships.find(rBundle => rBundle.semanticRelationship.id === identifier);
    if(semanticRelationship !== undefined) {
        return {
            semanticRelationship,
            type: "outgoingRelationshipEdges",
        };
    }

    semanticRelationship = extractedModels.generalizations.find(gBundle => gBundle.semanticGeneralization.id === identifier);
    if(semanticRelationship !== undefined) {
        return {
            semanticRelationship,
            type: "outgoingGeneralizationEdges",
        };
    }

    semanticRelationship = extractedModels.relationshipsProfiles.find(rpBundle => rpBundle.semanticRelationshipProfile.id === identifier);
    if(semanticRelationship !== undefined) {
        return {
            semanticRelationship,
            type: "outgoingProfileEdges",
        };
    }

    semanticRelationship = extractedModels.classesProfiles.find(cpBundle => cpBundle.semanticClassProfile.id === identifier);
    if(semanticRelationship !== undefined) {
        return {
            semanticRelationship,
            type: "outgoingClassProfileEdges",
        };
    }

    return null;
}

/**
 * @returns Returns true if either both ends are outsiders or at one is outsider and the other one is in visual model.
 */
const checkIfEdgeShouldBePartOfGraph = (
    visualModel: VisualModel,
    entitiesToLayout: VisualEntitiesWithOutsiders,
    start: string,
    end: string
): boolean => {
    return isNodeInVisualModel(visualModel, entitiesToLayout, null, start) &&
            isNodeInVisualModel(visualModel, entitiesToLayout, null, end);
}

export function isSubgraph(parentGraph: Graph, possibleSubgraph: string): boolean {
    const nodeInGraph = parentGraph.nodes[possibleSubgraph];
    const isSubgraphTest = nodeInGraph !== undefined && ("nodes" in nodeInGraph);

    return isSubgraphTest;
}
