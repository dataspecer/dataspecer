---
title: "Helping users in creating diagrams for data specifications"
author: Radek Strýček
menu:
  docs:
    parent: "projects"
weight: 40
toc: true
---

# Description of document
- The first part of the document is quick guide for the project. This is useful, if you are my oponent, or you just want quick introduction.
- The second part is full fledged user documentation - Even if you are planning to read this, don't skip the quick guide.


## Quick quide for the project itself

### Where to start

#### Introduction

First thing you are probably thinking is **What was the project about**.

The project focused on improving users' experience when creating diagrams inside the `Dataspecer's Conceptual model editor (CME)`. On surface you can think of the CME as any other conceptual model editor, for example UML tools like Enterprise architect, but it is actually much more, since it allows users to profile entities or allows them to reuse vocabularies from the web.

To improve the experience we introduced layouting, highlighting, groups, alignment, etc. You can read more about that in the [user documentation](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/cme-and-layout/#conceptual-model-editor-cme---user-documentation). You should visit the doumentation if:

- You want to check what I did. The documentation mostly focuses on that, which is quite nice in a way that you can map the functional requirements from the specification to the actual final result. Unfortunately the actual mapping is not in the documentation. Also be careful that some of the functionality is "hidden", for example alignment helper or the fact that each node added to canvas is placed on canvas through layouting.
- You are not understanding, how some of the functionality work
- You want to learn something about layouting algorithms - for that is [special document](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/layout-algorithms/).

#### I am good, get me into action
##### How to launch
You can launch `CME` either [locally](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/cme-and-layout/#how-to-run-cme-and-the-rest-locally-but-may-get-deprecated-over-time) or you can run the [deployed version](https://radstr-project-branch.dataspecer.pages.dev/conceptual-model-editor/diagram). Every push to GitHub deploys Dataspecer using CloudFlare. So if you want to visit some specific version, you can do that by clicking the ✔️ next to the commit message.

Assuming you opened the deployed version through the [given link](https://radstr-project-branch.dataspecer.pages.dev/conceptual-model-editor/diagram), now you are inside CME.

{{% tutorial-image "images/projects/cme-and-layout/catalog-canvas-header.png" %}}

To get you started:
- click the `vocabulary` tab in catalog
- Click on the +
- Add some of the well-known vocabulary, for example FOAF.
- Click on the eye next to the model.

To Add your own concepts click on the relevant tab, for example classes and again click on the + in the local model.
Note that all of the buttons contains tooltip on hover, so definitely use that to explore the buttons in catalog.

Note that CME is not the only part of Dataspecer. You can visit the manager [here](https://radstr-project-branch.dataspecer.pages.dev/), that is the URL without the `conceptual-model-editor/...` suffix. Manager allows you to:
- create new package at the top right
- then you can click the + and choose `Visual Model`
- clicking open on the `Visual Model`, which opens CME. Now you can also save your work using the buttons at the top of the page.

#### Give me the technical details
There are two main places to look at, when you want to see the code:
- The [layout package](https://github.com/mff-uk/dataspecer/tree/radstr-project-branch/packages/layout). You can read more about the implementation in the README. In this package all of the code is created by me.
- [CME](https://github.com/mff-uk/dataspecer/tree/radstr-project-branch/applications/conceptual-model-editor) - Here we provided in the [documentation](https://github.com/mff-uk/dataspecer/tree/radstr-project-branch/applications/conceptual-model-editor/documentation) only the highlevel image of C4 component and directory structure. The code here is shared with [Petr Škoda](https://github.com/skodapetr), who is also responsible for the code related to CME, which brings us to the fact, as you may have already noticed, we are not on the main branch.

#### Technical state of project
Last "few" commits of project are on [separate branch](https://github.com/mff-uk/dataspecer/tree/radstr-project-branch), because as the end of project approached, the amount of code was growing bigger, so there was simply no time for code reviews. Also one big breaking point was [this pull request](https://github.com/mff-uk/dataspecer/pull/1131), where simply the number of changes was too large process. So I had to from then on make the pull requests smaller and split the pull request into smaller ones. This unfortunately added some mental overhead about where is actually what and how to piece it all together.

All of the functional requirements from project were implemented. Except one
- Have model containing visual model configuration (for example color).

Since we already had working version, which stores the color inside visual model and we couldn't think of anything else to put into the model, we skipped it.

However we also did some extra things like
- Implemented one optional requirement - More visual entities for one semantic one
- and went beyond normal scope on layouting by designing and implementing layouting algorithm.


# Conceptual-Model-Editor (CME) - user documentation

This document explains most of the available non-basic features of CME, which were developed as part of research project.

If you want to look at how the basic functionality works, like editation of semantic entities, etc.. You have 3 options:
1) Read through this document. Even though the basics are not covered directly, some of it may become clear as you go. Especially after reading the [Quick guide](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/cme-and-layout/#quick-quide-for-the-project-itself) above.
2) Learn them by playing a bit in the editor.
3) You can consult the [original CME docs](https://github.com/mff-uk/dataspecer/blob/main/applications/conceptual-model-editor/docs/intro-document.md), but note that they are quite old and therefore deprecated at places, so even though it may help, you may be better just figuring out yourself.

Personally I would do it exactly in the order described here, that is 1, 2, 3

In short the conceptual model editor allows user to create new concepts and modify or profile existing concepts.

Existing concepts could be created by us in the same project or they could be used from some vocabulary on web.

Note that concepts from the web vocabularies can not be edited. They can only be profiled.

CME behaves like classic conceptual modelling with the additional option to reuse existing vocabularies and
the concept of profiling.

**Terms:**
- `Package` - You can think of it as a directory. CME's goal is then to allow view and modify subset of this package. Where the subset are semantic models (also called `Vocabularies`) and the `visual models`, you can find the existing packages [here](https://tool.dataspecer.com/)

{{% tutorial-image "images/projects/cme-and-layout/package-manager.png" %}}

- `Vocabulary` - Stores classes, relationships and attributes and profiles. The vocabulary itself contains some properties:
  - Name
  - IRI
  - Color
- `Class` - Named semantic concept. Class has the following properties
  - Name
  - IRI
  - Definition
  - and it belongs to exactly one model
- `Relationship` - Semantic concept, which represents connection between two classes. It has the same properties as class - name, IRI, definition
- `Attribute` - Special type of relationship, which has one end as class and other as data type.
This is from semantic perspective, but in conceptual modelling when it comes to visuals, we want to sometimes show relationship as attribute,
that is instead of drawing edge between two nodes, it appears as text on node. The terms about visual entities are explained couple of lines down.
- `Profile` - We can create profile of the above mentioned concepts, that is classes, relationships, attributes.
What is profile? Basically we take existing concept, which we want to reuse, but we want to reuse it in our application context. The application context is defined by the usage note and the fact that we can override properties of the profiled entity, for example name. Profilling isn't mapping 1:1 but one-to-many, so if we create class profile, it can be profile of many different classes (and class profiles).
- `Visual model` (Sometimes also called `View`) - This is some kind of visual representation of underlying semantic concepts.
The representation doesn't necessary have to contain all of the semantic concepts and neither does the mapping have to be 1:1.
For example we can have one semantic entity represented by more than one visual, or the semantic entities can be "stored" inside
another visual model, which we represent by special type of node.
Within one package, there can be more than one visual model.
- `Active Visual model` - The currently shown visual model inside CME.
- `Visual entity` - Visual element, either node or edge.
- `Node` - Can be thought of as graph node. That is something, which can be possible edge end.
Currently there are two types of nodes.
  - Node representing semantic class.
  - Node representing visual model.
- `Edge` - Connects two nodes. Again multiple types.
  - Edge, which visually represents underlying semantic association (relationship)

  {{% small-image "images/projects/cme-and-layout/association-edge.png" %}}

  - Edge representing generalization

  {{% small-image "images/projects/cme-and-layout/generalization-edge.png" %}}

  - Visually representing relationship profile - Same visual as association.
  - And finally edges representing the connection between class and class profile.

    {{% small-image "images/projects/cme-and-layout/profile-to-class-profile-edge.png" %}}

## CME general view
Cme can be split into three main parts:
- Header - At the time of writing the documentaiton, it is seen on top. It contains general controls for CME. Like setting language, saving or controlling visual models for the package.
- Catalog - Contains the semantic information about package and visual information relevant to currently active visual model. In the time of writing documentation it is the component seen on the left. Note that size ratio between catalog and canvas can be changed by dragging the splitbar.
- Canvas - Takes the most part of the screen. It contains the visual representation of the visual model with nodes and edges.

{{% tutorial-image "images/projects/cme-and-layout/catalog-canvas-header.png" %}}


## Working with views/visual models
### Creating visual models
The user can create new visual model as can be seen on the following image.

{{% tutorial-image "images/projects/cme-and-layout/create-new-visual-model-button.png" %}}


Once clicked, user is presented with dialog, where he puts information about the new visual model. By confirming
the dialog, new visual model is created and active visual model is set to the created one.

#### Changing active visual model

User can also change currently active visual model to some of the existing.

{{% tutorial-image "images/projects/cme-and-layout/change-visual-model.png" %}}

## Catalog actions

### Actions on vocabularies

#### Showing/hiding all elements in semantic vocabulary

{{% tutorial-image "images/projects/cme-and-layout/catalog-vocabulary-visibility-v2.png" %}}

- Puts all classes and relationships from chosen semantic model on canvas. But note that, if we have relationship,
  which has at least one end from different semantic model and the end is NOT present on the canvas, then it is not added.
  To explain it exactly:
  - Both ends of the relationship lie in the chosen semantic model. The relationship is always added.
  - At least one end does not lie in the chosen semantic model. The relationship is added only when the end from the other model is present in visual model (that is on canvas).
- Hide works as expected

### Catalog actions on entities

{{% tutorial-image "images/projects/cme-and-layout/catalog.png" %}}

#### Target button

{{% tutorial-image "images/projects/cme-and-layout/target_button2.png" %}}

This functionality helps us navigate in the visual model and serves as direct connection between the catalog and canvas.

When this button is clicked the viewport is moved to the relevant entity.

- For attributes:
  - The visual nodes representing the class on which can be the attribute found (in other words domain class)
    - Note that if there is visual node for the relevant class, but the attribute is not visible on the node itself,
      then it counts as if the attribute is not present.
- For classes (and class profiles):
  - The visual node representing semantic class
- For relationships
  - The visual relationship representing semantic relationship

Since we support to have more than one visual entity for the semantic one, the target button behaves as iterator
over all the visual entities, which represent the semantic one.

#### Showing neighborhood

{{% tutorial-image "images/projects/cme-and-layout/show_neighborhood2.png" %}}

Again the results depends on the entity it is used for.
Basically it adds all entities in distance at most one to the visual model.

Explicitly it means:
- For classes add
  - All attributes on the class
  - All relationship types going from the class together with their ends (if not present)
    - If the end is present, then just add the relationship
  - All profiled classes, class profiles
- For attributes add
  - Just the class (without any attributes)
  - The attribute itself
    - Again if the class is already present in visual model, just add the attribute to all its representations and don't add the class to visual model again
- For relationship add
  - The ends
  - The relationship
    - Again if the end is present don't add it and only create the relationship between the relevant ends.

## Canvas actions

### Drag edge to canvas menu
Dragging edge from visual node to canvas opens menu.

This menu contains the following options:

{{% tutorial-image "images/projects/cme-and-layout/canvas-menu.png" %}}

- Create relationship (association) target - This option creates new target of relationship.
That means, new dialog is shown to create class. After confirmation new node representing the class is put
at the position of the menu. Relationship is created together with the node. This relationship has default parameters.
The source class is the class from which the dragging started. The target one is the created class.
- Create relationship (association) source - Same as previous except the class from which we started the dragging is target and the newly
created class is the source of the relationship
- Create generalization parent - As the relationship target, but now the type of edge is generalization.
- Create generalization child - As the relationship source, but now the type of edge is generalization.

### Node actions

{{% tutorial-image "images/projects/cme-and-layout/node-actions.png" %}}

#### Duplication
{{% tutorial-image "images/projects/cme-and-layout/node-actions-duplication.png" %}}

User can create duplicate of node by clicking the `⿻` button.
Node duplicate = New visual node, which represents the same underlying semantic concept.

Note: This feature is still not fully developed. So even though it works,
some operations may be difficult to perform,
therefore currently the usual use-case is:
1. Have fully-connected visual node
2. Create bunch of duplicates
3. Then for each duplicate choose the parts you want to show


#### Manipulate attributes

##### Manipulate attributes directly on node
By clicking on node, user can notice buttons next to the attributes:

{{% tutorial-image "images/projects/cme-and-layout/attribute-buttons-on-node.png" %}}

Those allows user from to (From left to right):
- Move attribute one position up in node
- Move attribute one position down in node
- Hide attribute from node.
- Edit the semantic information about attribute

In cases when user wants to perform more operations with attributes connected to the node representing underlying class,
he can choose the following option


##### Manipulate attributes through dialog

{{% tutorial-image "images/projects/cme-and-layout/edit-attribute-visibility-button.png" %}}

User can click the 📏 button as seen on the image above. This button allows user to choose which attributes should be visible on the node.

User is presented with the following dialog.


{{% tutorial-image "images/projects/cme-and-layout/edit-attributes-visibility-dialog.png" %}}

The dialog contains two columns. The first column contains the attributes currently visible on the node.
The second column contains the present semantic attributes on the underlying class, which are not currently visible on the node.

Newly the dialog contains also the relationships, which means that we can show relationship as attribute on node instead of it being edge between two nodes.

#### Layouting

Layouting is described separately, you can check it [here](https://radstr-project-branch.dataspecer-www.pages.dev/docs/projects/layout-algorithms/)

### Selection actions

When user performs selection on more than 1 entity, the following buttons are shown.


{{% tutorial-image "images/projects/cme-and-layout/selection-buttons-overview.png" %}}

#### Alignment
User can automatically align selected nodes using the button highlighted with red circle on the following picture.

{{% tutorial-image "images/projects/cme-and-layout/alignment-manual-first-menu.png" %}}

After clicking the button user is faced with possible alignment options:

{{% mid-size-image "images/projects/cme-and-layout/alignment-manual.png" %}}

#### Changing elements present in selection
##### Extending selection

{{% tutorial-image "images/projects/cme-and-layout/extend-selection-button.png" %}}

By clicking the 📈 button, the user is presented with the following dialog, which allows them to systematically extend selection.

{{% tutorial-image "images/projects/cme-and-layout/extend-selection.png" %}}


We have the option to select only the edges or also edges together with ends. As seen on the following image.

{{% tutorial-image "images/projects/cme-and-layout/extend-selection-only-edges.png" %}}

We can perform the following extensions of selection
(Keeping the column order in description that is outgoing -> incoming):
- Through relationship (association)
  - target
  - source
- Through generalization
  - target
  - source
- Through relationship (association) profile
  - target
  - source
- Through class profile
  - the profiled class
  - the class profile

###### How to use such feature - Example

1. Perform the extension itself

Let's say that you are interested how far can you reach if you went from the current selection only through relationship profiles
and the possible class profiles.

So you select the following checkboxes


{{% tutorial-image "images/projects/cme-and-layout/extend-selection-example-start.png" %}}

Now you click the `Extend`, which extends the current selection by the chosen options,
that is through all the class profiles and relationship profiles (and their ends) going
from the current selection.

This new state is saved as internal selection, now you can keep clicking the `Extend` button until you are happy.

After that you can either click the <span style="color:red">❌ Cancel</span> button, this will forget all the changes to the selection and
keep the selection which existed before opening this dialog.

Or you can click the <span style="color:green">✅ Accept</span> button, which takes the internal state and uses it as the
current selection in the diagram, that is all the changes which happened through the extension are saved.

2. What to do next once we have the extension:

- We can further change the selection using the filtering, which is described in the following section
- Perform actions on the selection - For example to put it into new diagram or to create visual diagram node from it.




##### Filtering selection

{{% tutorial-image "images/projects/cme-and-layout/filter-selection-button.png" %}}

By clicking the 📉, to user is shown the following dialog, which allows him to filter/restrict current selection.

{{% mid-size-image "images/projects/cme-and-layout/filter-selection.png" %}}

The selection is restricted to the chosen options, which can be any combination of the following:
- Classes
- Class profiles
- Relationships
- Relationship profiles
- Generalizations

Possible use-case is for example: Put everything on canvas, choose everything except profiles, hide it, which results in only the profiles being present on the canvas.

#### Actions on selection


{{% tutorial-image "images/projects/cme-and-layout/action-button-overview.png" %}}


When clicked, then user can perform the following operations the selected concepts:

{{% mid-size-image "images/projects/cme-and-layout/action-buttons-list-overview.png" %}}

From left to right:

1. Remove from semantic model
2. Remove from visual model (hide on canvas)
3. Create new view from selection - New view with selected entities is created, but we don't switch to the newly created view,
neither remove the selection from currently active visual model.
4. Profile selection - The behavior is following:

- If class (or class profile) is selected its profile is created (exactly once - this is important as seen in example, also thanks to this the profile of model should behave as expected)
- If relationship is selected, 2 class profiles are created, one for each end. Then relationship between the class profiles is created.

Complex use-cases:
- Creating profiles of selected relationships sharing end:
  - **Case 1**: Without the shared end selected. Then each relationship has different ends.
  - **Case 2**: With the shared end selected. Then the shared end is created exactly once and both edges are pointing to it.

#### Start state:

{{% tutorial-image "images/projects/cme-and-layout/profile-selection-start-state.png" %}}

Note: In the following two pictures the class profile and profiled class share position. On the left and on the right

#### Case 1:

{{% tutorial-image "images/projects/cme-and-layout/profile-selection-without-profiling-shared-end.png" %}}


#### Case 2:

{{% tutorial-image "images/projects/cme-and-layout/profile-selection-with-profiling-shared-end.png" %}}

#### Groups
Group is entity in visual model, which contains nodes and/or other groups.

##### Creating Group

{{% tutorial-image "images/projects/cme-and-layout/group-button.png" %}}

User can create group from selection clicking the ⛓️ button. Group from user perspective means that
when user moves node, he also moves all nodes in the group. It also behaves as one node in context of layouting.
In other words the relative positions between nodes in group are always kept.

Note that when user performs action on selection, all the nodes in group behave as selected.

##### Dissolving Group
Click on any node in the group, which you want to dissolve and click on the ⛓️‍💥 button.
The group will no longer exist. The positions of nodes inside group won't be affected.

#### Visual nodes representing visual models

We can create special type of visual node which represents visual model from the list of available visual models in the current package using the 📦 button. The Main purpose of this functionality is the simplification of visual model.

{{% tutorial-image "images/projects/cme-and-layout/creating-visual-diagram-node-from-existing.png" %}}

Similarly we can can select entities on canvas and click the 📦 button.
This creates dialog, which asks user to insert name of to be created visual model.
The selected entities are removed from the canvas, put into the new visual model and in the current visual model,
the visual diagram node referencing the newly created visual model is created.

{{% tutorial-image "images/projects/cme-and-layout/creating-visual-diagram-node-new.png" %}}

This type of node have some extra buttons compared to the visual nodes representing classes.

- 🌳 button puts on canvas all currently not visible relationships, which have exactly one end in the
node representing visual model.

{{% tutorial-image "images/projects/cme-and-layout/put-all-edges-related-to-visual-diagram-node-on-canvas-button.png" %}}

- 🗺️ button changes active visual model (that is the one that is shown) to the one represented by the visual node.

{{% tutorial-image "images/projects/cme-and-layout/move-to-represented-visual-model-button.png" %}}


- 💥 - Removes the node from active visual model and puts its content to the active visual model.
In other words the visual diagram node is replaced by its content.

{{% tutorial-image "images/projects/cme-and-layout/put-represented-visual-diagram-on-canvas-and-remove-visual-diagram-node.png" %}}


All the other buttons behave as expected, that is the info button shows basic detail about the node and the edit button allows
to change the name of the visual model.

Similarly to the duplicates, the functionality isn't yet fully fleshed out in a sense that it is not the most user-friendly as it can be.
However it should still support all the possible use-cases.


## How to run CME (and the rest) locally, but may get deprecated over time

- When you just want to test diagram without using packages stored on backened, then there is nothing extra you need to do.
  - Run `npm install` from root directory
  - Run `npm run build` from root directory
  - Run `npm run dev` from the applications/conceptual-model-editor directory

- Running manager - sometimes you want to access packages and not only run the diagram part:
  - In the applications/conceptual-model-editor directory create .env file from .env.example
    - When you want to use the official Dataspecer backend:
      - VITE_PUBLIC_APP_BACKEND="https://tool.dataspecer.com/api"
      - When you also want to run the manager and connect it to locally running CME, create .env.local from .env in the `/manager` and set the backend to
        - VITE_BACKEND="https://tool.dataspecer.com/api"
        - And run the manager using `npm run dev` from the applications/manager
    - When you want to run backend locally set the backend variables mentioned above to http://localhost:3100
and run the backend as described [here](https://github.com/mff-uk/dataspecer/tree/main/services/backend) (that being said I am no longer able to run the backend, so not sure if it still works, might be related to the https://github.com/mff-uk/dataspecer/issues/1145)
