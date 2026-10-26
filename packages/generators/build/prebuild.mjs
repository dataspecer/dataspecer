import { mkdirSync, copyFileSync, rmSync } from "fs";

rmSync("lib", { recursive: true, force: true });
mkdirSync("./lib", {recursive: true});
copyFileSync("./package.json", "./lib/package.json");
