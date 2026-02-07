import { LOCAL_SEMANTIC_MODEL } from '@dataspecer/core-v2/model/known-models';
import { RdfsAdapter } from '@dataspecer/core-v2/rdfs-adapter';
import { PrismaClient } from '@prisma/client';
import cliProgress from 'cli-progress';
import { readFileSync } from 'fs';
import { Parser, Store } from 'n3';
import { LocalStoreModelBase } from '../../models/local-store-model.ts';
import { ResourceModel } from '../../models/resource-model.ts';
import { objectsToLanguageString } from './better-n3-store.ts';

const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const LOV = "https://lov.linkeddata.es/dataset/lov";
const BROKEN_IRI = "http://PARSER_BROKEN_IRI";
const CLS = "http://www.w3.org/2002/07/owl#Class";
const PROPERTY = "http://www.w3.org/2002/07/owl#ObjectProperty";

const filename = "./lov.nq";


(async () => {
    console.log(`Reading file ${filename}.`);
    const file = readFileSync(filename, 'utf8');

    const parser = new Parser({ format: 'N-Quads', baseIRI: "http://this-document.com" });

    // @ts-ignore
    const resolve = parser._resolveIRI;
    // @ts-ignore
    parser._resolveIRI = function (iri: string) {
        return resolve.call(this, iri) ?? BROKEN_IRI;
    }

    console.log(`Parsing file.`);
    const quads = parser.parse(file);

    console.log(`Adding quads to store.`);
    const store = new Store();
    store.addQuads(quads);

    console.log(`Querying.`);
    const subjects = store.getSubjects(
        TYPE,
        "http://purl.org/vocommons/voaf#Vocabulary",
        LOV
    );

    console.log(`Found ${subjects.length} vocabularies, extracting data.`);


    // Start real migration !!!
    console.log("Adding to database.");

    const LOD_ROOT = "https://dataspecer.com/resources/import/lod";

    const prisma = new PrismaClient();
    const storeModel = new LocalStoreModelBase("./database/stores");
    const resourceModel = new ResourceModel(storeModel, prisma);

    // Override the package
    if (await resourceModel.getPackage(LOD_ROOT)) {
        console.log("Root package for LOD already exists. Removing.");
        await resourceModel.deleteResource(LOD_ROOT);
    }

    await resourceModel.createPackage(null, LOD_ROOT, {
        label: {
            cs: "Propojené otevřené slovníky",
            en: "Linked Open Vocabularies"
        },
        description: {
            cs: "Tato složka obsahuje import slovníků z Linked Open Vocabularies lov.linkeddata.es",
            en: "This folder contains imports of vocabularies from Linked Open Vocabularies lov.linkeddata.es"
        }
    });


    let loading = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
    loading.start(subjects.length, 0);
    for (const subject of subjects) {
        const namespaceUri = store.getQuads(subject, "http://purl.org/vocab/vann/preferredNamespaceUri", null, LOV)[0]?.object.value;

        const entityStore = new Store();
        entityStore.addQuads(store.getQuads(null, null, null, subject.value));

        const adapter = new RdfsAdapter();
        adapter.load(entityStore);
        const entities = adapter.getEntities();

        const vocabulary =  {
            id: subject.value,
            namespaceUri,
            namespaceUriPrefix: store.getQuads(subject, "http://purl.org/vocab/vann/preferredNamespacePrefix", null, LOV)[0]?.object.value,
            title: objectsToLanguageString(store.getQuads(subject, "http://purl.org/dc/terms/title", null, LOV).map(x => x.object)),
            description: objectsToLanguageString(store.getQuads(subject, "http://purl.org/dc/terms/description", null, LOV).map(x => x.object)),
            entities
        };

        // Save to db

        const label = Object.fromEntries(Object.entries(vocabulary.title).map(([lang, value]) => [lang, `[${vocabulary.namespaceUriPrefix}] ${value}`]));

        const packageIri = "https://dataspecer.com/resources/import/lod?vocabulary=" + encodeURIComponent(vocabulary.id);

        await resourceModel.createPackage(LOD_ROOT, packageIri, {
            label,
            description: vocabulary.description,
        });

        // Create semantic model
        {
            await resourceModel.createResource(packageIri, vocabulary.id, LOCAL_SEMANTIC_MODEL, {
                label,
                description: vocabulary.description,
                tags: ["imported"]
            });
            const store = await resourceModel.getOrCreateResourceModelStore(vocabulary.id);
            await store.setJson({
                baseIri: vocabulary.namespaceUri,
                entities: Object.fromEntries(vocabulary.entities.map(e => [e.id, e])),
                modelAlias: label[Object.keys(label)[0]],
                modelId: vocabulary.id,
                type: LOCAL_SEMANTIC_MODEL
            });
        }

        loading.increment();
    }
    loading.stop();

    console.log("Done.");
    await prisma.$disconnect();
})();
