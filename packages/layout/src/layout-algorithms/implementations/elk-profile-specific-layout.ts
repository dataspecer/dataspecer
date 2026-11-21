import { ElkConfigurationsContainer } from "../../configurations/configurations-container.ts";
import { Graph } from "../../graph/representation/graph.ts";
import { ElkLayout } from "./elk-layout.ts";
import { ElkNode } from "elkjs";
import { ElkStressProfileLayoutConfiguration } from "../../configurations/elk/elk-configurations.ts";
import { Direction } from "../../util/utils.ts";

export class ElkProfileLayout extends ElkLayout {
  prepareFromGraph(graph: Graph, configurations: ElkConfigurationsContainer): void {
    if(!(configurations.currentLayoutAction.action instanceof ElkStressProfileLayoutConfiguration)) {
      console.error("Incorrect configuration for ElkProfileLayout, can't correctly set initial positions for profile layouting");
      return;
    }
    for(const edge of graph.mainGraph.getAllEdgesInMainGraph()) {
      if(edge.edgeProfileType === "CLASS-PROFILE") {
        const profiledClassPosition = edge.end.completeVisualNode.coreVisualNode.position;
        switch(configurations.currentLayoutAction.action.userGivenConfiguration.preferredProfileDirection){
          case Direction.Up:
            edge.start.completeVisualNode.setPositionInCoreVisualNode(
              profiledClassPosition.x, profiledClassPosition.y + 1000);
            break;
          case Direction.Right:
            edge.start.completeVisualNode.setPositionInCoreVisualNode(
              profiledClassPosition.x - 1000, profiledClassPosition.y);
            break;
          case Direction.Down:
            edge.start.completeVisualNode.setPositionInCoreVisualNode(
              profiledClassPosition.x, profiledClassPosition.y - 1000);
            break;
          case Direction.Left:
            edge.start.completeVisualNode.setPositionInCoreVisualNode(
              profiledClassPosition.x + 1000, profiledClassPosition.y);
            break;
        }
      }
    }
    super.prepareFromGraph(graph, configurations);
    this.setProfileLengthsForEdges();
  };
  async run() {
    return super.run();
  };
  runGeneralizationLayout() {
    return super.runGeneralizationLayout();
  };

  setProfileLengthsForEdges() {
    if(!(this.configurations.currentLayoutAction.action instanceof ElkStressProfileLayoutConfiguration)) {
      console.error("Incorrect configuration for ElkProfileLayout, can't correctly set profile edge lengths");
      return;
    }
    const profileEdgeLength = this.configurations.currentLayoutAction.action.userGivenConfiguration.profileEdgeLength;
    this.setProfileLengthsForEdgesInternal(this.graphInElk, profileEdgeLength);
  }

  setProfileLengthsForEdgesInternal(graphInElk: ElkNode, profileEdgeLength: number) {
    graphInElk?.edges?.forEach(edge => {
      const graphEdge = this.graph.mainGraph.findEdgeInAllEdges(edge.id);
      if(graphEdge.edgeProfileType === "CLASS-PROFILE") {
        edge.layoutOptions = {
          ...edge.layoutOptions,
          desiredEdgeLength: profileEdgeLength.toString(),
        }
      }
    });
    graphInElk?.children?.forEach(child => {
      this.setProfileLengthsForEdgesInternal(child, profileEdgeLength);
    });
  }
}
