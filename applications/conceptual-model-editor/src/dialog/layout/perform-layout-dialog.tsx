import {
  AlgorithmName,
  UserGivenAlgorithmConfigurationBase,
  UserGivenAlgorithmConfigurationOverlapRemoval,
  UserGivenAlgorithmConfigurationRadial,
  UserGivenAlgorithmConfigurationRandom,
  UserGivenAlgorithmConfigurationStress,
  UserGivenAlgorithmConfigurationStressProfile,
  isUserGivenAlgorithmConfigurationStressProfile,
  UserGivenAlgorithmConfigurationStressWithClusters,
  UserGivenAlgorithmConfigurationLayered,
  EdgeRouting
} from "@dataspecer/layout";
import { DialogProps } from "../dialog-api";
import {
  PerformLayoutDialogController,
  PerformLayoutDialogState,
  usePerformLayoutDialogController
} from "./perform-layout-controller";
import { JSX } from "react";
import { t } from "../../application";
import LayeredAlgorithmDirectionDropdown from "./direction-combobox-react-component/direction-combobox";

export const PerformLayoutDialog = (props: DialogProps<PerformLayoutDialogState>) => {
  return <div className="flex flex-row">
    <ConfigDialogAlgorithmNameCombobox {...props}></ConfigDialogAlgorithmNameCombobox>
    <VerticalSeparator />
    <ConfigDialogAlgorithmConfiguration {...props}></ConfigDialogAlgorithmConfiguration>
  </div>;
};

const ConfigDialogAlgorithmNameCombobox = (props: DialogProps<PerformLayoutDialogState>) => {
  const controller = usePerformLayoutDialogController(props);
  const state = props.state;
  return (
    <div>
      <div className="flex flex-row">
        <label htmlFor="main-layout-alg" className="font-black text-base">
          {t("layout-dialog-chosen-algorithm-label")}:
        </label>
      </div>
      <div className="flex flex-row">
        <select id="main-layout-alg"
          className="px-2 py-1 text-base text-gray-900 bg-gray-100 border
            border-gray-300 shadow-[inset_1px_1px_0_#fff] focus:outline-none focus:ring-0 "
          value={state.chosenAlgorithm}
          onChange={(event) => controller.setChosenAlgorithm(event.target.value as AlgorithmName)}>
          <option value="elk_layered">
            {t("layout-dialog-algorithm-elk-layered")}
          </option>
          <option value="elk_stress">
            {t("layout-dialog-algorithm-elk-stress")}
          </option>
          <option value="elk_stress_profile">
            {t("layout-dialog-algorithm-elk-stress-class-profile")}
          </option>
          <option value="elk_stress_advanced_using_clusters">
            {t("layout-dialog-algorithm-elk-stress-using-clusters")}
          </option>
          <option value="elk_overlapRemoval">
            {t("layout-dialog-algorithm-elk-overlap-removal")}
          </option>
          <option value="random">
            {t("layout-dialog-algorithm-random")}
          </option>
          <option value="elk_radial">
            {t("layout-dialog-algorithm-elk-radial")}
          </option>
        </select>
      </div>
    </div>)
};

type AlgorithmToConfigurationMapType = Record<AlgorithmName, () => JSX.Element | null>;

const ConfigDialogAlgorithmConfiguration = (props: DialogProps<PerformLayoutDialogState>) => {
  const controller = usePerformLayoutDialogController(props);
  const state = props.state;

  const algorithmConfigurationToDialogMap: AlgorithmToConfigurationMapType = {
    none: function (): JSX.Element | null {
      return null;
    },
    elk_stress: function (): JSX.Element | null {
      return <ElkStressConfig controller={controller} configuration={state.configurations.elk_stress} />
    },
    elk_layered: function (): JSX.Element | null {
      return <ElkLayeredConfig controller={controller} configuration={state.configurations.elk_layered} />;
    },
    elk_force: function (): JSX.Element | null {
      return null;
    },
    random: function (): JSX.Element | null {
      return <RandomConfig controller={controller} configuration={state.configurations.random} />;
    },
    elk_radial: function (): JSX.Element | null {
      return <RadialConfig controller={controller} configuration={state.configurations.elk_radial}></RadialConfig>
    },
    elk_overlapRemoval: function (): JSX.Element | null {
      return <OverlapRemovalConfig controller={controller} configuration={state.configurations.elk_overlapRemoval} />;
    },
    elk_stress_advanced_using_clusters: function (): JSX.Element | null {
      return <ElkStressWithClustersConfig controller={controller}
        configuration={state.configurations.elk_stress_advanced_using_clusters} />
    },
    elk_stress_profile: function (): JSX.Element | null {
      return <ElkStressConfig controller={controller} configuration={state.configurations.elk_stress_profile} />
    },
    automatic: function (): JSX.Element | null {
      return null;
    }
  };

  return <div className="flex flex-col">
    <div className="font-black text-base">{t("layout-dialog-algorithm-configuration-label")}:</div>
    {algorithmConfigurationToDialogMap[props.state.chosenAlgorithm]() ?? null}
  </div>
};

const RandomConfig = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: UserGivenAlgorithmConfigurationRandom
  }) => {
  return <RunOverlapRemovalAfterCheckbox configuration={props.configuration} controller={props.controller} />
};

