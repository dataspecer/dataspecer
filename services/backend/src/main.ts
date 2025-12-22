import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";
import multer from "multer";
import configuration from "./configuration.ts";
import { Migrate } from "./migrations/migrate.ts";
import { LocalStoreModel } from "./models/local-store-model.ts";
import { ResourceModel } from "./models/resource-model.ts";
import { getDefaultConfiguration } from "./routes/configuration.ts";
import { getLightweightOwlFromSimplified } from "./routes/experimental.ts";
import { getSingleFile, getZip } from "./routes/generate.ts";
import { exportPackageResource, importPackageResource } from "./routes/export-import-raw.ts";
import { getGenerateApplicationByModelId, getGeneratedApplication } from "./routes/genapp.ts";
import { importPackageFromGit, importResource } from "./routes/import.ts";
import {
  copyRecursively,
  createPackageResource,
  createResourceHandler,
  deleteBlobHandler,
  deleteResourceHandler,
  getBlob,
  getPackageResource,
  getResource,
  getRootPackages,
  updateBlobHandler,
  updateRepresentsBranchHeadOnResourceHandler,
  updateResourceMetadataHandler,
  updateResourceProjectIriAndBranchHandler,
} from "./routes/resource.ts";
import { getSimplifiedSemanticModel, setSimplifiedSemanticModel } from "./routes/simplified-semantic-model.ts";
import { getSystemData } from "./routes/system.ts";
import { useStaticSpaHandler } from "./static.ts";
import { migratePR419 } from "./tools/migrate-pr419.ts";
import { authJSRedirectCallback } from "./routes/auth/auth-redirect-to-frontend-handler.ts";
import { authHandler } from "./routes/auth/auth-handler.ts";
import { corsOriginHandler } from "./utils/cors-related.ts";
import { currentSession } from "./authorization/auth-session.ts";
import { createRandomWebook, handleWebhook } from "./routes/git-webhook-handler.ts";
import { createNewGitRepositoryWithPackageContent, createPackageFromExistingGitRepository } from "./routes/create-new-git-repository-with-package-content.ts";
import { commitPackageToGitHandler, mergeCommitPackageToGitHandler } from "./routes/commit-package-to-git.ts";
import { redirectToRemoteGitRepository } from "./routes/redirect-to-remote-git-repository.ts";
import { removeGitRepository } from "./routes/remove-git-repository.ts";
import { fetchGitCommitHistory } from "./routes/fetch-git-commit-history.ts";
import { createDatastoreContentDirectly, createFilesystemNodesDirectly, getDatastoreContentDirectly, removeDatastoreContentDirectly, removeFilesystemNodeDirectly, updateDatastoreContentDirectly } from "./routes/datastore-actions.ts";
import { pullRemoteRepository } from "./routes/pull-remote-repository.ts";
import { linkToExistingGitRepository } from "./routes/link-to-existing-remote-git-repo.ts";
import { MergeStateModel } from "./models/merge-state-model.ts";
import { getMergeState } from "./routes/get-merge-state.ts";
import { getMergeStates } from "./routes/get-merge-states.ts";
import { updateMergeState } from "./routes/update-merge-state.ts";
import { finalizeMergeState } from "./routes/finalize-merge-state.ts";
import { createMergeStateBetweenDSPackagesHandler } from "./routes/create-merge-state.ts";
import { clearMergeStateTableDebug } from "./routes/debug-clear-merge-state-table.ts";
import { storeNewPrivateSSHKeyToBackend, storePrivateSSHKeyHandler } from "./routes/store-private-ssh-key.ts";
import { removeMergeState } from "./routes/remove-merge-state.ts";
import { finalizePullMergeState } from "./routes/finalize-pull-merge-state.ts";
import { finalizePushMergeState } from "./routes/finalize-push-merge-state.ts";
import { finalizeMergeMergeState } from "./routes/finalize-merge-merge-state.ts";
import { finalizePullMergeStateOnFailure } from "./routes/finalize-pull-merge-state-on-failure.ts";
import { finalizeMergeMergeStateOnFailure } from "./routes/finalize-merge-merge-state-on-failure.ts";
import { finalizePushMergeStateOnFailure } from "./routes/finalize-push-merge-state-on-failure.ts";
import { markPackageAsHavingNoUncommittedChanges } from "./routes/mark-package-as-having-no-uncommitted-changes.ts";
import { checkExistenceOfSshKeyForUserHandler } from "./routes/check-ssh-key-existence.ts";
import { deletePrivateSshKeyHandler } from "./routes/remove-private-ssh-key.ts";
import { GitProviderNamesAsType } from "@dataspecer/git";
import { populateSshKnownHosts } from "@dataspecer/git-node";


