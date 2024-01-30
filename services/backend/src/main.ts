import {getDefaultConfiguration} from "./routes/configuration";
import express from "express";
import { PrismaClient } from '@prisma/client';
import {
    addSpecification,
    cloneSpecification,
    consistencyFix,
    deleteSpecification, garbageCollection, importSpecifications,
    listSpecifications,
    modifySpecification
} from "./routes/specification";
import {readStore, writeStore} from "./routes/store";
import {LocalStoreModel} from "./models/local-store-model";
import {createDataPsm, deleteDataPsm} from "./routes/dataPsm";
import cors from "cors";
import bodyParser from "body-parser";
import { generateBikeshedRoute } from "./routes/bikeshed";
import {DataSpecificationModel} from "./models/data-specification-model";
import {DataSpecificationWithStores} from "@dataspecer/backend-utils/interfaces";
import {convertLocalStoresToHttpStores} from "./utils/local-store-to-http-store";
import configuration from "./configuration";
import {HttpStoreDescriptor, StoreDescriptor} from "@dataspecer/backend-utils/store-descriptor";
import {PackageModel} from "./models/package-model";
import {
    createPackage, createSemanticModel,
    deletePackage,
    getPackage,
    getSemanticModels,
    listPackages,
    setSemanticModels,
    updatePackage
} from "./routes/packages";
import {LocalStoreDescriptor} from "./models/local-store-descriptor";

// Create models

export const storeModel = new LocalStoreModel("./database/stores");
export const prismaClient = new PrismaClient();
export const dataSpecificationModel = new DataSpecificationModel(storeModel, prismaClient,"https://ofn.gov.cz/data-specification/{}");
export const packageModel = new PackageModel(storeModel, prismaClient);

export const storeApiUrl = configuration.host + '/store/{}';

let basename = new URL(configuration.host).pathname;
if (basename.endsWith('/')) {
    basename = basename.slice(0, -1);
}

export function convertStores(stores: LocalStoreDescriptor[]): StoreDescriptor[] {
    return convertLocalStoresToHttpStores(stores, storeApiUrl);
}

export function replaceStoreDescriptorsInDataSpecification<T extends DataSpecificationWithStores>(dataSpecification: T): T {
    return {
        ...dataSpecification,
        pimStores: convertLocalStoresToHttpStores(dataSpecification.pimStores, storeApiUrl),
        psmStores: Object.fromEntries(Object.entries(dataSpecification.psmStores).map(entry => [entry[0], convertLocalStoresToHttpStores(entry[1] as StoreDescriptor[], storeApiUrl)])),
    }
}

// Run express

const application = express();
application.use(cors());
application.use(bodyParser.json({limit: configuration.payloadSizeLimit}));
application.use(bodyParser.urlencoded({ extended: false, limit: configuration.payloadSizeLimit }));
application.use(bodyParser.urlencoded({ extended: true, limit: configuration.payloadSizeLimit }));

application.get(basename + '/data-specification', listSpecifications);
application.post(basename + '/data-specification', addSpecification);
application.post(basename + '/data-specification/clone', cloneSpecification);
application.delete(basename + '/data-specification', deleteSpecification);
application.put(basename + '/data-specification', modifySpecification);
application.post(basename + '/data-specification/garbage-collection', garbageCollection);
application.post(basename + '/data-specification/consistency-fix', consistencyFix);

application.post(basename + '/data-specification/data-psm', createDataPsm);
application.delete(basename + '/data-specification/data-psm', deleteDataPsm);

application.post(basename + '/import', importSpecifications);

// Api for packages (core-v2)
application.get(basename + '/package-list', listPackages);
application.get(basename + '/packages', getPackage);
application.post(basename + '/packages', createPackage);
application.patch(basename + '/packages', updatePackage);
application.delete(basename + '/packages', deletePackage);
application.get(basename + '/packages/semantic-models', getSemanticModels);
application.patch(basename + '/packages/semantic-models', setSemanticModels);
application.post(basename + '/packages/semantic-models', createSemanticModel);

// Configuration

application.get(basename + '/default-configuration', getDefaultConfiguration);

// API for reading and writing store content.

application.get(basename + '/store/:storeId', readStore);
application.put(basename + '/store/:storeId', writeStore);

// API for generators

application.post(basename + '/transformer/bikeshed', bodyParser.text({type:"*/*", limit: configuration.payloadSizeLimit}), generateBikeshedRoute);

application.listen(Number(configuration.port), () => {
    console.log(`Server is listening on port ${Number(configuration.port)}.`);
    console.log(`Try ${configuration.host}/data-specification for a list of data specifications. (should return "[]" for new instances)`);
});