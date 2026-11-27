import { ConfigurationsContainer } from "../../configurations/configurations-container.ts";
import { Graph, MainGraph, } from "../../graph/representation/graph.ts";
import { LayoutAlgorithm } from "../layout-algorithms-interfaces.ts";
import { AllowedVisualsForNodes } from "../../graph/representation/node.ts";


/**
 * Layout nodes of given graph using custom made random layout algorithm.
 */
export async function doRandomLayoutAdvancedFromGraph(graph: Graph): Promise<MainGraph> {
    const classNodes = Object.values(graph.nodes).filter(node => !node.isDummy);
    classNodes.forEach(classNode => {
        let visualNode: AllowedVisualsForNodes;
        if(classNode?.completeVisualNode?.isAnchored === true) {
            visualNode = classNode.completeVisualNode.coreVisualNode;
        }
        else {
            classNode.completeVisualNode.setPositionInCoreVisualNode(Math.ceil(Math.random() * 400 * Math.sqrt(classNodes.length)),
                                                                     Math.ceil(Math.random() * 250 * Math.sqrt(classNodes.length)));
            for (const edge of classNode.getAllOutgoingEdges()) {
                edge.visualEdge.visualEdge.waypoints = [];
            }
        }
    });
    return graph.mainGraph;
}


/**
 * The run method of this class performs random layout of prepared graph.
 */
export class RandomLayout implements LayoutAlgorithm {

    prepareFromGraph(graph: Graph, _configurations: ConfigurationsContainer): void {
        this.graph = graph;
    }

    runGeneralizationLayout(): Promise<MainGraph> {
        throw new Error("Implement me if necessary");
    }
    run(): Promise<MainGraph> {
        return doRandomLayoutAdvancedFromGraph(this.graph);
    }

    private graph: Graph;
}
