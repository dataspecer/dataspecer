import { AlgorithmName } from "../layout-algorithms/list-of-layout-algorithms.ts";
import { Direction } from "../util/utils.ts";
import { AutomaticConfiguration, RandomConfiguration } from "./algorithm-configurations.ts";
import { AffectedNodesGroupingsType, EdgeRouting, GraphConversionActionConfiguration } from "./graph-conversion-action.ts";
import { ElkForceAlgType, ElkForceConfiguration, ElkLayeredConfiguration, ElkRadialConfiguration, ElkSporeOverlapConfiguration, ElkStressAdvancedUsingClustersConfiguration, ElkStressConfiguration, ElkStressProfileLayoutConfiguration } from "./elk/elk-configurations.ts";

export type UserGivenAlgorithmConfigurationInterfaces =
    | UserGivenAlgorithmConfigurationLayered
    | UserGivenAlgorithmConfigurationStress
    | UserGivenAlgorithmConfigurationStressProfile
    | UserGivenAlgorithmConfigurationStressWithClusters
    | UserGivenAlgorithmConfigurationAutomatic
    | UserGivenAlgorithmConfigurationRadial
    | UserGivenAlgorithmConfigurationOverlapRemoval
    | UserGivenAlgorithmConfigurationNone
    | UserGivenAlgorithmConfigurationElkForce
    | UserGivenAlgorithmConfigurationRandom;

export type UserGivenAlgorithmConfigurationInterfacesUnion =
    & UserGivenAlgorithmConfigurationLayered
    & UserGivenAlgorithmConfigurationStress
    & UserGivenAlgorithmConfigurationStressProfile
    & UserGivenAlgorithmConfigurationStressWithClusters
    & UserGivenAlgorithmConfigurationAutomatic
    & UserGivenAlgorithmConfigurationRadial
    & UserGivenAlgorithmConfigurationOverlapRemoval
    & UserGivenAlgorithmConfigurationNone
    & UserGivenAlgorithmConfigurationElkForce
    & UserGivenAlgorithmConfigurationRandom;

