/**
 * @returns Returns string, which can be then used in README for (but not only) GitHub repository. The string is valid Markdown.
 */
export const createGitReadMeContent = (): string => {
  // Be careful with the tabs between the start of lines - if they are there, the README is rendered as code block
  return `# This repository was created using [Dataspecer online tool](https://dataspecer.com/)

Every commit to main generates documentation from the committed data specification. The documentation is generated into the "publication-branch" branch.

Each commit into the "publication-branch" is deployed using GitHub pages.`
};
