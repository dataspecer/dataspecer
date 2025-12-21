export type ReadmeTemplateData = {
  /**
   * is the url of the dataspecer tool, which was used to create this readme. ... TODO RadStr: ... We can put it away, but if we really want this, we have to somehow put it into environment variables/secrets in github.
   */
  dataspecerUrl: string,
  /**
   * Is the URL of the publication repository
   */
  publicationRepositoryUrl: string,
};

/**
 * @returns Returns string created from template with substitutes given in {@link readmeTemplateData}.
 *  The string is valid Markdown, which can be then used in README for (but not only) GitHub repository.
 */
export const readmeTemplate = (
  readmeTemplateData: ReadmeTemplateData,
): string => {
  // Be careful with the tabs between the start of lines - if they are there, the README is rendered as code block
  return `# This repository is connected to [Dataspecer online tool](${readmeTemplateData.dataspecerUrl})

Every commit to main generates documentation from the committed data specification. The documentation is generated into the "publication-branch" branch.

Each commit into the "publication-branch" is deployed using GitHub pages.`
};
