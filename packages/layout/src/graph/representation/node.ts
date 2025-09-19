import { VISUAL_NODE_TYPE, VisualDiagramNode, VisualModel, VisualNode } from "@dataspecer/visual-model";
import { addToRecordArray, createIdentifier, placePositionOnGrid } from "../../util/utils.ts";
import { Graph, MainGraph } from "./graph.ts";
import { SemanticModelEntity, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { ExtractedModels, getEdgeSourceAndTargetRelationship } from "../../layout-algorithms/entity-bundles.ts";
import { ExplicitAnchors, VisualEntitiesWithOutsiders, XY } from "../../index.ts";
import { isEntityWithIdentifierAnchored } from "../../explicit-anchors.ts";
import { Edge } from "./edge.ts";

export type AllowedVisualsForNodes = VisualNode | VisualDiagramNode;

/**
 * Represents visual node as in the cme visual model, but with couple of additional fields -
 * {@link width}, {@link height}, {@link isOutsider} and {@link isAnchored}, which is internal anchor,
 * because in some cases we want to anchor nodes which were not originally and anchored and also the other way around.
 * The {@link isOutsider} is used to mark nodes, which were NOT part of given visual model. We have this variable, because sometimes we want to layout nodes
 * which are not (yet) part of the visual model. In case when we didn't have any visual model on input, this property can be safely ignored. (It is always false.)
 */
export class VisualNodeComplete {
    coreVisualNode: AllowedVisualsForNodes;
    width: number;
    height: number;
    isAnchored: boolean;
    isOutsider: boolean;

    constructor(
        coreVisualNode: AllowedVisualsForNodes,
        width: number,
        height: number,
        useCopyOfCoreVisualNode: boolean,
        isOutsider: boolean,
        isAnchored?: boolean
    ) {
        if(useCopyOfCoreVisualNode) {
            this.coreVisualNode = {...coreVisualNode};
        }
        else {
            this.coreVisualNode = coreVisualNode;
        }
        this.width = width;
        this.height = height;
        this.isOutsider = isOutsider;
        if(isAnchored === undefined) {
            this.isAnchored = coreVisualNode?.position?.anchored ?? false;
        }
        else {
            this.isAnchored = isAnchored;
        }
    }

    /**
     * Sets the position to given one, and puts the result on grid.
     */
    setPositionInCoreVisualNode(newX: number, newY: number) {
        this.coreVisualNode.position.x = newX;
        this.coreVisualNode.position.y = newY;
        placePositionOnGrid(this.coreVisualNode.position, 10, 10);
    }

    addToPositionInCoreVisualNode(x: number, y: number) {
        const newX = this.coreVisualNode.position.x + x;
        const newY = this.coreVisualNode.position.y + y;
        this.setPositionInCoreVisualNode(newX, newY);
    }
}


/**
 * Interface which represents graph node ... Note that subgraph is also graph node.
 */
export interface Node {
    /**
     * Reference to the main graph, this node is part of.
     */
    mainGraph: MainGraph;
    /**
     *  We need {@link id}, because some nodes don't have equivalent in the semantic model or are dummy nodes
     */
    id: string;

    /**
     * is the SemanticModelEntity representing node.
     */
    semanticEntityRepresentingNode: SemanticModelEntity | null;
    isDummy: boolean;
    isProfile: boolean;

    /**
     * It represents possible classes of which this node is profile of.
     */
    outgoingClassProfileEdges: Array<Edge>;
    incomingClassProfileEdges: Array<Edge>;

    isConsideredInLayout: boolean;

    layoutOptions: Record<string, string>;

    sourceModelIdentifier: string | null;

    /**
     * The outgoing relationship edges, so the edges, where instance of this node is the source/start.
     */
    outgoingRelationshipEdges: Array<Edge>;
    /**
     * The incoming relationship edges, so the edges, where instance of this node is the target/end.
     */
    incomingRelationshipEdges: Array<Edge>;

    /**
     * The outgoing generalization edges, so the edges, where instance of this node is the child, i.e. source/start.
     */
    outgoingGeneralizationEdges: Array<Edge>;
    /**
     * The incoming generalization edges, so the edges, where instance of this node is the parent, i.e. target/end.
     */
    incomingGeneralizationEdges: Array<Edge>;

    /**
     * The outgoing profiled relationship edges, so the edges, where instance of this node is the source/start.
     */
    outgoingProfileEdges: Array<Edge>;
    /**
     * The incoming profiled relationship edges, so the edges, where instance of this node is the target/end.
     */
    incomingProfileEdges: Array<Edge>;

    /**
     * @returns Returns generator which can be iterated to get edges of all types, where the node is source/start.
     */
    getAllOutgoingEdges(): Generator<Edge>;
    /**
     * @returns Returns generator which can be iterated to get edges of all types, where the node is target/end.
     */
    getAllIncomingEdges(): Generator<Edge>;
    /**
     * @returns Returns generator which can be iterated to get edges of all types, where the node is either source or target.
     */
    getAllEdges(): Generator<Edge>;

    /**
    * @returns Returns generator which can be iterated to get edges of all types, where the node is source/start.
    * But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
    * (there is at most one edge between 2 nodes and no loops).
    * After the generator is depleted, the map which maps visited nodes to true is returned
    */
    getAllIncomingUniqueEdges(): Generator<Edge, Record<string, true>, unknown>;

    /**
     * @returns Returns generator which can be iterated to get edges of all types, where the node is target/end.
    * But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
    * (there is at most one edge between 2 nodes and no loops)
    * After the generator is depleted, the map which maps visited nodes to true is returned
    */
    getAllOutgoingUniqueEdges(): Generator<Edge, Record<string, true>, unknown>;

    /**
     * @returns Returns generator which can be iterated to get edges of all types, where the node is either source or target.
    * But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
    * (there is at most one edge between 2 nodes and no loops)
    * After the generator is depleted, the map which maps visited nodes to true is returned
    */
    getAllUniqueEdges(): Generator<Edge, Record<string, true>, unknown>;

    /**
     * The complete visual entity for the node
     */
    completeVisualNode: VisualNodeComplete;

    /**
     * Returns attributes of this node.
     */
    getAttributes(): SemanticModelRelationship[];

    /**
     * Returns the source graph of the node. So the subgraph where the node lies (the most inner one)
     */
    getSourceGraph(): Graph | null;
    /**
     * Sets the source graph of node to given {@link sourceGraph}
     */
    setSourceGraph(sourceGraph: Graph) : void;

    convertToDataspecerRepresentation(): AllowedVisualsForNodes | null;

}


export class DefaultNode implements Node {
  constructor(
      mainGraph: MainGraph,
      visualNode: AllowedVisualsForNodes | null,
      semanticEntityRepresentingNode: SemanticModelEntity | null,
      isProfile: boolean,
      sourceModelIdentifier: string | null,
      extractedModels: ExtractedModels | null,
      sourceGraph: Graph,
      explicititPosition: XY | null,
      isDummy: boolean = false,
      explicitAnchors?: ExplicitAnchors
  ) {
      this.mainGraph = mainGraph;
      this.sourceModelIdentifier = sourceModelIdentifier;

      this.sourceGraph = sourceGraph;
      this.semanticEntityRepresentingNode = semanticEntityRepresentingNode;
      this.isProfile = isProfile;
      this.isDummy = isDummy;

      if(extractedModels === null) {
          return;
      }


      // We don't really need the whole thing.
      // We just need the attribute so storing the target of the relationship should be enough !
      // But we store it all for now.
      this.attributes = extractedModels.attributes.filter(attributesBundle => {
          const {source, target, ...rest} = getEdgeSourceAndTargetRelationship(attributesBundle.semanticRelationship);
          return this?.semanticEntityRepresentingNode?.id === source;
      }).map(attributeBundle => attributeBundle.semanticRelationship);
      if(visualNode !== null) {
          // Kind of ugly,
          // but the reason why need to do this is because the Reactflow dimension handlers, need the id.
          this.id = visualNode.identifier;
      }
      const width = this.mainGraph.nodeDimensionQueryHandler.getWidth(this);
      const height = this.mainGraph.nodeDimensionQueryHandler.getHeight(this);

      const isOutsider = visualNode === null;
      if(visualNode === null) {
          let isAnchored = false;
          if(explicitAnchors !== undefined) {
              isAnchored = isEntityWithIdentifierAnchored(semanticEntityRepresentingNode.id, explicitAnchors, false);
          }
          const coreVisualNode = DefaultNode.createNewVisualNodeBasedOnSemanticData(
              explicititPosition, this.semanticEntityRepresentingNode.id, this.sourceModelIdentifier);
          this.completeVisualNode = new VisualNodeComplete(coreVisualNode, width, height, false, isOutsider, isAnchored);
      }
      else {
          let isAnchored: boolean = visualNode.position.anchored ?? false;
          if(explicitAnchors !== undefined) {
              isAnchored = isEntityWithIdentifierAnchored(visualNode.identifier, explicitAnchors, isAnchored);
          }

          this.completeVisualNode = new VisualNodeComplete(visualNode, width, height, true, isOutsider, isAnchored);

          if(explicititPosition !== null) {
              this.completeVisualNode.coreVisualNode.position = {
                  ...explicititPosition,
                  anchored: this.completeVisualNode.coreVisualNode.position.anchored
              };
          }
      }
      this.id = this.completeVisualNode.coreVisualNode.identifier;

      sourceGraph.nodes[this.id] = this;
      mainGraph.insertInAllNodes(this);
      if(semanticEntityRepresentingNode === null) {
          addToRecordArray(this.id, this, this.mainGraph.semanticNodeToVisualMap);
      }
      else {
          addToRecordArray(semanticEntityRepresentingNode.id, this, this.mainGraph.semanticNodeToVisualMap);
      }
  }

  static createNewVisualNodeBasedOnSemanticData(
      position: XY | null,
      semanticEntityRepresentingNodeIdentifier: string,
      sourceModelIdentifier: string | null
  ) {
      if(position === null) {
          position = {x: 0, y: 0};
      }
      return {
          identifier: createIdentifier(),
          type: [VISUAL_NODE_TYPE],
          representedEntity: semanticEntityRepresentingNodeIdentifier,
          position: {
              x: position.x,
              y: position.y,
              anchored: null,
          },
          content: [],
          visualModels: [],
          model: sourceModelIdentifier ?? "",
      };
  }

  getSourceGraph(): Graph {
      return this.sourceGraph;
  }

  setSourceGraph(sourceGraph: Graph): void {
      this.sourceGraph = sourceGraph;
  }
  getAttributes(): SemanticModelRelationship[] {
      return this.attributes;
  }

  convertToDataspecerRepresentation(): AllowedVisualsForNodes | null {
      return this.completeVisualNode?.coreVisualNode ?? null;
  }

  mainGraph: MainGraph;
  sourceGraph: Graph;

  id: string;
  sourceModelIdentifier: string | null;

  semanticEntityRepresentingNode: SemanticModelEntity | null;
  isDummy: boolean;
  isProfile: boolean;

  completeVisualNode: VisualNodeComplete;
  attributes: SemanticModelRelationship[];
  isConsideredInLayout: boolean = true;

  layoutOptions: Record<string, string> = {};

  outgoingClassProfileEdges: Array<Edge> = [];
  incomingClassProfileEdges: Array<Edge> = [];

  outgoingProfileEdges: Edge[] = [];
  incomingProfileEdges: Edge[] = [];

  outgoingGeneralizationEdges: Edge[] = [];
  incomingGeneralizationEdges: Edge[] = [];

  outgoingRelationshipEdges: Edge[] = [];
  incomingRelationshipEdges: Edge[] = [];
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
}


/**
* @returns Returns generator which can be iterated to get edges of all types, where {@link node} is target/end.
*/
export function getAllIncomingEdges(node: Node): Generator<Edge> {
  const internalGenerator = getEdgesInternal(
    [node.incomingRelationshipEdges, node.incomingGeneralizationEdges,
        node.incomingProfileEdges, node.incomingClassProfileEdges]);
  return internalGenerator;
}


/**
* @returns Returns generator which can be iterated to get edges of all types, where {@link node} is source/start.
*/
export function getAllOutgoingEdges(node: Node): Generator<Edge> {
  // Note: I couldn't find out, why can't I just somehow return the internals of the getEdgesInternal function
  // Answer: I just had to remove the * in front of method to say that it just returns the generator and isn't the generator in itself
  const internalGenerator = getEdgesInternal(
    [node.outgoingRelationshipEdges, node.outgoingGeneralizationEdges,
        node.outgoingProfileEdges, node.outgoingClassProfileEdges]);
  return internalGenerator;
}

/**
* Internal method to create generator from the given edges of different types.
*/
function *getEdgesInternal(edgesOfDifferentTypes: Array<Array<Edge>>): Generator<Edge> {
  for(const edgesOfOneType of edgesOfDifferentTypes) {
      // Note: Can't use forEach because of yield
      for(const e of edgesOfOneType) {
          yield e;
      }
  }
}

/**
* @returns Returns generator which can be iterated to get edges, where {@link node} is either start or end.
*/
export function *getAllEdges(node: Node): Generator<Edge> {
  const incomingEdges = node.getAllIncomingEdges();
  const outgoingEdges = node.getAllOutgoingEdges();
  yield* incomingEdges;
  yield* outgoingEdges;
}


/**
* @returns Returns generator which can be iterated to get edges of all types, where {@link node} is target/end.
* But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
* (there is at most one edge between 2 nodes and no loops)
* After the generator is depleted, the map which maps visited nodes to true is returned
*/
export function getAllIncomingUniqueEdges(
    node: Node,
    endsWhichAreAlreadyProcessed: Record<string, true> | null
): Generator<Edge, Record<string, true>, unknown> {
    const internalGenerator = getEdgesUniqueInternal(node.id,
        [node.incomingRelationshipEdges, node.incomingGeneralizationEdges,
            node.incomingProfileEdges, node.incomingClassProfileEdges],
        endsWhichAreAlreadyProcessed);
    return internalGenerator;
  }


  /**
  * @returns Returns generator which can be iterated to get edges of all types, where {@link node} is source/start.
  * But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
  * (there is at most one edge between 2 nodes and no loops)
  * After the generator is depleted, the map which maps visited nodes to true is returned
  */
  export function getAllOutgoingUniqueEdges(
    node: Node,
    endsWhichAreAlreadyProcessed: Record<string, true> | null
): Generator<Edge, Record<string, true>, unknown> {
    // Note: I couldn't find out, why can't I just somehow return the internals of the getEdgesInternal function
    // Answer: I just had to remove the * in front of method to say that it just returns the generator and isn't the generator in itself
    const internalGenerator = getEdgesUniqueInternal(node.id,
        [node.outgoingRelationshipEdges, node.outgoingGeneralizationEdges,
            node.outgoingProfileEdges, node.outgoingClassProfileEdges],
        endsWhichAreAlreadyProcessed);
    return internalGenerator;
  }

  /**
  * Internal method to create generator from the given edges of different types.
  * Returning only those with unique ends.
  * After the generator is depleted, the map which maps visited nodes to true is returned
  * @param rootNode is the node which is contained in all of the edges
  *
  */
  function *getEdgesUniqueInternal(
    rootNode: string,
    edgesOfDifferentTypes: Array<Array<Edge>>,
    endsWhichAreAlreadyProcessed: Record<string, true> | null
): Generator<Edge, Record<string, true>, unknown> {
    const noLongerUniqueEnds: Record<string, true> = {
        [rootNode]: true,
        ...(endsWhichAreAlreadyProcessed ?? {})
    };
    for(const edgesOfOneType of edgesOfDifferentTypes) {
        // Note: Can't use forEach because of yield
        for(const e of edgesOfOneType) {
            if(noLongerUniqueEnds[e.start.id] !== undefined && noLongerUniqueEnds[e.end.id] !== undefined) {
                continue;
            }
            yield e;
            noLongerUniqueEnds[e.start.id] = true;
            noLongerUniqueEnds[e.end.id] = true;
        }
    }

    return noLongerUniqueEnds;
  }

  /**
  * @returns Returns generator which can be iterated to get edges, where {@link node} is either start or end.
  * But only those which have unique end. That is we return only those edges, so the resulting subgraph is not a multi-graph
  * (there is at most one edge between 2 nodes and no loops).
  * After the generator is depleted, the map which maps visited nodes to true is returned
  */
  export function *getAllUniqueEdges(node: Node): Generator<Edge, Record<string, true>, unknown> {
    const incomingEdges = getAllIncomingUniqueEdges(node, null);
    yield* incomingEdges;
    let noLongerUniqueEnds = incomingEdges.next();
    while(!noLongerUniqueEnds.done) {
        noLongerUniqueEnds = incomingEdges.next();
    }
    const outgoingEdges = getAllOutgoingUniqueEdges(node, noLongerUniqueEnds.value);
    yield* outgoingEdges;
    noLongerUniqueEnds = outgoingEdges.next();
    while(!noLongerUniqueEnds.done) {
        noLongerUniqueEnds = outgoingEdges.next();
    }
    return noLongerUniqueEnds.value;
  }




/**
 * @returns Returns true if the node is inside the visual model or
 * if the model is null or if the given {@link classIdentifier} is inside {@link outsiders}.
 */
export const isNodeInVisualModel = (
  visualModel: VisualModel,
  entitiesToLayout: VisualEntitiesWithOutsiders,
  node: AllowedVisualsForNodes | null,
  classIdentifier: string | undefined | null
): boolean => {
  if(visualModel === null) {
      return true;
  }
  if(node !== null) {
    return true;
  }
  if(classIdentifier === undefined || classIdentifier === null) {
    return false;
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

export function addNodeToGraph(
    mainGraph: MainGraph,
    node: AllowedVisualsForNodes | null,
    semanticEntityRepresentingNode: SemanticModelEntity | null,
    isProfile: boolean,
    sourceModelIdentifier: string | null,
    extractedModels: ExtractedModels,
    sourceGraph: Graph,
    visualModel: VisualModel,
    entitiesToLayout: VisualEntitiesWithOutsiders,
    explicititPosition: XY | null,
    isDummy: boolean = false,
    explicitAnchors?: ExplicitAnchors
): boolean {
    if(isNodeInVisualModel(visualModel, entitiesToLayout, node, semanticEntityRepresentingNode?.id)) {
        new DefaultNode(
            mainGraph, node, semanticEntityRepresentingNode,
            isProfile, sourceModelIdentifier,
            extractedModels, sourceGraph,
            explicititPosition, isDummy, explicitAnchors);
        return true;
    }

    return false;
}