for (const [gitProviderName, gitConfiguration] of Object.entries(configuration?.gitBotConfigurations ?? {})) {
  if (gitConfiguration?.dsBotSSHPrivateKey !== undefined && gitConfiguration?.dsBotSSHId !== undefined) {
    populateSshKnownHosts();
    storeNewPrivateSSHKeyToBackend(gitConfiguration.dsBotSSHPrivateKey, gitConfiguration.dsBotSSHId, gitProviderName as GitProviderNamesAsType);
  }
}
// Create application models

export const storeModel = new LocalStoreModel("./database/stores");
export const prismaClient = new PrismaClient();
export const resourceModel = new ResourceModel(storeModel, prismaClient);
export const mergeStateModel = new MergeStateModel(prismaClient, resourceModel);
const migration = new Migrate(prismaClient);

let fullUrl: string;
let apiBasename: string;
let basename: string | null = null;
if (configuration.baseName) {
  basename = new URL(configuration.baseName).pathname;
  fullUrl = new URL(configuration.baseName).toString();
  if (basename.endsWith("/")) {
    basename = basename.slice(0, -1);
  }
  apiBasename = basename + "/api";
} else if (configuration.host) {
  apiBasename = new URL(configuration.host).pathname;
  fullUrl = new URL(configuration.host).toString() + "data-specification";
  if (apiBasename.endsWith("/")) {
    apiBasename = apiBasename.slice(0, -1);
  }
} else {
  throw new Error("No base name or host provided.");
}

// For uploading files
const multerStorage = multer.memoryStorage();
const multerUpload = multer({ storage: multerStorage });

// Run express

const application = express();
// If app is served through a proxy, trust the proxy to allow HTTPS protocol to be detected.
// I am not exactly if or why is this needed, but every example has it including the official one.
// https://authjs.dev/getting-started/deployment#docker it is mentioned for example here for docker
application.set('trust proxy', true);

application.use(cors(corsOriginHandler));

application.use(express.json({ limit: configuration.payloadSizeLimit }));
application.use(express.urlencoded({ extended: false, limit: configuration.payloadSizeLimit }));
application.use(express.urlencoded({ extended: true, limit: configuration.payloadSizeLimit }));

// Api for authorization

application.get(apiBasename + "/auth-handler/personal-callback/*", authJSRedirectCallback);
// We have to handle everything related to authorization under this handler - for some reason handlers for specific subparts (like /auth/callback/*) do not work.
application.use(apiBasename + "/auth/*", authHandler);

// Fetch package tree data
application.get(apiBasename + "/git/get-datastore-content", getDatastoreContentDirectly);
application.post(apiBasename + "/git/update-datastore-content", updateDatastoreContentDirectly);
application.post(apiBasename + "/git/create-datastore-content", createDatastoreContentDirectly);
application.delete(apiBasename + "/git/remove-datastore-content", removeDatastoreContentDirectly);
application.post(apiBasename + "/git/create-filesystem-nodes", createFilesystemNodesDirectly);
application.delete(apiBasename + "/git/remove-filesystem-node", removeFilesystemNodeDirectly);
application.get(apiBasename + "/git/get-merge-state", getMergeState);
application.post(apiBasename + "/git/create-merge-state-between-ds-packages", createMergeStateBetweenDSPackagesHandler);
application.post(apiBasename + "/git/update-merge-state", updateMergeState);
application.get(apiBasename + "/git/get-merge-states", getMergeStates);

