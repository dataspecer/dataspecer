---
title: "Layouting from user perspective"
author: Radek Strýček
menu:
  docs:
    parent: "projects"
weight: 40
toc: true
---

# Layouting

## Anchoring
User can (un)anchor chosen node using the ⚓ button.

{{% tutorial-image "images/projects/cme-and-layout/anchor-node-button.png" %}}

Anchoring node means that once we run force-directed algorithm, the anchored nodes are not moved when layouting is finished.

Other algorithms unfortunately move the node. The Elk layouting library doesn't support anchoring for others.
Sure we could just run the algorithm and then not update the anchored visual nodes in the visual model, but that's simply not
really useful, since the layouting algorithm moved it, so by having it stay on old place, the layout may be significantly worse.

User can tell if node is anchored by looking at the top right corner of node. If it contains the ⚓ icon, then the node is anchored.
As seen on the following image.


{{% tutorial-image "images/projects/cme-and-layout/anchored-node-example.png" %}}


The user can layout:
1. Whole visual model
2. Selection - Where selection means the selected nodes and selected edges going between the selected nodes

## Layouting algorithms

We split the talk into two sections, quick guide (the following section) and detailed explanation.

### I don't have time, just tell me what's good

#### Layouting of visual model

- First you should try `force-directed with clusters` with default settings
- If you are not satisfied, just try force-directed - if it looks better, you can bump up the number of runs, which may improve results.
Just note that the gain in layout quality isn't linear.
Meaning if you run the algorithm 1 time, 10 times and 100 times, then the layout after 10 runs may be actually 10 times better than running only once, but running 100 times definitely won't be 100 times better. After certain number it is just waste of time. I think that on mid-sized graphs 10-50 should be the range to look for when you are using force-directed algorithm. It shouldn't last too long and results should be close to the best possible we can get through this technique. Note that if you are using force-directed with clusters, that one is roughly 3-4 times slower than the force-directed, so here I would stay at 10.
- If you want to layout diagram in layers (hierarchy), use hierarchical
- If you want to make the diagram more spacy or remove overlaps use Node overlap removal algorithm.

#### Layouting of selection


When it comes to layout of selection, I personally think that the most useful ones are:

- Layered (hierarchical). For example when we combine it together with the extend selection feature, we
can find all generalization children, and layout them as hierarchy, therefore we have generalization tree of depth 1 layouted in layers.
- Node overlap algorithm, this can be also useful, for example when we run force-directed algorithm for the whole diagram
and some small part of the layouted model is overlapping, or too close to each other
- Sometimes It may be also useful to use force-directed algorithm, for example if we want node and its neighborhood to layout like star:

{{% tutorial-image "images/projects/cme-and-layout/star-layout-force-directed.png" %}}


### Detailed List of algorithms and when to use them

Layout solution is based on the ElkJS layouting library.

