import { AlgorithmName } from "../layout-algorithms/list-of-layout-algorithms.ts";
import { AffectedNodesGroupingsType, MemoryAllocationControl } from "./graph-conversion-action.ts";
import { UserGivenAlgorithmConfigurationAutomatic, UserGivenAlgorithmConfigurationBase, UserGivenAlgorithmConfigurationLayered, UserGivenAlgorithmConfigurationRadial, UserGivenAlgorithmConfigurationRandom, UserGivenAlgorithmConfigurationStressBase } from "./user-algorithm-configurations.ts";

export type AlgorithmPhases = "ONLY-PREPARE" | "ONLY-RUN" | "PREPARE-AND-RUN";

export interface AlgorithmConfigurationData<T extends UserGivenAlgorithmConfigurationBase> extends MemoryAllocationControl {
    affectedNodes: AffectedNodesGroupingsType,
    userGivenConfiguration: T,
    /**
     * Default is "PREPARE-AND-RUN", other values need to be explicitly set in constructor -
     * You should set it to other value only in case if you know that algorithm can be prepared once and then run multiple times.
     * - For example force algorithm needs to be prepared only once before going into the main loop where it is iteratively called with different seeds
     */
    algorithmPhasesToCall: AlgorithmPhases;
}

export interface AlgorithmConfiguration<T extends UserGivenAlgorithmConfigurationBase> extends AlgorithmConfigurationData<T> {
    addAdvancedSettings(advancedSettings: object): void;
    addAlgorithmConfiguration(key: string, value: string): void;
}

export abstract class DefaultAlgorithmConfiguration<T extends UserGivenAlgorithmConfigurationBase> implements AlgorithmConfiguration<T> {
    algorithmName: AlgorithmName;           // Behaves as type guard!
    affectedNodes: AffectedNodesGroupingsType;
    userGivenConfiguration: T;
    type: string;
    name: string;
    shouldCreateNewGraph: boolean;
    algorithmPhasesToCall: AlgorithmPhases;

    constructor(
        userGivenConfiguration: T,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        if(algorithmPhasesToCall === undefined) {
            this.algorithmPhasesToCall = "PREPARE-AND-RUN";
        }
        else {
            this.algorithmPhasesToCall = algorithmPhasesToCall;
        }
        this.shouldCreateNewGraph = shouldCreateNewGraph;
        this.affectedNodes = affectedNodes;
        this.type = "ALG";
        this.userGivenConfiguration = userGivenConfiguration;
    }
    /**
     * This method is called internally in addAlgorithmConfiguration. This method should extend all the underlying data structures.
     * For example elk algorithms contain extra elkData field which has the transformed user given confgiuration into elk configuration.
     */
    protected abstract addAlgorithmConfigurationToUnderlyingData(userGivenConfigurationKey: string, userGivenConfigurationValue: string): void;
    /**
     * Similiar to {@link addAlgorithmConfigurationToUnderlyingData}, but for the advancedSettings property.
     */
    protected abstract addAdvancedSettingsToUnderlyingData(advancedSettings: object): void;

    addAlgorithmConfiguration(key: string, value: string): void {
        this.userGivenConfiguration[key] = value;
        this.addAlgorithmConfigurationToUnderlyingData(key, value);
    }

    public addAdvancedSettings(advancedSettings: object) {
        if(this.userGivenConfiguration["advanced_settings"] === undefined) {
            this.userGivenConfiguration["advanced_settings"] = {...advancedSettings};
        }
        else {
            this.userGivenConfiguration["advanced_settings"] = {
                ...this.userGivenConfiguration["advanced_settings"],
                ...advancedSettings,
            };
        }

        this.addAdvancedSettingsToUnderlyingData(advancedSettings);
    }
}

export class RandomConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationRandom> {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationRandom {
        return {
            layout_alg: "random",
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: true,
            interactive: false
        }
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationRandom,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "random";
    }

    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        // EMPTY
    }
    addAdvancedSettingsToUnderlyingData(advancedSettings: object): void {
        // EMPTY
    }

}

/**
 * General Class which has all relevant configurations for the stress like algorithm. The classes extending this should convert the user configurations
 *  into
 * the representation which will be used in the algorithm (that means renaming, transforming[, etc.] the parameters in the data field)
 */
export abstract class StressConfiguration<T extends UserGivenAlgorithmConfigurationStressBase> extends DefaultAlgorithmConfiguration<T> {

    constructor(
        userGivenConfiguration: T,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        if (!Number.isFinite(userGivenConfiguration.stress_edge_len) || userGivenConfiguration.stress_edge_len <= 0) {
            throw new RangeError("stress_edge_len must be a finite number greater than zero.");
        }
    }

}


export abstract class LayeredConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationLayered> {
    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationLayered,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
    }
}


// TODO: Maybe put each class to separate file?

// TODO: I am not sure if this actually adds anything - the extra abstract class before moving to the elk implementation


export abstract class RadialConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationRadial> {
    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationRadial,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
    }
}


export class AutomaticConfiguration extends DefaultAlgorithmConfiguration<UserGivenAlgorithmConfigurationAutomatic> {
    static getDefaultUserConfiguration(): UserGivenAlgorithmConfigurationAutomatic {
        return {
            layout_alg: "automatic",
            min_distance_between_nodes: 500,
            number_of_new_algorithm_runs: 1,
            advanced_settings: {},
            run_layered_after: false,
            run_node_overlap_removal_after: false,
            interactive: false
        };
    }
    addAlgorithmConfigurationToUnderlyingData(key: string, value: string): void {
        // Do Nothing
    }
    addAdvancedSettingsToUnderlyingData(advancedSettings: object): void {
        // Do nothing
    }

    constructor(
        userGivenConfiguration: UserGivenAlgorithmConfigurationAutomatic,
        affectedNodes: AffectedNodesGroupingsType,
        shouldCreateNewGraph: boolean,
        algorithmPhasesToCall?: AlgorithmPhases
    ) {
        super(userGivenConfiguration, affectedNodes, shouldCreateNewGraph, algorithmPhasesToCall);
        this.algorithmName = "automatic";
    }
}
