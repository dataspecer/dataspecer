import path from "path";
import fs from "fs";


export const pathToSSHForDS = path.resolve("./database/ds-users/.ssh");
export const pathToSSHConfigForDS = path.resolve(`${pathToSSHForDS}/config`);
fs.rmSync(pathToSSHForDS, { recursive: true, force: true });      // TODO RadStr: Not sure if we should remove it. However for debugging it is necessary.
