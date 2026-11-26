import { resolveConfigurationHelper, mergeShallowConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";

export const DefaultCsvConfiguration = {
  enableMultipleTableSchema: false,
};

export type CsvConfiguration = typeof DefaultCsvConfiguration;

export type CsvConfigurationInput = Partial<CsvConfiguration>;

export const CSV_CONFIGURATION_KEY = "csv";

export type ConfigWithCsv = {
  [CSV_CONFIGURATION_KEY]?: CsvConfigurationInput;
};

export function getCsvConfigInput(configuration: Configuration & ConfigWithCsv): CsvConfigurationInput {
  return configuration?.[CSV_CONFIGURATION_KEY] ?? {};
}

export function csvConfig(input: CsvConfigurationInput): Required<ConfigWithCsv> {
  return { csv: input };
}

export function resolveCsvConfig(configurations: ConfigurationChain<Configuration & ConfigWithCsv>): CsvConfiguration {
  return resolveConfigurationHelper(configurations, getCsvConfigInput, () => ({ ...DefaultCsvConfiguration }), mergeShallowConfigurationHelper);
}
