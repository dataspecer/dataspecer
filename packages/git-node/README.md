@dataspecer/git-node
=========================

You can build this package using `npm run build` and run tests using `npm run test`.

This library provides a set of methods, which are related to the git-integration project and are node specific, therefore it is separate package, from the git one.

The package has the following content:

- `git-utils-node.ts` - are Git utils for example getting last commit hash of Git project and so on

- `git-store-info.ts` - Contains code that checks whether the incoming filesystem path is accessible to use. This exists so users cannot sent requests to access a filesystem path that is not in the drectory that contains Git projects

- `ssh` - contains code for storing of SSH key into filesystem and with that into the ssh config file

-`git-readme.ts` - is used to generate a README.md file when creating a repository.

-`git-providers` - is a a directory that contains the factory to create Git providers and a base class used for implementation of integration with actual providers. Those can be found in github-node.ts and gitlab-node.ts. Note that these are the node speciic variants - which add some extra methods to the classes from `git` package.

-`git-operations` - is a directory that contains code for pull, committing and cloning and some further utils.

-`filesystem-abstractions` - is a directory that contains interface for the filesystem abstraction and factory classs that can be used to create a new filesystem abstraction. It gets the type of the filesystem and path to root. Note that the filesystem abstraction have always exactly one root - called "fake-root", under it are the actual data. There are currently two implementations - the Dataspecer filesystem (`DSFilesystem`) that creates abstraction over data in Dataspecer and `ClassicFilesystem` that creates abstraction over data in a Git directory that represents Git repository. Regarding implementation there is currently slight disconnec in a sense that Dataspecer filesystem does not erally need project iris to locate resources. While the `ClassicFilesystem` needs needs project Iris, since the files have projectIris as names.