application.post(apiBasename + "/git/finalize-merge-state", finalizeMergeState);
application.post(apiBasename + "/git/finalize-pull-merge-state", finalizePullMergeState);
application.post(apiBasename + "/git/finalize-pull-merge-state-on-failure", finalizePullMergeStateOnFailure);
application.post(apiBasename + "/git/finalize-push-merge-state", finalizePushMergeState);
application.post(apiBasename + "/git/finalize-push-merge-state-on-failure", finalizePushMergeStateOnFailure);
application.post(apiBasename + "/git/finalize-merge-merge-state", finalizeMergeMergeState);
application.post(apiBasename + "/git/finalize-merge-merge-state-on-failure", finalizeMergeMergeStateOnFailure);
application.delete(apiBasename + "/git/remove-merge-state", removeMergeState);

// TODO RadStr: Just for debugging !
application.post(apiBasename + "/git/debug-clear-merge-state-table", clearMergeStateTableDebug);

// TODO RadStr: Once I update the URL don't forget to update the ngrok URL in git providers to the same URL suffix
application.get(apiBasename + "/git/mark-package-as-no-uncommitted-changes", currentSession, markPackageAsHavingNoUncommittedChanges);
application.post(apiBasename + "/git/webhook-test", currentSession, handleWebhook);
application.post(apiBasename + "/git/webhook-test2", currentSession, handleWebhook);
application.get(apiBasename + "/git/webhook-test", currentSession, createRandomWebook);
application.post(apiBasename + "/git/set-private-ssh-key", currentSession, storePrivateSSHKeyHandler);
application.get(apiBasename + "/git/check-for-existence-of-private-ssh-key", currentSession, checkExistenceOfSshKeyForUserHandler);
application.delete(apiBasename + "/git/delete-private-ssh-key", currentSession, deletePrivateSshKeyHandler);
application.get(apiBasename + "/git/create-new-git-repository-with-package-content", currentSession, createNewGitRepositoryWithPackageContent);
application.get(apiBasename + "/git/commit-package-to-git", currentSession, commitPackageToGitHandler);
application.get(apiBasename + "/git/merge-commit-package-to-git", currentSession, mergeCommitPackageToGitHandler);
application.get(apiBasename + "/git/remove-git-repository", currentSession, removeGitRepository);
application.get(apiBasename + "/git/create-package-from-existing-git-repository", currentSession, createPackageFromExistingGitRepository);    // TODO RadStr: Not called for naywhere
application.get(apiBasename + "/git/test-docker", currentSession, exportPackageResource);
application.get(apiBasename + "/git/redirect-to-remote-git-repository", currentSession, redirectToRemoteGitRepository);
application.get(apiBasename + "/git/fetch-git-commit-history", currentSession, fetchGitCommitHistory);
application.get(apiBasename + "/git/pull", currentSession, pullRemoteRepository);
application.get(apiBasename + "/git/link-to-existing-git-repository", linkToExistingGitRepository);


// Api for packages (core-v2)

// Manipulates with resources on metadata level only.
application.get(apiBasename + "/resources", getResource);
application.put(apiBasename + "/resources", updateResourceMetadataHandler);
application.delete(apiBasename + "/resources", deleteResourceHandler);
// Low level API for creating new resources.
application.post(apiBasename + "/resources", createResourceHandler);

// Manipulates with raw data (blobs) of the resource, if available.
// Raw data may not be available at all if the resource is not a file, per se. Then, use other operations to access and manipulate the resource.
application.get(apiBasename + "/resources/blob", getBlob);
application.post(apiBasename + "/resources/blob", updateBlobHandler);
application.put(apiBasename + "/resources/blob", updateBlobHandler);
application.delete(apiBasename + "/resources/blob", deleteBlobHandler);

// Operations on resoruces that are interpreted as packages
application.get(apiBasename + "/resources/packages", getPackageResource);
application.get(apiBasename + "/resources/export.zip", exportPackageResource);
application.post(apiBasename + "/resources/packages", createPackageResource);
application.patch(apiBasename + "/resources/packages", updateResourceMetadataHandler); // same
application.delete(apiBasename + "/resources/packages", deleteResourceHandler); // same

application.patch(apiBasename + "/resources/packages/update-project-iri-and-branch", updateResourceProjectIriAndBranchHandler);     // TODO RadStr: Testing manual udpate of projectIri and branch
application.patch(apiBasename + "/resources/packages/update-represents-branch-head", updateRepresentsBranchHeadOnResourceHandler);

// Special operation to list all root packages
application.get(apiBasename + "/resources/root-resources", getRootPackages); // ---

