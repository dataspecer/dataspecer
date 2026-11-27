import { AutomaticLayout } from "./implementations/automatic-layout.ts";
import { RandomLayout } from "./implementations/basic-layout.ts";
import { ElkLayout } from "./implementations/elk-layout.ts";
import { ElkProfileLayout } from "./implementations/elk-profile-specific-layout.ts";
import { NoActionLayout } from "./implementations/no-action-layouts.ts";
import { LayoutAlgorithm } from "./layout-algorithms-interfaces.ts";

export type AlgorithmName = "none" | "elk_stress" | "elk_layered" | "elk_force" | "random" |
                            "elk_radial" | "elk_overlapRemoval" |
                            "elk_stress_advanced_using_clusters" | "elk_stress_profile" |
                            "automatic";

export function createLayoutAlgorithms(): Record<AlgorithmName, LayoutAlgorithm> {
    return {
        "elk_stress": new ElkLayout(),
        "elk_layered": new ElkLayout(),
        "elk_force": new ElkLayout(),
        "random": new RandomLayout(),
        "elk_radial": new ElkLayout(),
        "elk_overlapRemoval": new ElkLayout(),
        "elk_stress_advanced_using_clusters": new ElkLayout(),
        "elk_stress_profile": new ElkProfileLayout(),
        "none": new NoActionLayout(),
        "automatic": new AutomaticLayout(),
    };
}
