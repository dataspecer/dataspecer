# Notes

- `aggregator.getView()` currently accepts no parameters and always returns the view to the whole graph

# UC01

```ts
import {isSemanticModelRelationship} from "@dataspecer/core-v2/semantic-model/concepts";
import {SemanticModelAggregator} from "@dataspecer/core-v2/semantic-model/aggregator";
import {createSgovModel} from "@dataspecer/core-v2/semantic-model/simplified";
import {httpFetch} from "@dataspecer/core/io/fetch/fetch-nodejs"; // or replace nodejs with browser

// Create aggregator which can hold multiple models and aggregate them
const aggregator = new SemanticModelAggregator();

// Create individual models (right now only one - sgov)
const sgov = createSgovModel("https://slovník.gov.cz/sparql", httpFetch);

// Add those models to the aggregator to create a model graph (currently one model supported)
aggregator.addModel(sgov);

// Create a view to a specific graph node (as we can look at different subgraphs)
const aggregatorView = aggregator.getView(sgov);

// Now we can finally read the aggregation
aggregatorView.getEntities() // Returns nothing (see following)
const callToUnsubscribe = aggregatorView.subscribeToChanges((updated, deleted) =>
    console.log(`Update! ${Object.keys(updated).length} entities updated or added and ${deleted.length} deleted.`)
); // Does nothing so far

// Search for classes *on the original model*
await sgov.search("turistický"); // array with two "classes"

// Lets add tourist destination surrounding to the graph
await sgov.allowClassSurroundings("https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");
// 🖨️ Update! 27 entities updated or added and 0 deleted.

// Lets add tourist destination type surroudings
await sgov.allowClassSurroundings("https://slovník.gov.cz/datový/turistické-cíle/pojem/typ-turistického-cíle");
// 🖨️ Update! 4 entities updated or added and 0 deleted.

// Lets un-add tourist destination class
await sgov.releaseClassSurroundings("https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");
// 🖨️ Update! 0 entities updated or added and 24 deleted.
// As you can see, not all 27 entities were deleted, because some of them (three exactly) are contained in the second query

// Lets print all classes
console.log(
    Object.values(aggregatorView.getEntities())
        .map(aggregated => aggregated.aggregatedEntity)
        .filter(isSemanticModelRelationship)
        .map(cls => cls.name["cs"])
);
// 🖨️ [ "má typ turistického cíle", "eviduje typ turistického cíle" ]

// Lets un-add the second query
await sgov.releaseClassSurroundings("https://slovník.gov.cz/datový/turistické-cíle/pojem/typ-turistického-cíle");
// 🖨️ Update! 0 entities updated or added and 7 deleted.
```

# UC02
```ts
import {SemanticModelAggregator} from "@dataspecer/core-v2/semantic-model/aggregator";
import {createSgovModel} from "@dataspecer/core-v2/semantic-model/simplified";
import {httpFetch} from "@dataspecer/core/io/fetch/fetch-nodejs";
import {InMemorySemanticModel} from "@dataspecer/core-v2/semantic-model/in-memory";
import {createClass, createRelationship} from "@dataspecer/core-v2/semantic-model/operations"; // or replace nodejs with browser
import {generate} from "@dataspecer/core-v2/semantic-model/lightweight-owl";

// Create aggregator which can hold multiple models and aggregate them
const aggregator = new SemanticModelAggregator();

// Create individual models (right now only one - sgov)
const sgov = createSgovModel("https://slovník.gov.cz/sparql", httpFetch);

// Add those models to the aggregator to create a model graph (currently one model supported)
aggregator.addModel(sgov);

// Create another model
const local = new InMemorySemanticModel();

// Add this model as well
aggregator.addModel(local);

// Create a view to the whole aggregated graph
const aggregatorView = aggregator.getView();

// Now we can finally read the aggregation
const callToUnsubscribe = aggregatorView.subscribeToChanges((updated, deleted) =>
    console.log(`⭐ Update!`, aggregatorView.getEntities())
); // Does nothing so far

// Create classes
const personId = local.executeOperation(createClass({
    name: {cs: "Person"},
})).id;

const petId = local.executeOperation(createClass({
    name: {cs: "Pet"},
})).id;

await sgov.allowClass("https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");

local.executeOperation(createRelationship({
    name: {cs: "has pet"},
    ends: [{
        concept: personId
    }, {
        concept: petId
    }],
}));

local.executeOperation(createRelationship({
    name: {cs: "favourite tourist destination"},
    ends: [{
        concept: personId
    }, {
        concept: "https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl"
    }],
}));

// Obtain final entities without any additional metadata
const entities = Object.values(aggregatorView.getEntities()).map(aggregated => aggregated.aggregatedEntity);
console.log(await generate(entities));
```

