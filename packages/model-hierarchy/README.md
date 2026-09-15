# @dataspecer/model-hierarchy

This package interprets an internal represetation of how packages and models are structured and stored inside **@dataspecer/core/project-model** and interprets it as a tree of individual dependencies between packages and models.

The idea is following:
- Load all models and a project model for the given project.
- Pass it via this package to understand its hierarchy in terms of vocabularies, application profiles and structure models.

## composition configuration

Is an additional configuration that can tweak how models are composed together.

## `reusedProjects` property

It is a mechanism of **@dataspecer/core/project-model** that allows one project to be injected into another as a dependency. For this package, there is no distinction between normal dependency and reused project.

## future work

- Currently the model is read-only. So to add model you still need to undertstand the underlying **@dataspecer/core/project-model**.
- The model has no dynamic interface. In case of change in the **@dataspecer/core/project-model** or data on packages you need to rebuild from scratch.