const RadialConfig = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: UserGivenAlgorithmConfigurationRadial
  }) => {
  return <LayoutSliderGeneral
    controller={props.controller}
    configuration={props.configuration}
    reactComponentId="range-min-distance-between-nodes-radial"
    translateLabel="layout-minimal-distance-between-nodes"
    min={10}
    max={1000}
    step={10}
    fieldToSet="min_distance_between_nodes" />
};

const ElkLayeredConfig = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: UserGivenAlgorithmConfigurationLayered
  }) => {
  return <div>
    <LayoutSliderGeneral
      controller={props.controller}
      configuration={props.configuration}
      reactComponentId="range-between-layers-layer-gap"
      translateLabel="layout-layered-between-layers-length"
      min={10}
      max={1000}
      step={10}
      fieldToSet="layer_gap" />
    <LayoutSliderGeneral
      controller={props.controller}
      configuration={props.configuration}
      reactComponentId="range-in-layer-gap"
      translateLabel="layout-layered-in-layer-length"
      min={10}
      max={1000}
      step={10}
      fieldToSet="in_layer_gap" />

    <HorizontalSeparator />
    <div className="flex flex-row ml-4 mt-2 mb-4">
      <div className="mr-8">
        <LayoutEdgeRoutingCombobox configuration={props.configuration}
          controller={props.controller}
          reactComponentId="layered" />
      </div>
      <LayeredAlgorithmDirectionDropdown direction={props.configuration.alg_direction}
        setDirection={(direction) => props.controller.setAlgorithmConfigurationValue("alg_direction", direction)} />
    </div>
    <HorizontalSeparator />
    <InteractiveCheckbox configuration={props.configuration} controller={props.controller} />
  </div>
};

const ElkStressConfig = (
  props:
    {
      controller: PerformLayoutDialogController,
      configuration: UserGivenAlgorithmConfigurationStress |
      UserGivenAlgorithmConfigurationStressProfile |
      UserGivenAlgorithmConfigurationStressWithClusters
    }
) => {
  return <div>
    <LayoutSliderGeneral
      controller={props.controller}
      configuration={props.configuration}
      reactComponentId="range-stress-edge-len"
      translateLabel="layout-stress-edge-length"
      min={10}
      max={1000}
      step={10}
      fieldToSet="stress_edge_len" />
    {
      !isUserGivenAlgorithmConfigurationStressProfile(props.configuration) ? null :
        <LayoutSliderGeneral
          controller={props.controller}
          configuration={props.configuration}
          reactComponentId="range-stress-edge-len-class-profiles"
          translateLabel="layout-stress-class-profile-edge-length"
          min={10}
          max={1000}
          step={10}
          fieldToSet="profileEdgeLength" />
    }
    <NumberOfRunsReactComponent controller={props.controller} configuration={props.configuration} />
    <HorizontalSeparator />
    <InteractiveCheckbox controller={props.controller} configuration={props.configuration} />
    <RunOverlapRemovalAfterCheckbox controller={props.controller} configuration={props.configuration} />
    <RunLayeredAfterCombobox controller={props.controller} configuration={props.configuration} />
  </div>;
};

const ElkStressWithClustersConfig = (
  props:
    {
      controller: PerformLayoutDialogController,
      configuration: UserGivenAlgorithmConfigurationStress |
      UserGivenAlgorithmConfigurationStressProfile |
      UserGivenAlgorithmConfigurationStressWithClusters
    }
) => {
  return <div>
    <LayoutSliderGeneral
      controller={props.controller}
      configuration={props.configuration}
      reactComponentId="range-stress-edge-len"
      translateLabel="layout-stress-edge-length"
      min={10}
      max={1000}
      step={10}
      fieldToSet="stress_edge_len" />
    <NumberOfRunsReactComponent controller={props.controller} configuration={props.configuration} />
    <RunOverlapRemovalAfterCheckbox text="layout-clusters-edge-layout"
      controller={props.controller}
      configuration={props.configuration} />
  </div>;
};

const HorizontalSeparator = () => <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700" />

const VerticalSeparator = () => <hr className="w-px mx-8 h-84 bg-gray-200 border-0 mx-4" />

const OverlapRemovalConfig = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: UserGivenAlgorithmConfigurationOverlapRemoval
  }) => {
  return <SliderMinDistanceConfig controller={props.controller} configuration={props.configuration} />
};

