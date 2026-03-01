import {
  applyConfigurationModelSimple, createDefaultConfigurationModelFromJsonObject, interpretConfigurationModelSimple,
  ReadableConfigurationModel, WritableConfigurationModel
} from "@dataspecer/core-v2/configuration-model";
import { getGitRemoteConfigurationsDefaults, GitRemoteConfigurations } from "./git-remote-configuration-interface.ts";


export function createGitRemoteConfiguration(configuration: ReadableConfigurationModel): GitRemoteConfigurations {
  return interpretConfigurationModelSimple<GitRemoteConfigurations>(configuration, GIT_REMOTE_CONFIGURATION_IRI, getGitRemoteConfigurationsDefaults());
}

export function applyGitRemoteConfiguration(configurationModel: WritableConfigurationModel, configuration: GitRemoteConfigurations) {
  applyConfigurationModelSimple(configurationModel, GIT_REMOTE_CONFIGURATION_IRI, configuration);
}

export const GIT_REMOTE_CONFIGURATION_IRI = "http://dataspecer.com/resources/local/git-remote-configuration";

export async function getGitRemoteConfigurationModelFromPackage(rootPackageContent: object) {
  const configuration = createDefaultConfigurationModelFromJsonObject(rootPackageContent);
  const gitRemoteConfiguration = createGitRemoteConfiguration(configuration);
  return gitRemoteConfiguration;
};

/**
 * If the {@link newGitConfiguration} is null, then nothing happens.
 */
export async function saveGitRemoteConfiguration(
  rootPackageIri: string,
  oldPackageContent: object,
  newGitConfiguration: GitRemoteConfigurations | null,
  storePackageToBackend: (iri: string, newPackageContent: object) => Promise<void>,
) {
  if (newGitConfiguration === null) {
    return;
  }

  const configuration = createDefaultConfigurationModelFromJsonObject(oldPackageContent);
  applyGitRemoteConfiguration(configuration, newGitConfiguration);
  const packageWithUpdatedConfiguration = configuration.serializeModelToApiJsonObject(oldPackageContent);
  await storePackageToBackend(rootPackageIri, packageWithUpdatedConfiguration);
};
