import { SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { VisualEntitiesWithOutsiders, XY } from "../../index.ts";
import { Graph } from "./graph.ts";
import { isSemanticModelGeneralization, SemanticModelGeneralization, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { VISUAL_PROFILE_RELATIONSHIP_TYPE, VISUAL_RELATIONSHIP_TYPE, VisualModel, VisualProfileRelationship, VisualRelationship } from "@dataspecer/visual-model";
import { AllowedEdgeBundleTypes, ExtractedModels } from "../../layout-algorithms/entity-bundles.ts";
import { capitalizeFirstLetter, createIdentifier } from "../../util/utils.ts";
import { Node } from "./node.ts";

export type AllowedEdgeTypes = SemanticModelGeneralization |
                        SemanticModelRelationship |
                        SemanticModelRelationshipProfile |
                        null;


export interface Edge {
    /**
     * The graph in which the edge lies, this is relevant for example for ELK layouting library,
     * where the edges have to be stored within the relevant wrapper graph.
     */
    sourceGraph: Graph;

    /**
     * Is the model of the semantic edge (that is {@link semanticEntityRepresentingEdge}) represented by this (interface).
     */
    sourceModelIdentifier: string | null;

    /**
     * Identifier of the edge, can be different from the edge id, for example when splitting
     */
    id: string;
    /**
     * is the edge in the semantic model or null.
     */
    semanticEntityRepresentingEdge: AllowedEdgeTypes;
    /**
     * If true, then it is dummy edge which doesn't exist in the semantic model.
     */
    isDummy: boolean;
    /**
     * What type of edge this is in profile sense
     */
    edgeProfileType: EdgeProfileType;
    /**
     * If true then this edge is part of the layouted graph, therefore it should be considered, otherwise it is not considered in layouting.
     */
    isConsideredInLayout: boolean;

    layoutOptions: Record<string, string>;
    /**
     * If true then the direction of this edge is reversed in the layouting algorithm
     */
    reverseInLayout: boolean;

    /**
     * Represents the source from which the edge goes.
     */
    start: EdgeEndPoint;
    /**
     * Represents the target from which the edge goes.
     */
    end: EdgeEndPoint;

    visualEdge: VisualEdge;

    /**
     * Converts the edge into visual entity which can be used in the visual model.
     */
    convertToDataspecerRepresentation(): VisualRelationship | VisualProfileRelationship | null;

    /**
     * Represents the type of edge.
     */
    edgeType: OutgoingEdgeType
}

class VisualEdge {
    constructor(visualEdge: VisualRelationship | VisualProfileRelationship | null, isOutsider: boolean) {
        this.visualEdge = visualEdge;
        this.isOutsider = isOutsider;
    }

    visualEdge: VisualRelationship | VisualProfileRelationship | null;

    /**
     * True if edge has one end it outsider node, therefore it was artificially created. Otherwise it comes from visual model.
     * In case when we didn't have any visual model on input, this property can be safely ignored. (It is always false.)
     */
    isOutsider: boolean;
}


/**
 * Represents the graph edge.
 */
export class DefaultEdge implements Edge {
    /**
     * Adds edge to given {@link graph}
     * @param extractedModels used to search for source model of edge - so not needed for non-semantic edges
     * @returns
     */
    static addNewEdgeToGraph(
        graph: Graph,
        identifier: string | null,
        visualEdge: VisualRelationship | VisualProfileRelationship | null,
        semanticEdge: AllowedEdgeTypes | null,
        sourceIdentifier: string,
        targetIdentifier: string,
        extractedModels: ExtractedModels | null,
        edgeToAddKey: OutgoingEdgeType | null | undefined,
    ): Edge | null {
        if(edgeToAddKey === null || edgeToAddKey === undefined) {
            edgeToAddKey = "outgoingRelationshipEdges";
        }

        const reverseEdgeToAddKey: IncomingEdgeType = convertOutgoingEdgeTypeToIncoming(edgeToAddKey);
        const mainGraph = graph.mainGraph;
        const source = mainGraph.findNodeInAllNodes(sourceIdentifier);
        const target = mainGraph.findNodeInAllNodes(targetIdentifier);

        if(source === undefined) {
            console.warn("The source node for edge does not exists");
            return;
        }
        else if(target === undefined) {
            console.warn("The target node for edge does not exists");
            return;
        }


        let sourceModelIdentifierForEdge: string | null = null;
        if(extractedModels !== null) {
            if(edgeToAddKey === "outgoingClassProfileEdges") {
                sourceModelIdentifierForEdge = source.sourceModelIdentifier ?? null;
            }
            else {
                sourceModelIdentifierForEdge = extractedModels.entities
                    .find(entity => entity.semanticEntity.id === semanticEdge?.id)?.sourceModelIdentifier ?? null;
            }
        }


        const edge: Edge = new DefaultEdge(
            identifier, visualEdge, semanticEdge, edgeToAddKey, graph,
            source, target, sourceModelIdentifierForEdge);
        const reverseEdge: Edge = edge;

        source[edgeToAddKey].push(edge);
        target[reverseEdgeToAddKey].push(reverseEdge);

        return edge
    }

    private constructor(
        identifier: string | null,
        visualRelationship: VisualRelationship | VisualProfileRelationship | null,
        semanticEdge: AllowedEdgeTypes | null,
        edgeType: OutgoingEdgeType,
        sourceGraph: Graph,
        start: EdgeEndPoint,
        end: EdgeEndPoint,
        sourceModelIdentifier: string | null,
    ) {
        this.sourceGraph = sourceGraph;
        this.isDummy = false;
        this.sourceModelIdentifier = sourceModelIdentifier;

        this.edgeProfileType = convertOutgoingEdgeTypeToEdgeProfileType(edgeType);
        this.edgeType = edgeType;
        this.semanticEntityRepresentingEdge = semanticEdge;
        this.start = start;
        this.end = end;

        this.visualEdge = this.createVisualEdgeBasedOnData(visualRelationship, semanticEdge, this.edgeProfileType, sourceModelIdentifier, start, end);
        this.id = identifier ?? this.visualEdge.visualEdge.identifier;
        sourceGraph.mainGraph.insertInAllEdges(this);
    }

    sourceGraph: Graph;

    sourceModelIdentifier: string | null;
    id: string;
    semanticEntityRepresentingEdge: AllowedEdgeTypes | null;
    isDummy: boolean;
    edgeProfileType: EdgeProfileType;
    isConsideredInLayout: boolean = true;
    reverseInLayout: boolean = false;

    start: EdgeEndPoint;
    end: EdgeEndPoint;

    visualEdge: VisualEdge;

    edgeType: OutgoingEdgeType;

    layoutOptions: Record<string, string> = {};

    convertToDataspecerRepresentation(): VisualRelationship | VisualProfileRelationship | null {
        return this.visualEdge.visualEdge;
    }

    /**
     * The semantic information about represented relationship may be missing
     */
    private createNewVisualRelationshipBasedOnEndPoints(
        start: EdgeEndPoint,
        end: EdgeEndPoint,
        edgeProfileType: EdgeProfileType,
        sourceModelIdentifier: string | null,
    ): VisualRelationship | VisualProfileRelationship {
        // TODO Hard to solve by myself - Radstr:
        //      It makes sense to use the cme methods to create the visual entities - Instead of implementing it all again - just define method and call it
        //      ... for example I am not sure the type should cotnain only the VISUAL_RELATIONSHIP_TYPE or also some other type, so for such cases constistency would be nice
        //      But currently it seems sufficient
        if(edgeProfileType === "CLASS-PROFILE") {
            const edgeToReturn: VisualProfileRelationship = {
                identifier: createIdentifier(),
                entity: start?.semanticEntityRepresentingNode?.id ?? "",
                type: [VISUAL_PROFILE_RELATIONSHIP_TYPE],
                waypoints: [],
                model: sourceModelIdentifier ?? "",
                visualSource: start.id,
                visualTarget: end.id,
            };

            return edgeToReturn;
        }
        else {
            const edgeToReturn: VisualRelationship = {
                identifier: createIdentifier(),
                representedRelationship: "",
                type: [VISUAL_RELATIONSHIP_TYPE],
                waypoints: [],
                model: sourceModelIdentifier ?? "",
                visualSource: start.id,
                visualTarget: end.id,
            };

            return edgeToReturn;
        }
    }


    /**
     * @returns Either returns visual edge if given or creates new one based on semantic data
     */
    private createVisualEdgeBasedOnData(
        visualRelationship: VisualRelationship | VisualProfileRelationship | null,
        semanticEdge: AllowedEdgeTypes | null,
        edgeProfileType: EdgeProfileType,
        sourceModelIdentifier: string | null,
        start: EdgeEndPoint,
        end: EdgeEndPoint,
    ): VisualEdge {
        if(visualRelationship !== null) {
            return new VisualEdge(visualRelationship, false);
        }
        else if(semanticEdge !== null) {
            const createdVisualRelationship = createNewVisualRelationshipBasedOnSemanticData(
                semanticEdge, edgeProfileType, sourceModelIdentifier, start, end);
            return new VisualEdge(createdVisualRelationship, true);
        }
        else {
            return new VisualEdge(this.createNewVisualRelationshipBasedOnEndPoints(start, end, edgeProfileType, sourceModelIdentifier), true);
        }
    }
}

/**
 * @deprecated It probably works, but I am no longer using it anywhere
 */
const checkIfEdgeHasAtLeastOneOutsider = (
  outsiders: Record<string, XY | null>,
  start: string,
  end: string
): boolean => {
  return outsiders[start] !== undefined || outsiders[end] !== undefined;
}

/**
 * @deprecated It probably works, but I am no longer using it anywhere
 * @returns Returns true if the relationship is inside the visual model or the model is null.
 */
const isRelationshipInVisualModel = (
    visualModel: VisualModel,
    entitiesToLayout: VisualEntitiesWithOutsiders,
    relationshipIdentifier: string,
    ends: [string, string]
): boolean => {
    if(visualModel === null) {
        return true;
    }

    const isAtLeastOneEndOutsider = checkIfEdgeHasAtLeastOneOutsider(entitiesToLayout.outsiders, ends[0], ends[1]);
    const visualEntity = visualModel.getVisualEntity(relationshipIdentifier);
    const isPresentInVisualModel = visualEntity !== null || isAtLeastOneEndOutsider;
    return isPresentInVisualModel;
};

/**
 * @returns Returns true if the class is inside the visual model or if the model is null.
 */
const isClassInLayoutedEntities = (
    visualModel: VisualModel,
    entitiesToLayout: VisualEntitiesWithOutsiders,
    classIdentifier: string
): boolean => {
    if(visualModel === null) {
        return true;
    }

    const visualEntities = visualModel.getVisualEntitiesForRepresented(classIdentifier);
    let isPresentInVisualEntitiesToLayout = false;
    for (const visualEntity of visualEntities) {
        isPresentInVisualEntitiesToLayout = isPresentInVisualEntitiesToLayout || entitiesToLayout.visualEntities.includes(visualEntity.identifier);
    }

    const isPresentInVisualModel = isPresentInVisualEntitiesToLayout ||
                                    entitiesToLayout.outsiders[classIdentifier] !== undefined;
    return isPresentInVisualModel;
};

/**
 * @deprecated It probably works, but I am no longer using it anywhere
 * @returns Returns true if both ends of the generalization exists in the visual model
 */
const isGeneralizationInVisualModel = (
    visualModel: VisualModel,
    entitiesToLayout: VisualEntitiesWithOutsiders,
    generalization: SemanticModelGeneralization
): boolean => {
    if(visualModel === null) {
        return true;
    }

    const isChildPresentInVisualModel = isClassInLayoutedEntities(visualModel, entitiesToLayout, generalization.child);
    const isParentPresentInVisualModel = isClassInLayoutedEntities(visualModel, entitiesToLayout, generalization.parent);
    return isChildPresentInVisualModel && isParentPresentInVisualModel;
};

/**
 * Possible edge point is either node or another subgraph.
 */
export type EdgeEndPoint = Node | Graph;

type EdgeProfileType = "EDGE" | "EDGE-PROFILE" | "CLASS-PROFILE";
function convertOutgoingEdgeTypeToEdgeProfileType(outgoingEdgeType: OutgoingEdgeType): EdgeProfileType {
    switch(outgoingEdgeType) {
        case "outgoingClassProfileEdges":
            return "CLASS-PROFILE"
        case "outgoingProfileEdges":
            return "EDGE-PROFILE"
        case "outgoingGeneralizationEdges":
        case "outgoingRelationshipEdges":
            return "EDGE"
        default:
            throw new Error(`Invalid OutgoingEdgeType - ${outgoingEdgeType}`);
    }
}


export const getEdgeTypeNameFromEdge = (edge: Edge): OutgoingEdgeType => {
    if(edge.edgeProfileType === "EDGE-PROFILE") {
        return "outgoingProfileEdges";
    }
    else if(edge.edgeProfileType === "CLASS-PROFILE") {
        return "outgoingClassProfileEdges"
    }
    else if(edge.edgeProfileType === "EDGE") {
        if(isSemanticModelGeneralization(edge.semanticEntityRepresentingEdge)) {
            return "outgoingGeneralizationEdges";
        }
        else {
            return "outgoingRelationshipEdges";
        }
    }
    else {
        throw new Error(`Edge of this ${edge.edgeProfileType} type doesn't exist`);
    }
}


/**
 * The type which contains field names of the outgoing edges in {@link Node},
 * this is useful to minimize copy-paste of code, we just access the fields on node through node[key: OutgoingEdgeType].
 */
type OutgoingEdgeType = "outgoingRelationshipEdges" | "outgoingGeneralizationEdges" | "outgoingProfileEdges" | "outgoingClassProfileEdges";
export type AllowedEdgeBundleWithType = {
    semanticRelationship: AllowedEdgeBundleTypes,
    type: OutgoingEdgeType,
};


/**
 * Same as {@link OutgoingEdgeType}, but for incoming edges.
 */
type IncomingEdgeType = "incomingRelationshipEdges" | "incomingGeneralizationEdges" | "incomingProfileEdges" | "incomingClassProfileEdges" ;

export const convertOutgoingEdgeTypeToIncoming = (outgoingEdgeType: OutgoingEdgeType): IncomingEdgeType => {
    return "incoming" + capitalizeFirstLetter(outgoingEdgeType.slice("outgoing".length)) as IncomingEdgeType
};


function createNewVisualRelationshipBasedOnSemanticData(
    semanticEdge: AllowedEdgeTypes,
    edgeProfileType: EdgeProfileType,
    sourceModelIdentifier: string | null,
    start: EdgeEndPoint,
    end: EdgeEndPoint,
): VisualRelationship | VisualProfileRelationship {
    // TODO Hard to solve by myself - Radstr:
    //      It makes sense to use the cme methods to create the visual entities - Instead of implementing it all again - just define method and call it
    //      ... for example I am not sure the type should cotnain only the VISUAL_PROFILE_RELATIONSHIP_TYPE or also some other type, so for such cases constistency would be nice
    //      But currently it seems sufficient
    if(edgeProfileType === "CLASS-PROFILE") {
        const edgeToReturn: VisualProfileRelationship = {
            identifier: createIdentifier(),
            entity: start.semanticEntityRepresentingNode.id,
            type: [VISUAL_PROFILE_RELATIONSHIP_TYPE],
            waypoints: [],
            model: sourceModelIdentifier ?? "",
            visualSource: start.id,
            visualTarget: end.id,
        };

        return edgeToReturn;
    }

    const edgeToReturn: VisualRelationship = {
        identifier: createIdentifier(),
        type: [VISUAL_RELATIONSHIP_TYPE],
        representedRelationship: semanticEdge.id,
        waypoints: [],
        model: sourceModelIdentifier ?? "",
        visualSource: start.id,
        visualTarget: end.id,
    };

    return edgeToReturn;
}
