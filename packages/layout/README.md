# Layout

This package contains the implementation for layouting to be used in the rest of Dataspecer.

You can also check [the user documentation](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/layout-algorithms/) explaining types of implemented algorithms and their properties.

## Build

This package can be built using `npm run build`.


## Implementation

### Skipped algorithms:
We have initially implemented more algorithms, but later in development hid them from users for good reasons.

#### [Elk Force](https://eclipse.dev/Elk/reference/algorithms/org-eclipse-Elk-force.html)
This algorithm is similar to the Elk stress, but while providing similar results it has some issues:
- The configuration is hard to understand and set up
- We already have Elk stress

#### Automatic
It would be nice if user didn't have to think about layout at all. Just click button layout and the ideal graph layout would be provided.

Unfortunately that is highly non-trivial:

- What exactly is ideal layout? It depends on data and presentation purposes
- Can we even map that to metrics? Even if we could
  - What metrics?
    - Crossings are not enough, we have to take into account node alignment, etc.
  - How to weight them?
    - We can't do that by eye, we would have to get all possible specification diagrams and use some state search algorithm. Even then the results might not be as good.

#### [Elk radial](https://eclipse.dev/Elk/reference/algorithms/org-eclipse-Elk-radial.html)
While nice at first sight. The algorithm does not work on the Elk layouting library level:

- It ignores the edge length parameter, respectively the parameter is used only for the neighbors of the root
- Infinite recursion for bigger graphs

**Not working examples:**

Well actually for some reason the first sometimes work,
but try to remove some empty line and you will get error that the algorithm ran for more than 5 seconds,
which doesn't happen even for large graphs layouted through Elk stress, which is much more resource heavy algorithm.

Funnily enough the website, where you can test out elk layouts went out-of-service literally day after writing the doc, while working the whole project. Hopefully it comes back, otherwise you just have to trust me.

