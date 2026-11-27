import { LayoutOptions } from "elkjs";
import {
    AffectedNodesGroupingsType,
} from "../graph-conversion-action.ts";
import { modifyElkDataObject } from "./elk-utils.ts";
import { Direction } from "../../util/utils.ts";
import { UserGivenAlgorithmConfigurationElkForce, UserGivenAlgorithmConfigurationLayered, UserGivenAlgorithmConfigurationOverlapRemoval, UserGivenAlgorithmConfigurationRadial, UserGivenAlgorithmConfigurationStress, UserGivenAlgorithmConfigurationStressProfile, UserGivenAlgorithmConfigurationStressWithClusters } from "../user-algorithm-configurations.ts";
import { AlgorithmPhases, DefaultAlgorithmConfiguration, LayeredConfiguration, RadialConfiguration, StressConfiguration } from "../algorithm-configurations.ts";


export type ElkForceAlgType = "FRUCHTERMAN_REINGOLD" | "EADES";

export interface ElkConfiguration {
    elkData: LayoutOptions;
}


/**
 * Stores configuration for elk layered algorithm
 */
export class ElkLayeredConfiguration extends LayeredConfiguration implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationLayered {
        return {
            layout_alg: "elk_layered",
            alg_direction: Direction.Up,
            layer_gap: 200,
            in_layer_gap: 100,
            edge_routing: "ORTHOGONAL",
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: false,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationLayered,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_layered";

        // Hardcoded defaults
        this.elkData["elk.edgeRouting"] = "SPLINES";
        this.elkData["spacing.edgeEdge"] = "10";
        this.elkData["org.eclipse.elk.spacing.nodeSelfLoop"] = "150";

        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }

    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}


/**
 * Stores configuration for elk stress algorithm
 */
export class ElkStressConfiguration extends StressConfiguration<UserGivenAlgorithmConfigurationStress> implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationStress {
        return {
            layout_alg: "elk_stress",
            stress_edge_len: 800,
            number_of_new_algorithm_runs: 10,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: true,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationStress,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_stress";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}

export class ElkStressAdvancedUsingClustersConfiguration extends StressConfiguration<UserGivenAlgorithmConfigurationStressWithClusters>
                                                    implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationStressWithClusters {
        return {
            layout_alg: "elk_stress_advanced_using_clusters",
            stress_edge_len: 800,
            number_of_new_algorithm_runs: 10,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: true,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationStressWithClusters,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_stress_advanced_using_clusters";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}



export class ElkStressProfileLayoutConfiguration extends StressConfiguration<UserGivenAlgorithmConfigurationStressProfile>
                                                    implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationStressProfile {
        return {
            layout_alg: "elk_stress_profile",
            profileEdgeLength: 400,
            preferredProfileDirection: Direction.Up,
            stress_edge_len: 800,
            number_of_new_algorithm_runs: 10,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: true,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationStressProfile,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_stress_profile";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}

/**
 * Stores configuration for elk force algorithm
 */
export class ElkForceConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationElkForce> implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationElkForce {
        return {
            layout_alg: "elk_force",
            min_distance_between_nodes: 400,
            force_alg_type: "FRUCHTERMAN_REINGOLD",
            number_of_new_algorithm_runs: 10,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: true,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationElkForce,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_force";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);

        // Hardcoded ... we have decided to not use force algorithm anyways
        if(this.elkData["org.eclipse.elk.force.model"] === "EADES") {
            this.elkData["org.eclipse.elk.force.repulsion"] = "25.0";
        }
        else {
            this.elkData["elk.force.temperature"] = "0.1";
        }
        // Random seed == 0 means that the seed is chosen randomly. Seed sets the initial position of nodes
        this.elkData["org.eclipse.elk.randomSeed"] = "0";
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    // I can further enforce the typing by creating type which takes into consideration only used parameters and not those which can't be used
    // (For example those for layered algorithm), but I won't
    elkData: LayoutOptions = {};
}



/**
 * Stores configuration for elk radial algorithm
 */
export class ElkRadialConfiguration extends RadialConfiguration implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationRadial {
        return {
            layout_alg: "elk_radial",
            min_distance_between_nodes: 500,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: false,
            interactive: false
        };
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationRadial,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_radial";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}


/**
 * Stores configuration for elk sporeOverlap algorithm
 */
export class ElkSporeOverlapConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationOverlapRemoval> implements ElkConfiguration {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationOverlapRemoval {
        return {
            layout_alg: "elk_overlapRemoval",
            min_distance_between_nodes: 200,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: false,
            interactive: true
        };
    }
    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationOverlapRemoval,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "elk_overlapRemoval";
        modifyElkDataObject(this.userGivenConfiguration, this.elkData);
    }

    addAdvancedSettingsToUnderlyingData(advancedSettings: object) {
        modifyElkDataObject({"advanced_settings": advancedSettings}, this.elkData);
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        modifyElkDataObject({[key]: value, "layout_alg": this.algorithmName}, this.elkData);
    }

    elkData: LayoutOptions = {};
}
