import { PrismaClient } from "@prisma/client";
import { ResourceModel } from "../models/resource-model.ts";
import { LocalStoreModelBase } from "../models/local-store-model.ts";
import { LOCAL_SEMANTIC_MODEL, VISUAL_MODEL, QUERYABLE_MODEL, RDFS_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { ROOT_PACKAGE_FOR_V1, createV1RootModel } from "../models/data-specification-model-adapted.ts";
import { v4 as uuidv4 } from 'uuid';

const ROOT_FOR_V2 = "http://dataspecer.com/packages/local-root";

(async () => {
    const prisma = new PrismaClient();
    const packages = await prisma.$queryRaw`SELECT * FROM Package` as any[];
    prisma.$disconnect();

    const storeModel = new LocalStoreModelBase("./database/stores");
    const adapter = new ResourceModel(storeModel, prisma);

    if (await adapter.getPackage(ROOT_FOR_V2)) {
        if (process.argv[2] !== "--force") {
            throw new Error("Root package for model v1 already exists. Use --force to overwrite. Aborting.");
        } else {
            console.log("Root package for model v1 already exists. Overwriting.");
            await adapter.deleteResource(ROOT_FOR_V2);
        }
    }

    await adapter.createPackage(null, ROOT_FOR_V2, {
        label: {
            cs: "Lokální modely",
            en: "Local models"
        },
    });

    for (const pckg of packages) {
        const metadata = JSON.parse(pckg.metadata);

        await adapter.createPackage(ROOT_FOR_V2, pckg.iriChunk, {
            name: metadata.name,
            tags: [],
        });

        for (const model of metadata.models ?? []) {
            const type = model.type;

            const typeMapping = {
                [QUERYABLE_MODEL]: QUERYABLE_MODEL,
                "https://dataspecer.com/core/model-descriptor/in-memory-semantic-model": LOCAL_SEMANTIC_MODEL,
                "https://dataspecer.com/core/model-descriptor/visual-model": VISUAL_MODEL,
                [RDFS_MODEL]: RDFS_MODEL,
            };

            let iri = model.id ?? model.iri;
            if (iri === QUERYABLE_MODEL || !iri) {
                iri = uuidv4();
            }
            // @ts-ignore
            await adapter.createResource(pckg.iriChunk, iri, typeMapping[type], {});
            (await adapter.getOrCreateResourceModelStore(iri)).setJson(model);
        }
    }
})();
