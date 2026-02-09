import { DataFactory } from "n3";

export const GENERATOR_CONFIGURATION_BASE_IRI = "https://dataspecer.com/work-in-progress/generator-configuration/";
export const GENERATOR_CONFIGURATION_DUMP_BASE_IRI = GENERATOR_CONFIGURATION_BASE_IRI + "key-value/";

const IRI = DataFactory.namedNode;

export const GENERATOR_CONFIGURATION_DSV = {
  base: IRI(GENERATOR_CONFIGURATION_BASE_IRI),
  configuration: IRI(GENERATOR_CONFIGURATION_BASE_IRI + "configuration"),
  configurationEntry: GENERATOR_CONFIGURATION_BASE_IRI + "configuration-entry/",
  hasConfigurationType: IRI(GENERATOR_CONFIGURATION_BASE_IRI + "has-configuration-type"),
  hasConfigurations: IRI(GENERATOR_CONFIGURATION_BASE_IRI + "has-configurations"),
  dump: IRI(GENERATOR_CONFIGURATION_DUMP_BASE_IRI),
};