### Warnings
- Only force-directed algorithm (Elk Stress) takes into consideration anchors
- All algorithms remove existing edge layout on the layouted part
- The layouting of groups is not optimal, for reason why you can check the [technical documentation for layout package](https://github.com/mff-uk/dataspecer/tree/main/packages/layout). Therefore you should create groups only after you are kinda happy with the overall layout.

#### Force-directed algorithms

- Should be the first class of algorithms to try if you don't know, what layout to choose or how the data looks like.

- These types of algorithms are based on physical simulation.
The resulting layout tends to be symmetric, edges being of similar length and with low amount of edge crossings.

- They are run multiple times, which is controlled by the number of runs parameter. After the runs, best layout is chosen, where the best layout is the one with best metric values. `Metric` is value, which describes how good certain layout is. There are many metrics, we have implemented the most important ones based on articles. The edge-edge crossings and edge-node crossings. But there are more like area, orthogonality, edge crossing angle, etc.

##### [Force-directed](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-stress.html)

Layouted DCAT-AP using force-directed algorithm:

{{% tutorial-image "images/projects/cme-and-layout/elk-stress-dcat-ap.png" %}}

- Very simple to use
  - It has single parameter - ideal edge length. The algorithm then tries to layout nodes in such a way that all edges have this length.

##### Force-directed with class profiles
Same as previous, but the algorithm is manually modified, so user can set ideal edge length between class profiles

##### Force-directed with clusters
Layouted DCAT-AP using cluster based algorithm without edge layout of clusters:

{{% tutorial-image "images/projects/cme-and-layout/cluster-alg-dcat-ap-without-edge-layout.png" %}}

Layouted DCAT-AP using cluster based algorithm with edge layout of clusters:


{{% tutorial-image "images/projects/cme-and-layout/cluster-alg-dcat-ap-with-edge-layout.png" %}}

This algorithm isn't in Elk layout library, it was designed and implemented specifically for this project.

This algorithm seems to provide very good initial results for most of the semantic vocabularies. Sometimes even on-par with the manually made layouts.

The idea came by looking at DCAT-AP, layouting it with Elk stress algorithm and playing with the layout a bit.

Idea on high-level:
1. We want to find clusters,
2. layout them and
3. then layout the graph with clusters.

Implementation:
1. Find clusters
   - Find nodes, which are directly connected to at least one leaf. Those are initial clusters.
   - Recursively connect clusters, so they are maximal (that is going from leafs, if cluster is connected to exactly one more cluster, merge them)
   - Possible improvement: I also thought about the idea that cluster = graph articulation (nodes, which after removal split the graph into more components).
   But the results seemed to be worse, so I abandoned this idea. But maybe when somebody would spend couple of weeks with it, it could be improved.
2. Layout graph using Elk stress
3. For each cluster find least populated sector, that is with least nodes and edges.
   - Layout the cluster using Elk layered with the direction being Up, Right, Down, Left - based on the least populated sector.
4. Layout graph using Elk stress again. Only the nodes not being part of clusters = that is neither the cluster roots and neither the nodes inside cluster.

##### Random

Layouted DCAT-AP using random algorithm without node overlap removal:

{{% tutorial-image "images/projects/cme-and-layout/random-dcat-ap-without-node-overlap.png" %}}


Layouted DCAT-AP using random algorithm with node overlap removal:

{{% tutorial-image "images/projects/cme-and-layout/random-dcat-ap-with-node-overlap.png" %}}


Randomly places nodes on canvas. Very basic, not really recommended to use. Basically fallback if all the other fail due to programmer error/faulty data.

##### [Node overlap removal](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-sporeOverlap.html)


Has single parameter:
- Minimal distance between nodes

Very nice and useful algorithm. The closest node can not be closer than the provided parameter.

Most of the algorithms provide checkbox to run this algorithm to run after.
In such cases this algorithm is run with small value (around 50).

For example the Elk stress algorithm considers the edge length, but not the node sizes, because of that node overlaps may occur even
when you would not expect it. So this algorithm removes such overlaps. It is also useful, if we want to layout only part of graph, because the nodes in the specific part are too close together.

##### Hierarchical algorithm - [Elk layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html)

{{% tutorial-image "images/projects/cme-and-layout/layered-algorithm-dcat-ap.png" %}}

**Description taken from the Elk library reference:**

This algorithm is based on the algorithm proposed by Sugiyama, Tagawa and Toda in 1981.

It emphasizes the direction of edges by pointing as many edges as possible into the same direction. The nodes are arranged in layers, which are sometimes called “hierarchies”, and then reordered such that the number of edge crossings is minimized. Afterwards, concrete coordinates are computed for the nodes and edge bend points.

Parameters:
- Distance between nodes within layer
- Distance between layers
- The emphasized direction
- Edge routing type
  - Orthogonal

  {{% tutorial-image "images/projects/cme-and-layout/orthogonal-edge-routing.png" %}}

  - Splines

  {{% tutorial-image "images/projects/cme-and-layout/splines-edge-routing.png" %}}

  - Polylines

  {{% tutorial-image "images/projects/cme-and-layout/polylines-edge-routing.png" %}}