const NumberOfRunsReactComponent = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: UserGivenAlgorithmConfigurationBase
  }) => {
  return <LayoutSliderGeneral
    controller={props.controller}
    configuration={props.configuration}
    reactComponentId="range-iteration-count"
    translateLabel="layout-number-of-runs-text"
    min={1}
    max={100}
    step={1}
    fieldToSet="number_of_new_algorithm_runs" />
};

const SliderMinDistanceConfig = (
  props: {
    controller: PerformLayoutDialogController,
    configuration: { "min_distance_between_nodes": number }
  }) => {
  return <LayoutSliderGeneral
    controller={props.controller}
    configuration={props.configuration}
    reactComponentId="range-min-distance-between-nodes"
    translateLabel="layout-minimal-distance-between-nodes"
    min={10}
    max={1000}
    step={10}
    fieldToSet="min_distance_between_nodes" />
};

const LayoutSliderGeneral = (
  props: {
    controller: PerformLayoutDialogController,
    translateLabel: string,
    reactComponentId: string,
    min: number,
    max: number,
    step: number,
    fieldToSet: string,
    configuration: any
  }) => {

  return <div>
    <div className="flex flex-row">
      <label htmlFor={props.reactComponentId}>{t(props.translateLabel)}</label>
    </div>
    <div className="flex flex-row">
      <input type="range"
        min={String(props.min)}
        max={String(props.max)}
        step={String(props.step)}
        className="slider"
        id={props.reactComponentId}
        draggable="false"
        defaultValue={props.configuration[props.fieldToSet]}
        onMouseUp={(e) => {
          {
            /* Have to recast, like in
    https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
    (Not sure if the type is correct, but it contains value so it shouldn't really matter)
  */
          }
          props.controller.setAlgorithmConfigurationValue(
            props.fieldToSet, parseInt((e.target as HTMLInputElement).value));
        }}>
      </input>
      {props.configuration[props.fieldToSet]}
    </div>
  </div>;
};

const RunOverlapRemovalAfterCheckbox = (
  props: {
    text?: string,
    controller: PerformLayoutDialogController,
    configuration: { run_node_overlap_removal_after: boolean }
  }) => {
  return <LayoutCheckboxGeneral
    controller={props.controller}
    reactComponentId="checkbox-run-overlap-removal-after"
    fieldToSet="run_node_overlap_removal_after"
    configuration={props.configuration}
    translateLabel={props.text ?? "layout-node-overlap-removal-after-checkbox"} />;
};

const InteractiveCheckbox = (
  props: {
    text?: string,
    controller: PerformLayoutDialogController,
    configuration: { interactive: boolean }
  }) => {
  return <LayoutCheckboxGeneral
    controller={props.controller}
    reactComponentId="checkbox-interactive"
    fieldToSet="interactive"
    configuration={props.configuration}
    translateLabel="layout-interactive-checkbox" />;
};

const RunLayeredAfterCombobox = (
  props: {
    text?: string,
    controller: PerformLayoutDialogController,
    configuration: { run_layered_after: boolean }
  }) => {
  return <LayoutCheckboxGeneral
    controller={props.controller}
    reactComponentId="checkbox-run-layered-after"
    fieldToSet="run_layered_after"
    configuration={props.configuration}
    translateLabel="layout-layered-after-checkbox" />;
};

const LayoutCheckboxGeneral = (
  props: {
    controller: PerformLayoutDialogController,
    reactComponentId: string,
    fieldToSet: string,
    configuration: any,
    translateLabel: string,
  }) => {
  return <div>
    <input type="checkbox"
      id={props.reactComponentId}
      name={props.reactComponentId}
      checked={props.configuration[props.fieldToSet]}
      onChange={e => {
        props.controller.setAlgorithmConfigurationValue(props.fieldToSet, e.target.checked);
      }} />
    <label htmlFor={props.reactComponentId}>{t(props.translateLabel)}</label>
  </div>;
};

const LayoutEdgeRoutingCombobox = (
  props: {
    controller: PerformLayoutDialogController,
    reactComponentId: string,
    configuration: UserGivenAlgorithmConfigurationLayered,
  }) => {
  return <div>
    <div className="flex flex-row">
      <label htmlFor={`${props.reactComponentId}-edge-routing`}>{t("layout-layered-edge-routing")}</label>
    </div>
    <div className="flex flex-row">
      <select id="edge-routing"
        value={props.configuration.edge_routing}
        className="border p-3 border-gray-300"
        onChange={(event) =>
          props.controller.setAlgorithmConfigurationValue("edge_routing", event.target.value as EdgeRouting)}>
        <option value="ORTHOGONAL">{t("layout-layered-edge-routing-orthogonal-option")}</option>
        <option value="POLYLINE">{t("layout-layered-edge-routing-polyline-option")}</option>
        <option value="SPLINES">{t("layout-layered-edge-routing-splines-option")}</option>
      </select>
    </div>
  </div>
};
