import { Position } from "@dataspecer/visual-model";
import { Graph } from "../../representation/graph.ts";
import { AllMetricData, ComputedMetricValues, Metric } from "../graph-metric.ts";
import { findNodeBorder } from "../../../util/utils.ts";
import { XY } from "../../../index.ts";
import { VisualNodeComplete } from "../../representation/node.ts";

/**
 * Metric for the number of crossing edges
 */
export class EdgeCrossingMetric implements Metric {
    computeMetric(graph: Graph): ComputedMetricValues {
        let edgeCrossingCount: number = 0;
        const nodes = Object.values(graph.nodes);
        nodes.forEach(sourceNode1 => {
            for(let edge1 of sourceNode1.getAllOutgoingEdges()) {
                nodes.forEach(sourceNode2 => {
                    if(sourceNode1 === sourceNode2) {
                        return;
                    }
                    for(let edge2 of sourceNode2.getAllOutgoingEdges()) {
                        if(edge1.start === edge2.end && edge1.end === edge2.start) {        // Comparing A -> B and B -> A
                            continue;
                        }

                        edgeCrossingCount += EdgeCrossingMetric.isEdgeCrossForStraightLines(
                            edge1.start.completeVisualNode, edge1.end.completeVisualNode,
                            edge2.start.completeVisualNode, edge2.end.completeVisualNode);
                    }
                });
            }
        });

        edgeCrossingCount /= 2;
        const totalEdgeCount = graph.mainGraph.getAllEdgesInMainGraph().length;
        // Upper bound is based on https://osf.io/preprints/osf/wgzn5_v1 (page 3) - it is more strict than
        // the maximum upper bound, which is the first part of the computation - that is m * (m-1) / 2
        let maxPossibleCrossCount = (totalEdgeCount * (totalEdgeCount - 1)) / 2;
        const degrees = nodes.map(node => [...node.getAllOutgoingEdges()].length);
        maxPossibleCrossCount += (1/2) * degrees.reduce((accumulator, degree) => accumulator + degree * (degree - 1), 0);

        if(maxPossibleCrossCount === 0) {
            return {
                absoluteValue: 0,
                relativeValue: 1,
            };
        }

        return {
            absoluteValue: edgeCrossingCount,
            relativeValue: 1 - (edgeCrossingCount / maxPossibleCrossCount)
        };
    }

    // Based on https://stackoverflow.com/questions/3838329/how-can-i-check-if-two-segments-intersect
    /**
     *
     * @returns 1 for edge crossing, 0 for no edge crossing
     */
    public static isEdgeCrossForStraightLines(source1: VisualNodeComplete, target1: VisualNodeComplete,
                                              source2: VisualNodeComplete, target2: VisualNodeComplete): 0 | 1 {
        const a = findNodeBorder(source1, EdgeCrossingMetric.getMiddle(target1));
        const b = findNodeBorder(target1, EdgeCrossingMetric.getMiddle(source1));
        const c = findNodeBorder(source2, EdgeCrossingMetric.getMiddle(target2));
        const d = findNodeBorder(target2, EdgeCrossingMetric.getMiddle(source2));
        return EdgeCrossingMetric.isCounterClockwise(a, c, d) != EdgeCrossingMetric.isCounterClockwise(b, c, d) &&
                EdgeCrossingMetric.isCounterClockwise(a, b, c) != EdgeCrossingMetric.isCounterClockwise(a, b, d) ? 1 : 0;
    }

    public static getMiddle(completeVisualNode: VisualNodeComplete): Position {
        return {
            x: completeVisualNode.coreVisualNode.position.x + completeVisualNode.width / 2,
            y: completeVisualNode.coreVisualNode.position.y + completeVisualNode.height / 2,
            anchored: null,
        };
    }

    public static isCounterClockwise(a: Position | XY, b: Position | XY, c: Position | XY): boolean {
        return (c.y-a.y)*(b.x-a.x) > (b.y-a.y)*(c.x-a.x);
    }

    computeMetricForNodes(graph: Graph): Record<string, ComputedMetricValues> {
        throw new Error("Method not implemented.");
    }
    computeMetricForEdges(graph: Graph): Record<string, ComputedMetricValues> {
        throw new Error("Method not implemented.");
    }
    computeMetricsForEverything(graph: Graph): AllMetricData {
        throw new Error("Method not implemented.");
    }

}
