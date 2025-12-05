import { EntityModel } from "@dataspecer/core-v2";
import { NodeDimensionQueryHandler, VisualEntitiesWithOutsiders } from "../../index.ts";
import { ExplicitAnchors } from "../../explicit-anchors.ts";
import { ExtractedModels } from "../../layout-algorithms/entity-bundles.ts";
import { PhantomElementsFactory } from "../../util/utils.ts";
import { DefaultGraph, Graph, MainGraph, DefaultMainGraph } from "./graph.ts";
import { VisualModel } from "@dataspecer/visual-model";
import { EdgeEndPoint } from "./edge.ts";

/**
 * Factory class to create graphs with.
 */
export class GraphFactory {
    /**
     * Creates graph, which is put inside the {@link mainGraph}
     * @param nodeContentOfGraph the nodes which are part of the new subgraph.
     *                           The nodes are put inside of the created subgraph and in the {@link sourceGraph} are shown as one node - the newly created graph.
     * @param shouldSplitEdges if set to true, then split edges. If set to false, then just paste in the subgraph the nodes, but this results in edges going from
     * the subgraph to possibly other subgraphs, which for example elk can not deal with. In Elk the edges have to go between nodes on the same level.
     * So for this edges the split edges option. Then edge is split into 2 or 3 parts. (Note: If the edge is inside the subgraph it is kept)
     * 1st edge - From the node in the subgraph to the subgraph.
     * 2nd edge - Either the edge straight to the node, if it doesn't lies within different subgraph, or of it does, then the next part of edge goes between the subgraphs.
     * 3rd edge - from the other subgraph to the other end of the original edge.
     * @returns the created subgraph
     */
    public static createGraph(
        mainGraph: MainGraph,
        sourceGraph: Graph,
        graphIdentifier: string,
        nodeContentOfGraph: Array<EdgeEndPoint>,
        isDummy: boolean,
        shouldSplitEdges: boolean
    ): Graph {
        const graph = new DefaultGraph();
        graph.initializeWithGivenContent(
            mainGraph, sourceGraph, graphIdentifier,
            nodeContentOfGraph, isDummy, mainGraph.nodeDimensionQueryHandler);
        sourceGraph.insertSubgraphToGraph(graph, nodeContentOfGraph, shouldSplitEdges);
        return graph;
    }


    /**
     * Creates instance of main graph. Main graph should be only one at the top
     * Main graph is like classic subgraph, but contains additional data about all the entities stored in graph.
     */
    public static createMainGraph(
        graphIdentifier: string | null,
        inputModels: Map<string, EntityModel> | ExtractedModels | null,
        visualModel: VisualModel,
        entitiesToLayout: VisualEntitiesWithOutsiders,
        nodeDimensionQueryHandler?: NodeDimensionQueryHandler | null,
        explicitAnchors?: ExplicitAnchors
    ): MainGraph {
        if(graphIdentifier === null) {
            graphIdentifier = PhantomElementsFactory.createUniquePhanomNodeIdentifier();
        }
        const graph = new DefaultMainGraph();
        graph.initialize(
            graph, graph, graphIdentifier, inputModels, false,
            visualModel, entitiesToLayout, nodeDimensionQueryHandler, explicitAnchors);
        return graph;
    }
}