// TODO RadStr: Better Test names

import { expect, test } from "vitest";
import path from "path";
import { isAccessibleGitRepository, ROOT_DIRECTORY_FOR_ANY_GIT, ROOT_DIRECTORY_FOR_PRIVATE_GITS, ROOT_DIRECTORY_FOR_PUBLIC_GITS } from "./git-store-info.ts";

test("Test isAccessibleGitRepository any 1", () => {
    const {isAccessible} = isAccessibleGitRepository(path.join(ROOT_DIRECTORY_FOR_ANY_GIT, "my-repo"));
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository any 2", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_ANY_GIT + "a");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository private", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PRIVATE_GITS);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository public 1", () => {
    const {isAccessible} = isAccessibleGitRepository(path.join(ROOT_DIRECTORY_FOR_PUBLIC_GITS, "my-repo"));
    expect(isAccessible).toBeTruthy();
});

test("Test isAccessibleGitRepository public 2", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "my-repo");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository public 3", () => {
    // It has to be inside of the directory, it is not enough to match.
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository public 4", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/../.");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository public 5", () => {
    const {isAccessible} = isAccessibleGitRepository(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}/./../test`);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository public 6", () => {
    const {isAccessible, normalizedGitPath} = isAccessibleGitRepository(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}/./../public/test`);
    expect(isAccessible).toBeTruthy();
    expect(normalizedGitPath).toBe(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}${path.sep}test`);
});

