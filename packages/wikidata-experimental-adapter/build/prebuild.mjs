import { rmSync } from "fs";
import { compileDir } from "./sparql-compiler.mjs";

rmSync("lib", { recursive: true, force: true });
compileDir("./src", "lib");
