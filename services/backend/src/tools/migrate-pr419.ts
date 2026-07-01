import { PrismaClient } from "@prisma/client";
import { ResourceModel } from "../models/resource-model.ts";
import { LocalStoreModelBase } from "../models/local-store-model.ts";
import { V1 } from "@dataspecer/core-v2/model/known-models";
import { ROOT_PACKAGE_FOR_V1, createV1RootModel } from "../models/data-specification-model-adapted.ts";

export async function migratePR419() {
    const prisma = new PrismaClient();
    const dataSpecifications = await prisma.$queryRaw`SELECT * FROM DataSpecification` as any[];
    const dataStructures = await prisma.$queryRaw`SELECT * FROM DataStructure` as any[];
    const reuses = await prisma.$queryRaw`SELECT * FROM _DataSpecificationReuse` as any[];
    prisma.$disconnect();

    const storeModel = new LocalStoreModelBase("./database/stores");
    const adapter = new ResourceModel(storeModel, prisma);

    if (await adapter.getPackage(ROOT_PACKAGE_FOR_V1)) {
        if (process.argv[3] !== "--force") {
            throw new Error("Root package for model v1 already exists. Use --force to overwrite. Aborting.");
        } else {
            console.log("Root package for model v1 already exists. Overwriting.");
            await adapter.deleteResource(ROOT_PACKAGE_FOR_V1);
        }
    }

    await createV1RootModel(adapter);

    for (const dataSpecification of dataSpecifications) {
        console.log(`Migrating data specification ${dataSpecification.id}`);
        try {

            console.log(dataSpecification.storeId);
            const pimBuffer = await storeModel.get(dataSpecification.storeId);
            const pim = JSON.parse(pimBuffer!.toString());
            const label = pim.resources[dataSpecification.pimSchema].pimHumanLabel;
            const description = pim.resources[dataSpecification.pimSchema].pimHumanDescription;

            // Data specification
            await adapter.createPackage(ROOT_PACKAGE_FOR_V1, dataSpecification.id, {
                label,
                description,
                tags: JSON.parse(dataSpecification.tags)
            });

            // Package metadata
            const packageStore = await adapter.getOrCreateResourceModelStore(dataSpecification.id);
            await packageStore.setJson({
                dataStructuresImportPackages: reuses.filter(r => r.A === dataSpecification.id).map(r => r.B),
            });

            // Generator configuration
            {
                await adapter.createResource(dataSpecification.id, dataSpecification.id + "/default-generator-configuration", V1.GENERATOR_CONFIGURATION, {});
                const store = await adapter.getOrCreateResourceModelStore(dataSpecification.id + "/default-generator-configuration");
                await store.setString(dataSpecification.artifactsConfiguration);
            }

            // CIM
            {
                await adapter.createResource(dataSpecification.id, dataSpecification.id + "/cim", V1.CIM, {});
                const store = await adapter.getOrCreateResourceModelStore(dataSpecification.id + "/cim");
                await store.setJson({
                    models: JSON.parse(dataSpecification.cimAdapters),
                });
            }

            // PIM
            await adapter.createResource(dataSpecification.id, dataSpecification.pimSchema, V1.PIM, {});
            await adapter.assignExistingStoreToResource(dataSpecification.pimSchema, dataSpecification.storeId);

            // PSM
            const structures = dataStructures.filter(ds => ds.belongsToDataSpecificationId === dataSpecification.id);
            for (const structure of structures) {
                const psmBuffer = await storeModel.get(structure.storeId);
                const psm = JSON.parse(psmBuffer!.toString());
                const label = psm.resources[structure.psmSchema].dataPsmHumanLabel;
                const description = psm.resources[structure.psmSchema].dataPsmHumanDescription;

                await adapter.createResource(dataSpecification.id, structure.psmSchema, V1.PSM, {
                    label,
                    description,
                });
                await adapter.assignExistingStoreToResource(structure.psmSchema, structure.storeId);
            }
        } catch (e) {
            console.error(`Error migrating data specification ${dataSpecification.id}`, e);
        }
    }

    await prisma.$executeRaw`UPDATE Resource SET createdAt = 0, modifiedAt = 0, subtreeModifiedAt = 0 WHERE 1=1`;

    console.log("Migration done.");
}