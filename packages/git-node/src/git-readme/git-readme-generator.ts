import { createGitReadMeContent } from "./git-readme-template.ts";
import fs from "fs";

/**
 * Creates new markdown README file at given {@link pathToReadmeFile}. Internally uses {@link createGitReadMeContent}.
 * @param pathToReadmeFile is the path, where should be the file put (that is without the name). So for example "path/to" results in creating new file in path/to/README.md
 */
export function createGitReadMeFile(pathToReadmeFile: string) {
  const readmeContent = createGitReadMeContent();
  fs.writeFileSync(pathToReadmeFile + "/README.md", readmeContent);
}