export function isUserGivenAlgorithmConfigurationInterface(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationInterfaces {
    if(what === undefined || what === null || what?.layout_alg === undefined) {
        return false;
    }

    switch (what.layout_alg) {
        case "elk_layered":
        case "elk_stress":
        case "elk_stress_profile":
        case "elk_stress_advanced_using_clusters":
        case "automatic":
        case "elk_radial":
        case "elk_overlapRemoval":
        case "none":
        case "elk_force":
        case "random":
            return true;
        default:
            throw new Error(`Unknown layout_alg: ${(what as any).layout_alg}`);
    }
}

export interface UserGivenAlgorithmConfigurationLayered extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "elk_layered",
    "alg_direction": Direction,
    "layer_gap": number,
    "in_layer_gap": number,
    "edge_routing": EdgeRouting
}
export function isUserGivenAlgorithmConfigurationLayered(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationLayered {
    return what?.layout_alg === "elk_layered";
}

export interface UserGivenAlgorithmConfigurationStressBase extends UserGivenAlgorithmConfigurationBase {
    /** Positive center-to-center target distance. Node sizes and overlap removal can increase the final distance. */
    "stress_edge_len": number,
    "number_of_new_algorithm_runs": number,
}

export interface UserGivenAlgorithmConfigurationStress extends UserGivenAlgorithmConfigurationStressBase {
    layout_alg: "elk_stress",
    "stress_edge_len": number,
}
export function isUserGivenAlgorithmConfigurationStress(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationStress {
    return what?.layout_alg === "elk_stress";
}

export interface UserGivenAlgorithmConfigurationStressProfile extends UserGivenAlgorithmConfigurationStressBase {
    layout_alg: "elk_stress_profile",
    profileEdgeLength: number,
    preferredProfileDirection: Direction,
}
export function isUserGivenAlgorithmConfigurationStressProfile(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationStressProfile {
    return what?.layout_alg === "elk_stress_profile";
}

export interface UserGivenAlgorithmConfigurationStressWithClusters extends UserGivenAlgorithmConfigurationStressBase {
    layout_alg: "elk_stress_advanced_using_clusters",
}
export function isUserGivenAlgorithmConfigurationStressWithClusters(
    what: UserGivenAlgorithmConfigurationBase
): what is UserGivenAlgorithmConfigurationStressWithClusters {
    return what.layout_alg === "elk_stress_advanced_using_clusters";
}

export interface UserGivenAlgorithmConfigurationAutomatic extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "automatic",
    "min_distance_between_nodes": number,
    number_of_new_algorithm_runs: number,
}
export function isUserGivenAlgorithmConfigurationAutomatic(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationAutomatic {
    return what?.layout_alg === "automatic";
}

export interface UserGivenAlgorithmConfigurationRadial extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "elk_radial",
    "min_distance_between_nodes": number,
}
export function isUserGivenAlgorithmConfigurationRadial(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationRadial {
    return what?.layout_alg === "elk_radial";
}

export interface UserGivenAlgorithmConfigurationOverlapRemoval extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "elk_overlapRemoval",
    "min_distance_between_nodes": number,
}
export function isUserGivenAlgorithmConfigurationOverlapRemoval(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationOverlapRemoval {
    return what?.layout_alg === "elk_overlapRemoval";
}

export interface UserGivenAlgorithmConfigurationNone extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "none",
    "advanced_settings": {},

    "run_layered_after": false,
    "run_node_overlap_removal_after": false,
    "interactive": false,
}
export function isUserGivenAlgorithmConfigurationNone(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationNone {
    return what?.layout_alg === "none";
}

export interface UserGivenAlgorithmConfigurationElkForce extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "elk_force",
    "min_distance_between_nodes": number,
    "force_alg_type": ElkForceAlgType,
    "number_of_new_algorithm_runs": number,
}
export function isUserGivenAlgorithmConfigurationElkForce(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationElkForce {
    return what?.layout_alg === "elk_force";
}

export interface UserGivenAlgorithmConfigurationRandom extends UserGivenAlgorithmConfigurationBase {
    layout_alg: "random",
}
export function isUserGivenAlgorithmConfigurationRandom(
    what: UserGivenAlgorithmConfigurationBase | undefined | null
): what is UserGivenAlgorithmConfigurationRandom {
    return what?.layout_alg === "random";
}

export interface UserGivenAlgorithmConfigurationExtraAlgorithmsToRunAfter {
    "run_layered_after": boolean,
    "run_node_overlap_removal_after": boolean,
}


export interface UserGivenAlgorithmConfigurationBase {
    "layout_alg": AlgorithmName,
    // The idea is to have fields which are "main" in a way and universal
    // (so they can be actually shared between algorithms ...
    //  which retrospectively doesn't add much, but still user can name the paramters as he pleases)
    // and then just advanced_settings, which contains additional configuration in the JSON format of given library
    // Note: the advanced_settings should override the main ones if passed, but it should not override the algorithm itself.
    //       (For example when I am calling elk.stress I can't just pass in elk.layered and run that instead,
    //        but I can change the desiredEdgeLength if I want to)
    "advanced_settings": Record<string, string>,

    "run_layered_after": boolean,
    "run_node_overlap_removal_after": boolean,
    "interactive": boolean,
    /** Minimum node spacing in the optional overlap-removal pass. Defaults to 50. */
    node_overlap_removal_min_distance?: number,
}


//


/**
 *
 * @returns Returns the configurations of the full thing, that is not only the algorithm configurations, but also the chosen algorithm.
 */
export function getDefaultUserGivenAlgorithmConfigurationsFull(): UserGivenAlgorithmConfigurations {
  return {
      main: getDefaultUserGivenAlgorithmConfigurationsMap(),
      general: getDefaultUserGivenAlgorithmConfigurationsMap(),
      chosenMainAlgorithm: "elk_layered",
      chosenGeneralAlgorithm: "none",
      additionalSteps: {}
  };
}

type ConfigMapFromUnion<T extends { layout_alg: string }> = {
  [K in T['layout_alg']]: Extract<T, { layout_alg: K }>;
};

export type UserGivenAlgorithmConfigurationsMap = ConfigMapFromUnion<UserGivenAlgorithmConfigurationInterfaces>;

/**
*
* @returns Returns the configurations of the algorithms - and only algorithms
*/
function getDefaultUserGivenAlgorithmConfigurationsMap(): UserGivenAlgorithmConfigurationsMap {
  return {
      none: {
          layout_alg: "none",
          advanced_settings: undefined,
          run_layered_after: false,
          run_node_overlap_removal_after: false,
          interactive: false
      },
      elk_stress: ElkStressConfiguration.getDefaultUserConfiguration(),
      elk_layered: ElkLayeredConfiguration.getDefaultUserConfiguration(),
      elk_force: ElkForceConfiguration.getDefaultUserConfiguration(),
      random: RandomConfiguration.getDefaultUserConfiguration(),
      elk_radial: ElkRadialConfiguration.getDefaultUserConfiguration(),
      elk_overlapRemoval: ElkSporeOverlapConfiguration.getDefaultUserConfiguration(),
      elk_stress_advanced_using_clusters: ElkStressAdvancedUsingClustersConfiguration.getDefaultUserConfiguration(),
      elk_stress_profile: ElkStressProfileLayoutConfiguration.getDefaultUserConfiguration(),
      automatic: AutomaticConfiguration.getDefaultUserConfiguration()
  }
};


export interface UserGivenAlgorithmConfigurationsForModel {
  main: Partial<Record<AlgorithmName, UserGivenAlgorithmConfigurationBase>>,
  chosenMainAlgorithm: AlgorithmName,

  general: {"elk_layered": UserGivenAlgorithmConfigurationBase},
  chosenGeneralAlgorithm: AlgorithmName,
  additionalSteps: Record<number, (UserGivenAlgorithmConfigurations | GraphConversionActionConfiguration)>,
}


export interface UserGivenAlgorithmConfigurations {
  main: UserGivenAlgorithmConfigurationsMap,
  chosenMainAlgorithm: AlgorithmName,

  general: UserGivenAlgorithmConfigurationsMap,
  chosenGeneralAlgorithm: AlgorithmName,
  additionalSteps: Record<number, (UserGivenAlgorithmConfigurations | GraphConversionActionConfiguration)>,
}