# UC03

```ts
import {BackendPackageService} from "@dataspecer/core-v2/project";
import {httpFetch} from "@dataspecer/core/io/fetch/fetch-nodejs"; // or replace nodejs with browser

const service = new BackendPackageService(BACKEND_URL, httpFetch);
const root = await service.getPackage("cme-root"); // Just a name of the root package for your application

console.log(root.subPackages.map(p => `${p.id}: ${p.name.cs}`));

// Create a new package
const pckg = await service.createPackage("cme-root", {
    name: {cs: "My new project"}
});

// Tell models to be part of the package
await service.updateSemanticModelPackageModels(pckg.id, models);

// You can modify individual models as you wish

// You can close the application

// To restore models use
const models = await service.constructSemanticModelPackageModels(packg.id);
```

```ts
const service = new BackendPackageService("http://localhost:3100", httpFetch);
const PARENT_PACKAGE_ID = "https://dataspecer.com/packages";
const MY_PACKAGE_ID = "https://dataspecer.com/packages/my-experimental-package";

console.log("Create new package and add sgov model into it.");
{
    await service.createPackage(PARENT_PACKAGE_ID, {
        id: MY_PACKAGE_ID,
        name: {en: "My experimental package"},
        tags: ["experimental"],
    });

    const sgov = createSgovModel("https://slovník.gov.cz/sparql", httpFetch);
    await sgov.allowClass("https://slovník.gov.cz/datový/turistické-cíle/pojem/turistický-cíl");

    await service.updateSemanticModelPackageModels(MY_PACKAGE_ID, [sgov]);
}

console.log("Construct models from the package only from the backend.");
{
    const models = await service.constructSemanticModelPackageModels(MY_PACKAGE_ID);
    // Models should contain only sgov with already allowed classes

    console.log(models?.[0]?.getEntities());
}

console.log("Add semantic model with person class.");
{
    // To create a new semantic model, we must call the service directly.
    const semanticModel = await service.createRemoteSemanticModel(MY_PACKAGE_ID);

    const newClassId = semanticModel.executeOperation(createClass({
        name: {cs: "Person"},
    })).id;

    console.log(newClassId);

    // This semantic model is automatically saved to the backend.
}

// Saving is done asynchronously, so we must wait a bit with a demonstration
await new Promise(resolve => setTimeout(resolve, 1000));

console.log("Check, if the package has two models.");
{
    const models = await service.constructSemanticModelPackageModels(MY_PACKAGE_ID);
    // Models should contain sgov and our semantic model

    console.log(models?.[0]?.getEntities());
    console.log(models?.[1]?.getEntities());
}

console.log("List all packages.");
{
    console.log(await service.getPackage(PARENT_PACKAGE_ID));
}

console.log("Remove our package.");
{
    await service.deletePackage(MY_PACKAGE_ID);
}

console.log("List all packages again.");
{
    console.log(await service.getPackage(PARENT_PACKAGE_ID));
}
```

# UC04
```ts
import {SemanticModelAggregator} from "@dataspecer/core-v2/semantic-model/aggregator";
import {InMemorySemanticModel} from "@dataspecer/core-v2/semantic-model/in-memory";
import {createClass, createRelationship} from "@dataspecer/core-v2/semantic-model/operations"; // or replace nodejs with browser
import {createRelationshipUsage} from "@dataspecer/core-v2/semantic-model/usage/operations";

const aggregator = new SemanticModelAggregator();
const view = aggregator.getView();

const first = new InMemorySemanticModel();
aggregator.addModel(first);

const second = new InMemorySemanticModel();
aggregator.addModel(second);

// Create original entity
first.executeOperation(createRelationship({
    id: "http://purl.org/dc/terms/title",
    iri: "http://purl.org/dc/terms/title",
    name: {en: "title"},
    ends: [
        {
            concept: "http://www.w3.org/2002/07/owl#Thing"
        },
        {
            concept: "http://www.w3.org/2002/07/owl#Thing"
        }
    ]
}));

// Create dataset and usage of title
const datasetId = second.executeOperation(createClass({
    name: {cs: "Dataset"},
})).id

second.executeOperation(createRelationshipUsage({
    usageOf: "http://purl.org/dc/terms/title",
    name: {cs: "Titulek datasetu"},
    ends: [{
        concept: datasetId
    },{

    }]
}));


console.log(view.getEntities());
```