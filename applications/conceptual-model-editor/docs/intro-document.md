# dscme - introductory document

You can launch the application `dscme` either [locally](./about-and-install.md) or launch its [deployed version](https://tool.dataspecer.com/conceptual-model-editor).

If you find yourself struggling with how to use the app, refer yourself to [user documentation](./main.md).

If you want to persist your work throughout your exploration of `dscme`, please:

-   create a package in the [manager app](https://tool.dataspecer.com/manager) by clicking `new package` button in the top right corner (TODO: no longer present. Create new dataspec instead)
-   create a directory
-   name it however you like
-   then just create a `visual model`
-   and click `open in cme`

## Your first look at `dscme`

Hopefully you are working on your laptop / desktop, not your phone (although we tried to make last-minute changes so that mobile users don't struggle that much).

Up top is the [header](./main.md#header), on the left is catalog for [models](./models.md) and [concepts](./concepts-catalog.md). You add models by clicking one of the [buttons](./models.md#buttons). You then can make some concepts of your own, if you are lost, take a look at the guide for [creating concepts](./concepts.md#creating-a-concept).

Once you loaded an external model or created your own with some concepts in there as well, you can place them to canvas by simply dragging them over (meaning classes). Relationships, attributes and generalizations show up once you have placed the classes / class profiles they are related to on canvas.

## Use cases

We, I mean my supervisor, created a set of use cases to show how `dscme` can be used. The original form of the document is [here](https://github.com/jakubklimek/dataspecer-usecases/tree/main#readme). It contains some czech terms, that shouldn't(?) be a problem though.

I will list them here as well for simplicity, you can always refer yourself there to see what has changed. _I'll try to be honest, highlight the changes and provide explanation. I will also put hints as bullet-points. The original document is numbered list._

### 001 Real use case 1

1. Open editor as standalone app
    - link [here](https://tool.dataspecer.com/conceptual-model-editor/diagram)
    - that link there doesn't let you save your workspace to backend
        - you can see some buttons are disabled
2. Add reused vocabulary: [dcterms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl) by its URL
    - click the `+model` button
    - you can see some urls there already
    - keep the https://mff-uk.github.io/demo-vocabularies/original/dublin_core_terms.ttl one
    - standard dcterms are problematic due to cors limitations
3. Be able to browse the vocabulary - see the classes and properties, search in them, be able to place them on canvas

### 002 Vocabulary creation workflow using standalone editor

1. Open conceptual model editor - in this case, it will not actually create a **conceptual model** though, because it is not an **application profile**, just a **vocabulary**
    - open it from the [manager app](https://tool.dataspecer.com/manager) so that you can save it later
2. Add reused vocabulary, e.g. [dcterms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl), via URL
    1. They are added as "Dataspecer model"
    - try this url https://mff-uk.github.io/demo-vocabularies/original/dublin_core_terms.ttl instead
    - [alias the model](./models.md#aliasing-a-model) as "dcterms"
3. Create new classes, e.g. "Město", "Zoo", "Savec", "Kočička", "Pejsek"
    1. This involves establishing an IRI for the class, when it is exported => Need for IRI base and possibility of customization
    2. Name, description
    - you can add them as shown [here](./concepts.md#creating-a-concept)
4. Create specializations
    1. Between my new classes: Kočička and Savec, Pejsek and Savec
        - creating a [generalization](./concepts.md#creating-a-concept)
    2. Add class dcterms:Location (somehow, from the reused vocabularies)
        - simply drag it from the catalog to canvas, [docs](./visualization.md#placing-a-class-on-canvas)
    3. Between my class and an external class: Město and dcterms:Location
        - you can ignore these notes
        1. This will probably create a Dataspecer "filter node" adding dcterms:Location to the filter
            1. Poznámka: Tady záleží, jestli dělám jen slovník (pak je třeb dcterms celý načtený a filtr nedělám, nebo něco jiného, pak můžu chtít filtrovat)
5. Create relations
    - creating a [relationship](./concepts.md#creating-a-concept), [or this](./visualization.md#creating-relationships)
    1. "Město" --[1..1]--"obsahuje Zoo"--[0..1]-->"Zoo"
    2. "Zoo" <--[1..1]--"žije v"--[0..*]--"Savec"
    3. again, this involves IRIs, names, descriptions
6. Create attributes
    - adding [attributes](./concepts.md#creating-a-concept)
    1. "Město name" _for the class Město_
    2. "Kočička name" _for the class Kočička_
    3. Involves creating IRIs, names, range?
        - instead of range you'll see `datatype`, choose `xsd:string` if you really want to specify it, it's optional
7. Create attribute specializations
    - you do the attribute specializations in [modification dialog](./modifications.md#adding-specializations)
    - to open modification dialog of an attribute, you have to go to [`attribute catalog`](./concepts-catalog.md)
    1. "Město name" subPropertyOf dcterms:title
        1. Again adds these to the "DS filter node"?
    2. "Kočička name" subPropertyOf dcterms:title
        1. Again adds these to the "DS filter node"?
    3. Kdybych tady přidal vlastnost (teď to ale nedělám), která nemá kompatibilní domain, bude to nevalidní. To můžu upravit tím, že udělám "dataspecer model typu patch". **Tohle ale není ve scopu aktuálního use casu.**
8. Download the vocabulary as **lightweight ontology** (má to být standalone v editoru, nebo v dataspeceru, nebo obojí?)
    - you can download your work in lw ontology by clicking the `💾lw-onto` button in [export management](./exports.md#exporting-lightweight-ontology)
9. Save project to file (and be able to load it)
    - you can do this step by clicking `💾ws`
        - this downloads the workspace in `.json` format.
        - you can upload it again, but be warned, you won't be able to save it to the backend anymore
    - **instead** click the `💾pkg&👋` to save your work to our backend and go to the [manager app](https://tool.dataspecer.com/manager)

### 003 Vocabulary creation workflow using Dataspecer+CME

Same as before, but integrated in DS

1. Land on a landing page with overview of existing **data specifications**
    - that's the already known [manager app](https://tool.dataspecer.com/manager)
2. Create a new **data specification**. The intention is to create a **Vocabulary**, no need for "PSM"
    - i think you can reuse your directory for this
3. The original [use case 002](#002-vocabulary-creation-workflow-using-standalone-editor), but instead of saving file, it will be saved to Dataspecer backend
4. Return to landing page where now I could continue by creating data structures.

### 004 Application profile creation

1. Land on a landing page with overview of existing **data specifications**
    - [manager app](https://tool.dataspecer.com/manager)
2. Create a new **data specification**. The intention is to create an **Application profile**, but still no need for "PSM". We will simulate DCAT here.
    - the **data specification** means another directory i think
3. Open conceptual model editor
    - there should be a default local model for you
    - if not, create it by pressing the `+local` [button](./models.md#local-model)
4. Add reused vocabulary, e.g. [dcterms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/dublin_core_terms.ttl), via URL
    - again, use the url already provided
    1. They are added as "Dataspecer model"
5. Create new classes "Dataset", "Data Service", "Dataset Series" (subclass of Dataset)
    1. This involves establishing an IRI for the class, when it is exported => Need for IRI base and possibility of customization
    2. Name, description
    3. So far, we have done nothing to indicate an application profile, just a vocabulary
6. Create new relation `dcat:inSeries`

    - this `dcat:` prefix refers to rdf prefix
        - in rdf it would look as `@prefix dcat: <https://www.w3.org/ns/dcat.ttl#>
    - we don't specify prefixes like that in `dscme`
    - you can instead of that configure the [base iri](./models.md#changing-the-base-iri) of your local model to https://www.w3.org/ns/dcat.ttl#

    1. domain: dcat:Dataset
    2. range: dcat:DatasetSeries
    3. multiplicity: --"0..\*"---inSeries---"0..\*"-->

7. Add attribute usage of `dcterms:title` to "Dataset".
    - create a profile of attribute `dcterms:title` by clicking the `🧲` button in attribute catalog
    1. The name will remain "title"
        - keep the name, you don't have to check the `[ ] change in profile` checkbox
    2. add definition/description "A name given to the dataset."
        - if this is a change, then check the box and change it
    - if the domain in the dialog differs from your "Dataset" class, then change the domain as well
8. Add attribute usage of `dcterms:title` to "Distribution".
    - same for this class
    1. The name will be "data service title"
    2. add definition/description "A name given to the data service."
9. Add attribute usage of `dcterms:issued` to "Dataset"
    - you'll see it in the catalog as "Date issued"
    1. The name will be "release date" (originally "issued")
        - here you rename it
    2. The range will be `xsd:date` (originally `rdfs:Literal`)
        1. Actually, DCAT says `xsd:gYear`, `xsd:gYearMonth`, `xsd:date`, or `xsd:dateTime`
10. Add class usage of `dcterms:Location`
    - create a profile of class by clicking the `🧲` button in the class catalog or by opening the [context menu](./visualization.md#context-menus) and clicking the button there
    1. The name will be "Location"
    2. Usage note will be: "For an extensive geometry (i.e., a set of coordinates denoting the vertices of the relevant geographic area), the property locn:geometry LOCN SHOULD be used."
11. Add attribute usage of `dcterms:spatial`
    - you'll see it as "Spatial coverage"
    1. name: "geographical coverage"
    2. domain: `dcat:Dataset`
        - that's your class, you can distinguish it by the iri
    3. range: usage of `dcterms:Location`
12. Save to Dataspecer backend
13. Return to landing page where now I could continue by creating data structures.
    - click `💾pkg&👋`, [docs](./persistence.md#making-your-work-persistent)

### 005 AP of AP

1. Land on a landing page with overview of existing **data specifications**
2. Create a new **data specification**. The intention is to create an **Application profile**, but still no need for "PSM". We will simulate DCAT-AP here.
    - huh, open your previous work, i'll tell you why
        - in order to open the work you did in [previous step](#004-application-profile-creation), you would need to have it as a `.ttl` model
        - that can be done by [generating lw-onto](./exports.md#exporting-lightweight-ontology) **but**
        - there would need to be a logic for generating profiles in lw-ontology
        - dataspecer lw-onto generator is not ready for that task, since it needs to have a way of recognizing application profiles
        - once you've done that, you could have published the `.ttl` somewhere online and load it in `dscme`
    - open your previous work then please
3. Open conceptual model editor
4. Add reused AP DCAT from 004
    - create a new [local model](./models.md#adding-a-model)
    - alias it as "dcat-ap-ap"
    1. They are added as "Dataspecer model"
    2. this should also add the reused dcterms
        - the "dcterms" are there from the previous step
5. Add "Dataset" and "Dataset Series" to the canvas (class usage)
    - those were created in previous use case
6. Add "Dataset" to the canvas and rename to "Dataset member of a Dataset Series" (class usage)
    - this is a class profile of "Dataset", [create a profile](./profiles.md#profiling)
    1. Usage note "this is dataset that is part of a dataset series"
7. Add attribute usage of `dcat:inSeries`
    - create an attribute profile
    1. domain: "Dataset member of a Dataset Series"
    2. range: "Dataset Series"
    3. multiplicity --"0..\*"---inSeries---"1..\*"-->
8. Save to Dataspecer backend
    - you know already 😉
9. Return to landing page where now I could continue by creating data structures.
