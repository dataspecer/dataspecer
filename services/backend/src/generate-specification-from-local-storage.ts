import { v4 as uuidv4 } from "uuid";

import fs from "fs";
import { prismaClient, resourceModel, storeModel } from "./main.ts";

import JSZip from 'jszip';
import * as path from 'path';
import { PackageImporter } from "./export-import/import.ts";
import { generateArtifacts } from "./routes/generate.ts";
import { importFromGitUrl } from "./routes/import.ts";
import { HttpFetch } from "@dataspecer/core/io/fetch/fetch-api";
import { AuthenticationGitProvidersData } from "@dataspecer/git/git-providers";
import { GitProviderNodeFactory } from "@dataspecer/git-node/git-providers";
import { GitProviderNode } from "@dataspecer/git";
import { PrismaClientStorageApiForIriReplacement, StorageApiForIriReplacement } from "./utils/iri-replace-util.ts";
import { ZipStreamDictionary } from "@dataspecer/git-node";


/**
 * @deprecated Just for debugging
 */
function debugPrintDirectoryContent(path: string) {
  const stats = fs.statSync(path);
  if (stats.isDirectory()) {
    const directory = fs.readdirSync(path);
    directory.forEach(entry => console.info(entry));
  }
  else {
    console.error("Not a directory");
  }
}

/**
 * Gets the package iri from the array {@link imported}. It is at the 0th index.
 * Following that uses the existing methods to generate the artifacts into zip and the zip is then put into the filesystem in specific hardcoded directory.
 * (The GitHub actions then takes this directory and puts into the wanted directory named 'artifacts')
 */
async function generateArtifactsFromImported(imported: string[]) {
  if (imported.length === 0) {
    console.error("Could not import");
    throw new Error("Could not import");
  }

  const importedIRI = imported[0];

  const resource = await resourceModel.getPackage(importedIRI);

  if (resource === null) {
    console.error("The resource is missing");
    throw new Error("The resource is missing");
  }

  const zip = new ZipStreamDictionary();
  await generateArtifacts(importedIRI, zip);

  const dirname = "test-generate-specification";
  const filename = "artifacts-in-zip.zip";
  if(!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
  }
  const zipData = await zip.save();
  fs.writeFileSync(`${dirname}/${filename}`, zipData);

  await extractZipBufferToDisk(zipData, dirname);

  console.info("Finished generating specification from command line");
  console.log("Extraction from buffer complete.");
  console.log("Exiting process with success");
}


/**
 * Something kinda like .gitignore
 */
const namesToIgnoreInHomeDirectory: string[] = [
  "README.md",
  ".git",
  ".github",
  "dataspecer-source-code",
  "generated-content",
];

/**
 * Fills the {@link zip} with the data starting from {@link fullPath} recursively. But the actual root directory for the writing to the zip is {@link writeToRelativePath}.
 */
async function createImportZipFromFilesystem(fullPath: string, writeToRelativePath: string, isHomePath: boolean, zip: ZipStreamDictionary) {
  if (fs.statSync(fullPath).isDirectory()) {
    const dir = fs.readdirSync(fullPath);
    for (const entry of dir) {
      const newFullpath = path.join(fullPath, entry);
      const newWriteToRelativePath = path.join(writeToRelativePath, entry);

      if (isHomePath) {
        if (namesToIgnoreInHomeDirectory.includes(entry)) {
          continue;
        }
      }
      await createImportZipFromFilesystem(newFullpath, newWriteToRelativePath, false, zip);
    }
  }
  else {
    const file = fs.readFileSync(fullPath);
    const stream = zip.writePath(writeToRelativePath);
    await stream.write(file.toString());
    await stream.close();
  }
}

/**
 * Generates documentation (and artifacts) from the data specification stored inside filesystem.
 * This assumes that the specification is present in the place where the implemented GitHub Action would put it.
 * This internally uses the already existing method to generate data documentation from specifications stored inside Dataspecer.
 *
 * So the flow is that we import it into Dataspecer and following that, generate the documentation
 */
async function generateDocumentationFromFileSystem() {
  // TODO RadStr Debug: Commented DEBUG - can safely remove later
  // let path: string;
  // path = ".";
  // for (let i = 0; i < 10; i++) {
  //   console.info("--------------------------------------------------------------");
  //   debugPrintDirectoryContent(path);
  //   path = "../".concat(path);
  // }

  // const packageIri = uuidv4();
  const packageIri = "db2ad74f-ec45-4d46-84f8-24d36fbb4200";
  const zipDictionaryForFilesystemData = new ZipStreamDictionary();
  const homeDirectory = "../../..";
  await createImportZipFromFilesystem(homeDirectory, packageIri, true, zipDictionaryForFilesystemData);
  const zipDataFromFilesystem = await zipDictionaryForFilesystemData.save();

  const prismaClientApi: StorageApiForIriReplacement = new PrismaClientStorageApiForIriReplacement(prismaClient);
  const importer = new PackageImporter(resourceModel, storeModel, prismaClientApi);
  const imported = await importer.doImport(zipDataFromFilesystem, false);
  const rootPackage = await resourceModel.getPackage(imported[0]);
  console.info("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.info({rootPackage});
  console.info("rootroot:");
  const absoluteRoots = await resourceModel.getRootResources();
  absoluteRoots.forEach(absoluteRoot => console.info({ar: absoluteRoot}));
  const absoluteRootAsPckg = await resourceModel.getPackage(absoluteRoots[0].iri);
  console.info({absoluteRootAsPckg});
  console.info({absoluteRootAsPckgSubRes: absoluteRootAsPckg?.subResources[0]});


  await generateArtifactsFromImported(imported);
  process.exit(0);
}

/**
 * Generates specification from Git URL passed in as argument from command line
 * @param gitZipDownloadURL is the URL of git provider, which returns the zip on access - for example https://github.com/RadStr-bot/4f21bf6d-2116-4ab3-b387-1f8074f7f412/archive/refs/heads/main.zip
 */
async function generateDocumentationFromGitURL(httpFetch: HttpFetch, authenticationGitProvidersData: AuthenticationGitProvidersData) {
  console.info("process.argv", process.argv);
  // Example of download URL - https://github.com/RadStr-bot/4f21bf6d-2116-4ab3-b387-1f8074f7f412/archive/refs/heads/main.zip (or commit SHA instead of refs/heads/main)
  const gitZipDownloadURL = process.argv[2];
  const gitProvider: GitProviderNode = GitProviderNodeFactory.createGitProviderFromRepositoryURL(gitZipDownloadURL, httpFetch, authenticationGitProvidersData);
  const prismaClientApi: StorageApiForIriReplacement = new PrismaClientStorageApiForIriReplacement(prismaClient);
  const imported = await importFromGitUrl(gitProvider, [], gitZipDownloadURL, storeModel, prismaClientApi, "branch");
  await generateArtifactsFromImported(imported);
  process.exit(0);
}


// await generateDocumentationFromGitURL();   // Alternative
await generateDocumentationFromFileSystem();



/**
 * Generated by ChatGPT
 */
async function extractZipBufferToDisk(zipBuffer: Buffer, outputDir: string) {
  const zip = await JSZip.loadAsync(zipBuffer);

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    const outputPath = path.join(outputDir, relativePath);
    console.info("outputPath", outputPath);

    if (zipEntry.dir) {
      fs.mkdirSync(outputPath, { recursive: true });
    } else {
      const content = await zipEntry.async('nodebuffer');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, content, "utf-8");
    }
  }
}
