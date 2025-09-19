import { useState } from "react";
import {
  AlgorithmName,
  Direction,
  EdgeRouting,
  ElkForceAlgType,
  UserGivenAlgorithmConfigurations,
  getDefaultUserGivenAlgorithmConfigurationsFull,
} from "@dataspecer/layout";
import _ from "lodash";
import LayeredAlgorithmDirectionDropdown from "./direction-graphic-combobox/react-combobox";

type MainType = "main";
type MainOrGeneralType = MainType | "general";

// TODO RadStr Checked: Kinda deprecated, as a normal user you should use the dialog in CME
//              It works, but it uses the old implementation of dialog
//              CME uses different types of dialog and it is different component,
//              so it would be hard to share it somehow
//              ... To be honest I am not sure if anyone even used layouting from manager
export const useConfigDialog = () => {
  const [config, setConfig] = useState<UserGivenAlgorithmConfigurations>(getDefaultUserGivenAlgorithmConfigurationsFull());

  const getConfig = () => {
    return _.cloneDeep(config);
  };


  const OverlapRemovalConfig = (props: {stateField: MainType}) => {
    return <div>
      <div className="flex flex-row">
        <label htmlFor="range-min-distance-between-nodes">Minimal distance between nodes: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-min-distance-between-nodes" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_overlapRemoval?.["min_distance_between_nodes"]}
          onMouseUp={(e) => { setConfig({
            ...config,
            [props.stateField]: {
              ...config[props.stateField],
              [config.chosenMainAlgorithm]: {
                ...config[props.stateField][config.chosenMainAlgorithm],
                "min_distance_between_nodes": parseInt((e.target as HTMLInputElement).value)
              }
            }
          });
          {/* Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
                                                        (Not sure if the type is correct, but it contains value so it shouldn't really matter) */}
          }}></input>
        {config?.[props.stateField]?.elk_overlapRemoval?.["min_distance_between_nodes"]}
      </div>
    </div>;
  };

  const RadialConfig = (props: {stateField: MainType}) => {
    return <div>
      <div className="flex flex-row">
        <label htmlFor="range-min-distance-between-nodes">Minimal distance between nodes ⚠️WIP⚠️: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-min-distance-between-nodes" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_radial?.["min_distance_between_nodes"]}
          onMouseUp={(e) => { setConfig({
            ...config,
            [props.stateField]: {
              ...config[props.stateField],
              [config.chosenMainAlgorithm]: {
                ...config[props.stateField][config.chosenMainAlgorithm],
                "min_distance_between_nodes": parseInt((e.target as HTMLInputElement).value)
              }
            }
          });
          {/* Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
                                                        (Not sure if the type is correct, but it contains value so it shouldn't really matter) */}
          }}></input>
        {config?.[props.stateField]?.elk_radial?.["min_distance_between_nodes"]}
      </div>
    </div>;
  };

  const RunLayeredAfterCombobox = (props: {stateField: MainType}) => {
    return <div>
      <input type="checkbox" id="checkbox-run-layered-after" name="checkbox-run-layered-after" checked={config?.[props.stateField]?.[config.chosenMainAlgorithm]?.run_layered_after}
        onChange={e => {
          setConfig({
            ...config,
            [props.stateField]: {
              ...config[props.stateField],
              [config.chosenMainAlgorithm]: {
                ...config[props.stateField][config.chosenMainAlgorithm],
                "run_layered_after": e.target.checked,
              }
            }
          });
        }} />
      <label htmlFor="checkbox-run-layered-after">Run layered after</label>
    </div>;
  };

  const RunOverlapRemovalAfterCombobox = (
    props: {
      stateField: MainType
      text?: string,
  }) => {
    return <div>
      <input type="checkbox"
              id="checkbox-run-overlap-removal-after"
              name="checkbox-run-overlap-removal-after"
              checked={config?.[props.stateField]?.[config.chosenMainAlgorithm]?.run_node_overlap_removal_after}
        onChange={e => {
          setConfig({
            ...config,
            [props.stateField]: {
              ...config[props.stateField],
              [config.chosenMainAlgorithm]: {
                ...config[props.stateField][config.chosenMainAlgorithm],
                "run_node_overlap_removal_after": e.target.checked,
              }
            }
          });
        }} />
      <label htmlFor="checkbox-run-overlap-removal-after">{props.text ?? "Run node overlap removal after"}</label>
    </div>;
  };

  const ForceConfig = (props: {stateField: MainType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor="range-min-distance-between-nodes">Minimal distance between nodes: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-min-distance-between-nodes" draggable="false"
          defaultValue={config?.[props.stateField].elk_force?.["min_distance_between_nodes"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_force", props.stateField, "min_distance_between_nodes", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField].elk_force?.["min_distance_between_nodes"]}

      </div>
      <div className="flex flex-row">
        <label htmlFor="range-iteration-count">Number of runs (may take several seconds for high numbers):</label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="1" max="200" step="1" className="slider" id="range-iteration-count" draggable="false"
          defaultValue={config?.[props.stateField].elk_force?.["number_of_new_algorithm_runs"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_force", props.stateField, "number_of_new_algorithm_runs", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField].elk_force?.["number_of_new_algorithm_runs"]}
      </div>

      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      <div className="flex flex-row">
        <label htmlFor="force-alg-type">Force model: </label>
      </div>
      <div className="flex flex-row">
        <select id="force-alg-type" value={config?.[props.stateField].elk_force?.["force_alg_type"]} onChange={(event) => {
          setConfigWithNewValue("elk_force", props.stateField, "force_alg_type", event.target.value as ElkForceAlgType);
        }}>
          <option value="EADES">Eades</option>
          <option value="FRUCHTERMAN_REINGOLD">Fruchterman Reingold</option>
        </select>
      </div>
      <hr className="w-48 h-1 mx-auto my-3 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      <RunLayeredAfterCombobox stateField={props.stateField}></RunLayeredAfterCombobox>
      <RunOverlapRemovalAfterCombobox stateField={props.stateField}></RunOverlapRemovalAfterCombobox>
    </div>;

  function setConfigWithNewValue<T>(algorithmName: AlgorithmName, stateField: Partial<MainOrGeneralType>, nameOfParameterToChange: string, newValue: T) {
    if(stateField === "general" && algorithmName !== "elk_layered") {
      return;
    }
    const algorithmSettings = (config?.[stateField])?.[algorithmName];
    if(algorithmSettings === undefined) {
      return;
    }

    setConfig({
      ...config,
      [stateField]: {
        ...config[stateField],
        [algorithmName]: {
          ...algorithmSettings,
          [nameOfParameterToChange]: newValue,
        }
      }
    });
    {/* Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
                    (Not sure if the type is correct, but it contains value so it shouldn't really matter) */}
  }


  const StressWithClustersConfig = (props: {stateField: MainType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor="range-stress-edge-len">Ideal edge length: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-stress-edge-len" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress_advanced_using_clusters?.["stress_edge_len"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_stress_advanced_using_clusters", props.stateField, "stress_edge_len", parseInt((e.target as HTMLInputElement).value));
          }
          }
        ></input>
        {config?.[props.stateField]?.elk_stress_advanced_using_clusters?.["stress_edge_len"]}
      </div>
      <div className="flex flex-row">
        <label htmlFor="range-iteration-count">Number of runs (may take several seconds for high numbers):</label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="1" max="200" step="1" className="slider" id="range-iteration-count" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress_advanced_using_clusters?.["number_of_new_algorithm_runs"]}
          onMouseUp={(e) => {
            // Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
            // (Not sure if the type is correct, but it contains value so it shouldn't really matter)
            setConfigWithNewValue("elk_stress_advanced_using_clusters", props.stateField, "number_of_new_algorithm_runs", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.elk_stress_advanced_using_clusters?.["number_of_new_algorithm_runs"]}
      </div>
      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      <RunOverlapRemovalAfterCombobox stateField={props.stateField} text="Remove edge layout for clusters"></RunOverlapRemovalAfterCombobox>
    </div>;

  const StressConfig = (props: {stateField: MainType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor="range-stress-edge-len">Ideal edge length: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-stress-edge-len" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress?.["stress_edge_len"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_stress", props.stateField, "stress_edge_len", parseInt((e.target as HTMLInputElement).value));
          }
          }
        ></input>
        {config?.[props.stateField]?.elk_stress?.["stress_edge_len"]}
      </div>
      <div className="flex flex-row">
        <label htmlFor="range-iteration-count">Number of runs (may take several seconds for high numbers):</label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="1" max="200" step="1" className="slider" id="range-iteration-count" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress?.["number_of_new_algorithm_runs"]}
          onMouseUp={(e) => {
            // Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
            // (Not sure if the type is correct, but it contains value so it shouldn't really matter)
            setConfigWithNewValue("elk_stress", props.stateField, "number_of_new_algorithm_runs", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.elk_stress?.["number_of_new_algorithm_runs"]}
      </div>
      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      <RunLayeredAfterCombobox stateField={props.stateField}></RunLayeredAfterCombobox>
      <RunOverlapRemovalAfterCombobox stateField={props.stateField}></RunOverlapRemovalAfterCombobox>
    </div>;

  const StressProfileConfig = (props: {stateField: MainType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor="range-stress-edge-len">Ideal edge length: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-stress-edge-len" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress_profile?.["stress_edge_len"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_stress_profile", props.stateField, "stress_edge_len", parseInt((e.target as HTMLInputElement).value));
          }
          }
        ></input>
        {config?.[props.stateField]?.elk_stress_profile?.["stress_edge_len"]}
      </div>
      <div className="flex flex-row">
        <label htmlFor="range-stress-profile-edge-len">Ideal class profile edge length: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-stress-profile-edge-len" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress_profile?.profileEdgeLength}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_stress_profile", props.stateField, "profileEdgeLength", parseInt((e.target as HTMLInputElement).value));
          }
          }
        ></input>
        {config?.[props.stateField]?.elk_stress_profile?.["profileEdgeLength"]}
      </div>
      <div className="flex flex-row">
        <label htmlFor="range-iteration-count">Number of runs (may take several seconds for high numbers):</label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="1" max="200" step="1" className="slider" id="range-iteration-count" draggable="false"
          defaultValue={config?.[props.stateField]?.elk_stress_profile?.["number_of_new_algorithm_runs"]}
          onMouseUp={(e) => {
            // Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
            // (Not sure if the type is correct, but it contains value so it shouldn't really matter)
            setConfigWithNewValue("elk_stress_profile", props.stateField, "number_of_new_algorithm_runs", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.elk_stress_profile?.["number_of_new_algorithm_runs"]}
      </div>
      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      <RunLayeredAfterCombobox stateField={props.stateField}></RunLayeredAfterCombobox>
      <RunOverlapRemovalAfterCombobox stateField={props.stateField}></RunOverlapRemovalAfterCombobox>
    </div>;

  const LayeredConfig = (props: {stateField: MainOrGeneralType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor={`${props.stateField}-main-alg-direction`}>Preferred edge direction: </label>
      </div>
      <div className="flex flex-row">
        <LayeredAlgorithmDirectionDropdown direction={config?.[props.stateField]?.["elk_layered"]?.["alg_direction"] ?? Direction.Down} setDirection={(newDirection: Direction) => {
          setConfigWithNewValue("elk_layered", props.stateField, "alg_direction", newDirection);
        }}></LayeredAlgorithmDirectionDropdown>
      </div>

      <hr className="w-48 h-1 mx-auto my-1 bg-gray-100 border-0 rounded dark:bg-gray-700"/>

      <div className="flex flex-row">
        <label htmlFor={`${props.stateField}-edge-routing`}>Edge routing: </label>
      </div>
      <div className="flex flex-row">
        <select id={`${props.stateField}-edge-routing`} value={config?.[props.stateField]?.["elk_layered"]?.["edge_routing"]}
          onChange={(event) => setConfigWithNewValue("elk_layered", props.stateField, "edge_routing", event.target.value as EdgeRouting)}>
          <option value="ORTHOGONAL">Orthogonal</option>
          <option value="POLYLINE">Polyline</option>
          <option value="SPLINES">Splines</option>
        </select>
      </div>

      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>
      {/* <div className="my-2"/> */}
      <hr className="w-48 h-1 mx-auto my-2 bg-gray-100 border-0 rounded dark:bg-gray-700"/>

      <div className="flex flex-row">
        { /* It has to be onMouseUp, if I put it onChange then react forces redraw and stops the "drag" event I guess */ }
        <label htmlFor={`range-${props.stateField}-layer-gap`}>Distance between layers: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id={`range-${props.stateField}-layer-gap`} draggable="false"
          defaultValue={config?.[props.stateField]?.["elk_layered"]?.["layer_gap"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_layered", props.stateField, "layer_gap", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.["elk_layered"]?.["layer_gap"]}
      </div>

      <div className="flex flex-row">
        <label htmlFor={`range-${props.stateField}in-layer-gap`}>Distance within layer: </label>
      </div>
      <div className="flex flex-row ">
        <input type="range" min="0" max="1000" step="10" className="slider" id={`range-${props.stateField}-in-layer-gap`} draggable="false"
          defaultValue={config?.[props.stateField]?.["elk_layered"]?.["in_layer_gap"]}
          onMouseUp={(e) => {
            setConfigWithNewValue("elk_layered", props.stateField, "in_layer_gap", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.["elk_layered"]?.["in_layer_gap"]}
      </div>
    </div>;

  const AutomaticConfig = (props: {stateField: MainType}) =>
    <div>
      <div className="flex flex-row">
        <label htmlFor="range-stress-edge-len">Ideal edge length: </label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="0" max="1000" step="10" className="slider" id="range-stress-edge-len" draggable="false"
          defaultValue={config?.[props.stateField]?.automatic?.min_distance_between_nodes}
          onMouseUp={(e) => {
            setConfigWithNewValue("automatic", props.stateField, "min_distance_between_nodes", parseInt((e.target as HTMLInputElement).value));
          }
          }
        ></input>
        {config?.[props.stateField]?.automatic?.["min_distance_between_nodes"]}
      </div>
      <div className="flex flex-row">
        <label htmlFor="range-iteration-count">Number of runs (may take several seconds for high numbers):</label>
      </div>
      <div className="flex flex-row">
        <input type="range" min="1" max="200" step="1" className="slider" id="range-iteration-count" draggable="false"
          defaultValue={config?.[props.stateField]?.automatic?.["number_of_new_algorithm_runs"]}
          onMouseUp={(e) => {
            // Have to recast, like in https://stackoverflow.com/questions/42066421/property-value-does-not-exist-on-type-eventtarget
            // (Not sure if the type is correct, but it contains value so it shouldn't really matter)
            setConfigWithNewValue("automatic", props.stateField, "number_of_new_algorithm_runs", parseInt((e.target as HTMLInputElement).value));
          }}></input>
        {config?.[props.stateField]?.automatic?.["number_of_new_algorithm_runs"]}
      </div>
    </div>;

  const renderMainAlgorithmConfig = () => {
    switch(config.chosenMainAlgorithm) {
      case "elk_stress_advanced_using_clusters":
        return <StressWithClustersConfig stateField="main"></StressWithClustersConfig>;
      case "elk_stress":
        return <StressConfig stateField="main"></StressConfig>;
      case "elk_layered":
        return <LayeredConfig stateField="main"></LayeredConfig>;
      case "elk_force":
        return <ForceConfig stateField="main"></ForceConfig>;
      case "elk_radial":
        return <RadialConfig stateField="main"></RadialConfig>;
      case "elk_overlapRemoval":
        return <OverlapRemovalConfig stateField="main"></OverlapRemovalConfig>;
      case "automatic":
        return <AutomaticConfig stateField="main"></AutomaticConfig>;
      case "random":
        return <RunOverlapRemovalAfterCombobox stateField="main"></RunOverlapRemovalAfterCombobox>
      case "elk_stress_profile":
        return <StressProfileConfig stateField="main"></StressProfileConfig>
      default:
        return null;
    }
  };

  const ConfigDialog = () =>
    <div>
      <h1 className="font-black text-xl">Autolayout preview ⚠️ Work in progress ⚠️</h1>
      <hr className="my-2"/>
      <div className="flex flex-row">
        <label htmlFor="main-layout-alg" className="font-black text-base">Main layouting algorithm: </label>
      </div>
      <div className="flex flex-row">
        <select id="main-layout-alg" value={config["chosenMainAlgorithm"]}
          onChange={(event) => setConfig({...config,
            "chosenMainAlgorithm": event.target.value as AlgorithmName
          })
          }>
          <option value="elk_layered">Layered (Hierarchical)</option>
          <option value="elk_stress">Elk Stress (Force-based algorithm)</option>
          <option value="elk_stress_profile">Elk Stress class profile (Force-based algorithm)</option>
          <option value="elk_stress_advanced_using_clusters">Elk Stress (Force-based algorithm) with clustering</option>
          <option value="elk_force">Elk Force (Force-based algorithm)</option>
          <option value="elk_radial">Radial</option>
          <option value="elk_overlapRemoval">Overlap removal</option>
          <option value="random">Random</option>
        </select>
      </div>
      <hr className="my-2"/>
      {config.chosenMainAlgorithm === "random" ? null : <h3 className="font-black">Algorithm settings </h3>}
      {renderMainAlgorithmConfig()}
      <hr className="my-2"/>
    </div>;

  return {
    getConfig,
    ConfigDialog,
    setConfig,
  };
};
