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
import { importResource } from "./routes/import.ts";
import {
  copyRecursively,
  createPackageResource,
  createResource,
  deleteBlob,
  deleteResource,
  getBlob,
  getPackageResource,
  getResource,
  getRootPackages,
  updateBlob,
  updateResource,
} from "./routes/resource.ts";
import { getSimplifiedSemanticModel, setSimplifiedSemanticModel } from "./routes/simplified-semantic-model.ts";
import { getSystemData } from "./routes/system.ts";
import { useStaticSpaHandler } from "./static.ts";
import { migratePR419 } from "./tools/migrate-pr419.ts";
import { authJSRedirectCallback } from "./routes/auth/auth-redirect-to-frontend-handler.ts";
import { authHandler } from "./routes/auth/auth-handler.ts";
import { corsOriginHandler } from "./utils/cors-related.ts";
import { getBasicUserInfo } from "./authorization/auth-session.ts";

// Create application models

export const storeModel = new LocalStoreModel("./database/stores");
export const prismaClient = new PrismaClient();
export const resourceModel = new ResourceModel(storeModel, prismaClient);
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
// TODO RadStr: Remove the commented code after commit - just so I have it somewhere
// application.use(cors({
//   // origin: (origin, callback) => { callback(null, origin) },   // TODO RadStr: Allow any front-end - this is dangerous, don't do it in actual final version
//   // origin: "http://localhost:5174",      // TODO RadStr: Hardcoded front-end, but we have to specify the exact front-end, otherwise we can not use cookies
// }));

application.use(express.json({ limit: configuration.payloadSizeLimit }));
application.use(express.urlencoded({ extended: false, limit: configuration.payloadSizeLimit }));
application.use(express.urlencoded({ extended: true, limit: configuration.payloadSizeLimit }));

// API for authorization

// TODO RadStr: Remove this line of code later after commit
// application.use("/auth/*", ExpressAuth(basicAuthConfig));

application.get(apiBasename + "/auth-handler/personal-callback/*", authJSRedirectCallback);

// We have to handle everything related to authorization under this handler - for some reason handlers for specific subparts (like /auth/callback/*) do not work.
application.use(apiBasename + "/auth/*", authHandler);

// TODO RadStr: This line of code is not currently needed, it will be once we add Git ... it should be probably like this and not define it for every path
//                                                                                        Since we will want to have route protection in future
// application.use(currentSession);

// TODO RadStr: Auth endpoint for frontend
application.get(apiBasename + "/auth-user-data", getBasicUserInfo);


// Api for packages (core-v2)

// Manipulates with resources on metadata level only.
application.get(apiBasename + "/resources", getResource);
application.put(apiBasename + "/resources", updateResource);
application.delete(apiBasename + "/resources", deleteResource);
// Low level API for creating new resources.
application.post(apiBasename + "/resources", createResource);

// Manipulates with raw data (blobs) of the resource, if available.
// Raw data may not be available at all if the resource is not a file, per se. Then, use other operations to access and manipulate the resource.
application.get(apiBasename + "/resources/blob", getBlob);
application.post(apiBasename + "/resources/blob", updateBlob);
application.put(apiBasename + "/resources/blob", updateBlob);
application.delete(apiBasename + "/resources/blob", deleteBlob);

// Operations on resoruces that are interpreted as packages
application.get(apiBasename + "/resources/packages", getPackageResource);
application.get(apiBasename + "/resources/export.zip", exportPackageResource);
application.post(apiBasename + "/resources/packages", createPackageResource);
application.patch(apiBasename + "/resources/packages", updateResource); // same
application.delete(apiBasename + "/resources/packages", deleteResource); // same
// Special operation to list all root packages
application.get(apiBasename + "/resources/root-resources", getRootPackages); // ---

application.post(apiBasename + "/repository/copy-recursively", copyRecursively);

/**
 * Import: Import endpoint is a wizard that allows you to import specific package/model from a remote source.
 */

application.post(apiBasename + "/resources/import", importResource);
application.post(apiBasename + "/resources/import-zip", multerUpload.single("file"), importPackageResource);

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

(async () => {
  // Run migrations or throw
  await migration.tryUp();

  // Command-line arguments
  if (process.argv.length > 2) {
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
      console.log(`Server is listening on port ${Number(configuration.port)}.`);
      console.log(`Try opening ${fullUrl}.`);
    });
  }
})();