application.post(apiBasename + "/repository/copy-recursively", copyRecursively);

/**
 * Import: Import endpoint is a wizard that allows you to import specific package/model from a remote source.
 */

application.post(apiBasename + "/resources/import", importResource);
application.post(apiBasename + "/resources/import-zip", multerUpload.single("file"), importPackageResource);
application.post(apiBasename + "/resources/import-from-git", importPackageFromGit);

// Interactive import of packages
//application.post(apiBasename + '/import', importPackages);

// Configuration

application.get(apiBasename + "/default-configuration", getDefaultConfiguration);

// Simplified semantic model

application.get(apiBasename + "/simplified-semantic-model", getSimplifiedSemanticModel);
application.put(apiBasename + "/simplified-semantic-model", setSimplifiedSemanticModel);

// Experimental features

application.post(apiBasename + "/experimental/lightweight-owl-from-simplified.ttl", getLightweightOwlFromSimplified);

// Generate artifacts

application.get(apiBasename + "/generate", getZip);
application.get(apiBasename + "/experimental/output.zip", getZip);
application.get(apiBasename + "/preview/*", getSingleFile);
application.get(apiBasename + "/generate/application", getGenerateApplicationByModelId);

// Generate application

application.post(apiBasename + "/generate-app", getGeneratedApplication);

// System routes

application.get(apiBasename + "/system/data", getSystemData); // Downloads database directory as ZIP file

application.get("/health", (_, res) => res.status(200).send("OK"));

// Static files server by this backend

if (configuration.staticFilesPath) {
  if (basename === null) {
    console.error("Static files path is set, but no base name is set.");
    process.exit(1);
  }
  application.get(basename + "/conceptual-model-editor", (_, res) => res.status(302).redirect(basename + "/conceptual-model-editor/"));
  application.get(basename + "/conceptual-model-editor/**", useStaticSpaHandler(configuration.staticFilesPath + "conceptual-model-editor/"));

  application.get(basename + "/data-specification-editor", (_, res) => res.status(302).redirect(basename + "/data-specification-editor/"));
  application.get(basename + "/data-specification-editor/**", useStaticSpaHandler(configuration.staticFilesPath + "data-specification-editor/"));

  application.get(basename + "**", useStaticSpaHandler(configuration.staticFilesPath + ""));
}


// TODO RadStr: Have to await, because of the generate-specification
await (async () => {
  // Run migrations or throw
  await migration.tryUp();

  // TODO RadStr: The endsWith is just current patch - the generate specification script should not probably call main
  //              - It should start the database and all that, however it should not start the express server
  //              ... That being said - it needs the initialization in the else branch + in the initialization of the database at the start of main
  //                  (as seen here https://github.com/RadStr-bot/private-copy-of-dataspecer/commit/8ccb225b248091fc54de7fa4211783bd98e2957f)
  // TODO RadStr: ... Actually we won't have the 3rd argument once we use the data inside the filesystem of gh action


  // Command-line arguments
  if (process.argv.length > 2 && !process.argv[1]?.endsWith("generate-specification-from-local-storage.js")) {
    // Some command line arguments are present
    if (process.argv[2] === "migrate-pr419") {
      await migratePR419();
      process.exit(0);
    } else {
      console.error("Unknown command line arguments.");
      process.exit(0);
    }
  } else {
    // Create local root
    if (!(await resourceModel.getResource(configuration.localRootIri))) {
      console.log("There is no default root package. Creating one...");
      await resourceModel.createPackage(null, configuration.localRootIri, configuration.localRootMetadata);
    }
    // Create root models for the common use and for the v1 adapter.
    if (!(await resourceModel.getResource(configuration.v1RootIri))) {
      console.log("There is no root package for data specifications from v1 dataspecer. Creating one...");
      await resourceModel.createPackage(null, configuration.v1RootIri, configuration.v1RootMetadata);
    }

    application.listen(Number(configuration.port), () => {
      if (configuration.inDocker) {
        console.log(`Dataspecer is running! Try opening your browser at http://localhost:port/ where port is the port you mapped to the container's port ${configuration.port}.`);
      } else {
        console.log(`Server is listening on port ${Number(configuration.port)}.`);
        console.log(`Try opening ${fullUrl}.`);
      }
    });
  }
})();