[Example of radial Elk algorithm running for long time](https://rtsys.informatik.uni-kiel.de/Elklive/Elkgraph.html?compressedContent=IYGw5g9gTglgLgCwLYC4AEVgBMagFB4B2EWApmoQIxoDeeaaIwARqSGgERUd4C+BxMhQBMteoxZtOhYT35ES5QgGYxDJq3ZdlcgYooAWNRM3SDuhUMIBWYxqldrFwUoBsdyVsKvn+wgHYPUy5-XysADiCHQnCwpQBOKK94iwJSLDAlagBaAD4RPHTMihz8lUKMrLQ8wwriqmqy6zwAeha6pVUawgMOw0aKeNb2oqVbbtc+mwGA4bnRikDuobm5oA)

[Infinite recursion example for radial Elk on online Elk demonstrator](https://rtsys.informatik.uni-kiel.de/Elklive/Elkgraph.html?compressedContent=PTCWDsBcFMCcEMDGlQDdoBl4E8D2BXSALgAJJZ9oAoEaAGwGsA6AE1FmmVF3FICUAkgHEAEgBUq8OgHNcsUJAAWAW1II2UqlXC4W0EuACMJAN5USJOvABG9EgCIj9qgF8tOvQYBMp85Zt2jl7Obtq6+uAAzL4WVrZ0DlEh7uEGACwx-vGJaclhnuAArJlxgUV5HhEAbCUBCY5VFangAOy12Y4tTQUAHO1lPd0RAJz99eDDQwaGAAxjibNTRsZmsXULhkuGPqtZZdtb0bul44aRWxnH646Gua5aVNAs0hHGALQAfN6Pz68knwZIj8XtN-l9wGlgX8AUUaMAoYCwekEVEkbCniDUTCqijojCeri0cM4SiMjDiSAUcVsVS0S0SZSMRE2uSUSzwbMSUyDH0YZzKbRfgZ2dMZlyhUY5nzDOLMYZ3hyvLLXj4+UDGRKzmjbkA)

#### [Mr. Tree](https://eclipse.dev/Elk/reference/algorithms/org-eclipse-Elk-mrtree.html)
Very difficult to use and configure and to integrate into application. Doesn't seem to provide any additional value over Elk layered.

### Issues

#### Layouting of subgraphs

The issue lies both in our implementation and Elk implementation. We have been doing a lot of experiments and debugging
with this functionality, but eventually it was disabled.
Not completely though - group of nodes is technically a subgraph. So if you ever layout graph which contains group and wonder why it looks bad, after reading this section you should understand.

For example at first I wanted to have any algorithm run with the option to layout generalization subgraphs.
User would choose the preferred edge direction in hierarchy. Then first the generalization subgraphs would be layouted
followed by layout of the subgraphs replaced by single nodes.

But here comes the big issue - Even though Elk does support the fact that we can say about group of nodes, that they are subgraph. First problem is that it does not allow the edges to go between hierachy levels, that is from node inside subgraph to node/subgraph outside.
So we split the edges, which works, but the layout of edges becomes aboslutely unusable and the end results is
much worse than if we layouted the graph normally.

We can also handle the layouting of subgrahps manually by performing two-run layout, that is we would really replace
the subgraph with one node, instead of it being actual subgraph, but we end up in the same situation.
Sure on the high level we are fine, but we don't consider the content inside the subgraph for optimal layout result. So the issue is in the fact that we need to consider whole graph when layouting, we can't just layout the subgraph and then the rest of graph.

Therefore the issue is really highly non-trivial to solve, since even the layouting library can not deal with it.

#### Layout package architecture

`index.ts` - Contains the main layout method and behaves as API for the rest of the Dataspecer. The main function called by the API methods, which handles the running of algorithms multiple times and chooses the best one based on computed metrics is the `runMainLayoutAlgorithm`.

In the API user provides entities to layout and user given algorithm configurations.
Note that entities to layout can be both present and not present (so called outsiders) in visual model.

Those entities are then transformed into graph representation, which is later further transformed into to the graph representation
for the layouting library (in our case ElkJS). Same transformation then takes place in the opposite direction.

![layout-representations-conversion](images/layout-representations-conversion.png)

When it comes to the user given algorithm configurations. Those are transformed into `ConfigurationContainer` which contains
specific `GraphTransformationActions` and `AlgorithmConfiguration` steps which need to be performed for the
concrete algorithm. The `AlgorithmConfiguration` is basically wrapper around the user given algorithm configuration. It just additionally contains the parameters transformed for the layouting library.

#### Layout package directory structure:

- `configurations`
  - `Elk` - Contain the Elk specific configurations
    - `Elk-configurations.ts` - Contains the Elk typescript classes for the different Elk layouting algorithms. The classes hold the user given algorithm parameters and conversion of those the Elk parameters. They are Elk implementations of the typescript class found in `algorithm-configuration.ts`.
    - `Elk-utils.ts` - Contains the mappings of configuration parameters from general name to the Elk specifics. Basically the idea was to not use the elk aprameters directly, but instead use some general names, that should make the code more general (for example if we wanted to introduce another library which does similar stuff). So we use general names, which are then transformed to Elk equivalents.
  - `user-algorithm-configurations.ts` - Contains the `UserGivenAlgorithmConfigurations` interface, which describes the layout configuration. It contains the chosen algorithm and list of all available algorithms, where each algorithm has specific parameters, which can be also found in this file in the corresponding interfaces.
  - `algorithm-configuration.ts` - Similar to the previous one, but the distinction is that this are class implementations, while the previous ones are interfaces which are used when creating the user configurations, these are used in the layouting itself, so they take the interface in the constructor and create object of it with additional data, which make it easier to pass the information to the layouting system.
  - `configuration-factories.ts` - This file contains factory to create the configuration containers
based on the parameters and algorithms. This is probably the most important file to look at if you are writing your own algorithm. Since you also need to extend the factory + it really helps to understand the code/workflow. But what exactly you should do when you are writing your own algorithm is described in the next section in more detail.
  - `configuration-container.ts` - Contains the configuration container, which stores all layouting and graph actions in order which they should be performed in `performLayoutingBasedOnConfigurations` inside the `index.ts` file
  - `graph-conversion-action.ts` - Contains so called graph conversion actions, these are actions on graph, which are not layouting itself but somehow transform the graph or find some information about it. For example turn the graph into tree or find clusters.
- `dimension-estimators` - Contains typescript classes used to estimate the width and height of a node. Currently there is constant estimator and more complex one which takes into consideration name, attributes, etc. and tries to estimate how big will be the node when rendered.
- `graph`
  - `graph-metrics` - Contains interface for representation of metric and implementations of some chosen metrics. Also just a interesting implementation detail, I noticed that if only metric(s) is used as name, it can sometimes result into page-block caused by some browser add-ons, possibly adblock.
  - `representation` - Contains files used for representation of the graph.
- `layout-algorithms` - Contains the graph transformers, `LayoutAlgorithm` interface and implementations
  - `graph-transformers`
    - `graph-transformer-interface.ts` - Contains interface which should be implemented, when new layouting library is introduced. The interface handles the transformation to the layouting library representation from the general graph representation and the conversion back (respectively the update of the existing representation).
    - `Elk-graph-transformer.ts` - is the implementation of the transformer for the Elk layouting library.
  - `implementations` - Contains implementations of the `LayoutAlgorithm` for the corresponding layouting algorithms
  - `layout-algorithms-interfaces.ts` - Concretely the interface `LayoutAlgorithm`, which has to be implemented by all layouting algorithm.
  - `list-of-layout-algorithms.ts` - This file contains list of all implemented algorithms. This is the first place you should extend if you want to implement your own algorithm. The compiler errors will then guide you to most of the places you should touch upon to add the new algorithm. But to consult this in more detail check the following section.
  - `entity-budles.ts` - Transforms given data from semantic models into bundles to they are easier to work with, when we are creating the general graph (not the layouting library one) to layout
- `util` - Contains utility functionality needed in other parts of the package.

- `index.ts` file - Contains the main layout functions, which are exported, so they can be also used in other parts of Dataspecer
- `explicit-anchors.ts` file - Contains the functionality for anchor overriding, because sometimes we want to override the given anchor settings. For example when we are adding new nodes and edges to already existing graph (when click the show vocabulary button),
we want to keep the existing nodes in place, so we override their anchor settings.
- `graph-algorithms.ts` file - Contains some needed graph algorithms, for example to compute clusters for cluster-based layouting algorithm or to turn graph into trees, etc.

#### How to implement own algorithm
1. Go into the `list-of-layout-algorithms.ts` and extend the `AlgorithmName` type and the map `ALGORITHM_NAME_TO_LAYOUT_MAPPING`
2. Fix the introduced errors by this. That is
  - Put your algorithm into `/implementations`, so it implements `LayoutAlgorithm` interface and point to it from the map.
  - Fix the errors in `Elk-utils.ts`, if it is not using Elk set it to the same values like `random` algorithm for example, if it is then set it how it should be.
  - Extend the `UserGivenAlgorithmConfigurationInterfaces` and `UserGivenAlgorithmConfigurationInterfacesUnion` by newly introduced configuration for your layouting alogrithm (just check the others if you dont know how it should look, for example `UserGivenAlgorithmConfigurationLayered`).
In short just create interface, put in the correct `layout_alg` name and add the parameters. It should also extend the `UserGivenAlgorithmConfigurationBase` interface.
  - Introduce the class implementing configuration (you can take a look at the `RandomConfiguration`, just create class which extend `DefaultAlgorithmConfiguration` with generic set to your `UserGivenConfiguration` or if you are extending Elk, some of the Elk ones) and extend the `getDefaultUserGivenAlgorithmConfigurationsMap` as all the others do it.
  - Now it should compile, but we are still not finished unfortunately, but we would notice that if we tried running the algorithm, since we would get explicit run-time errors explaining that we are not finished.
3. Go into the `user-algorithm-configurations.ts`, which contains the `UserGivenAlgorithmConfigurations` and then go to `algorithm-configuration.ts` and introduce new configurations.
That is create new interfaces and classes and extend the `UserGivenAlgorithmConfigurations`.
4. Finally introduce the new algorithm into the `configurations/configuration-factories.ts`, that is extend the switch inside the `addAlgorithmConfigurationLayoutActions` method. Looking at the other algorithms should be enough to quickly find out how.
5. Also extend the `addToLayoutActionsInPreMainRunBasedOnConfiguration`, otherwise you will get run time error, that being said you can usually get away with not doing anything in the switch, here you should only do stuff if you want to perform something before running the layouting loop (that is the loop which runs the multiple times and chooses the best layout based on metrics.)

In step 3, when extending you may notice two at first slightly confusing methods (`addAlgorithmConfigurationToUnderlyingData`, `addAdvancedSettingsToUnderlyingData`). Since the class behaves as container for parameters from users
and internal parameters (for example in case of Elk the user data transformed to Elk data), this method should handle the extension of the internal parameters (so for example the Elk data). If we add new user parameter internally (as programmer) inside the program, then these should set the underlying data (so in case of Elk the Elk data).

This should be all, unless new layouting library was introduced, if so then you should create new `layout-algorithms/graph-transformers/graph-transformer-interface.ts` in a similar way the Elk is implemented in the same directory.

#### Advanced settings
You may notice that each algorithm contains the `advanced_settings` property, this one is working, but currently unable to be set from user UI.
Basically the idea behind advanced_settings is that since Elk contains ton of parameters, we would like to provide them through this setting, since it is unfeasible to have it all in user UI.
