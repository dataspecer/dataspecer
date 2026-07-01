@dataspecer/git
=========================

You can build this package using `npm run build` and run tests using `npm run test`.

This library provides a set of methods, which are related to the git-integration project and are needed on both the frontend and backend, therefore it is in separate package.

The file structure with simple explanation:

- `resource-types.ts` - contains types of resources (as they would be in the type field of resource) and their mapping to the export directory in case of the new, more structured, export
- `git-provider-api.ts` -
- `git-history-api.ts` - contains the types related to the Git history. That is the Commit type. It is used both on backend as the stuff to return and on frontend as the expected data coming server response.
- `export-import-data-api.ts` - Contains the DatastoreInfo (which is type that can be used to locate datastore) and it also contains the stuff used in the filesystem abstraction such as DiectoryNode
- `merge` directory handles comparison and the resolvers used in the diff editor
 - `comparison.ts` - Handles the comparison of datastores and filesystems/difftrees to check what are conflicts and what not.
 - `resolvers` - is a directory that contains the interface, base class and simple implementation of a merge state resolver that copies values one to another. Respectively returns the given value as a result
 - `comparison` is a directory that contains the code for stripping of datastores.

- `git-workflows-subprograms` - It is used in the GitHub Action (for the github subdirectory). It reads the Git config that contains the name of publication branch, export format and export version. It is a separate file and part of GitHub Action (meaning shell), because we have to do branching based on the format - The config can be either in JSON or YAML.

- `git-providers` directory contains the interface for Git providers. There are currently two implementations. One for GitHub, which works and is tested and one for GitLab, which currently has only implementation of some basic methods and most of them throw error. The `git-provider-factory.ts` contains the factories that can be used to created Git provide based on URL or other given data

- `git-issues` contains the code for issues. The `git-issue-labels.ts` contains the type that describes label and list of currently supported labels. It can be extended by new ones in case of need. `git-issue-types` are then the types that describe the data exchanged between frontend and backend, when the frontend is fetching inormation about issues from server.

- `git-configuration` - handles the creation, modification, storing and getting of Git configuration.

- `filesystem` - contains the interfaces and base implementation of the filesystem abstraction. There is also `client-filesystem.ts`, which is used by the frontend to get data from the server based on the information the frontend has. In other words, the frontend gets information about filesystem from server. For example, DatastoreInfos from DiffTree. It can then send the DatastoreInfo together with some more information to fetch, created, delete and modify data in the filesystem. Note that the implementation is only partial, it does not support all methods and it is mostly used with static calls.

- `datastore-manipulation` - It has two main purposes. One is the `iri-replacement.ts`, which handles the replacement of IRIs from one to another. This is mostly used during the Git commits, were we convert data from IRIs to projectIris (and the other way around). It also contains `datastore-type-converter.ts` than handles converting from string to object and other way around and the conversions between JSON and YAML. The `default-initialezers` directory is mostly deprecated. It existed to handle creation of some default values for model.

