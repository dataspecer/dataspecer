import { readmeTemplate as gitReadmeTemplate, ReadmeTemplateData } from "./git-readme-template.ts";
import fs from "fs";

/**
 * Creates new markdown README file at given {@link pathToReadmeFile} created from template with substitutes given in {@link readmeTemplateData}.
 * Internally uses {@link gitReadmeTemplate}.
 * @param pathToReadmeFile is the path, where should be the file put (that is without the name). So for example "path/to" results in creating new file in path/to/README.md
 */
export function createGitReadmeFile(pathToReadmeFile: string, readmeTemplateData: ReadmeTemplateData) {
  const readmeContent = gitReadmeTemplate(readmeTemplateData);
  fs.writeFileSync(pathToReadmeFile + "/README.md", readmeContent);
}
