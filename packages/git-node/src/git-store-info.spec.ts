import { expect, test } from "vitest";
import path from "path";
import { isAccessibleGitRepository, ROOT_DIRECTORY_FOR_ANY_GIT, ROOT_DIRECTORY_FOR_PRIVATE_GITS, ROOT_DIRECTORY_FOR_PUBLIC_GITS } from "./git-store-info.ts";

test("Test isAccessibleGitRepository accessing the parent's side repo", () => {
    const {isAccessible} = isAccessibleGitRepository(path.join(ROOT_DIRECTORY_FOR_ANY_GIT, "my-repo"));
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing the directory with same prefix in name as parent", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_ANY_GIT + "a");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing private subrepo", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PRIVATE_GITS);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing content inside public repo", () => {
    const {isAccessible} = isAccessibleGitRepository(path.join(ROOT_DIRECTORY_FOR_PUBLIC_GITS, "my-repo"));
    expect(isAccessible).toBeTruthy();
});

test("Test isAccessibleGitRepository accessing public side repo", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "my-repo");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing the public repo itself", () => {
    // It has to be inside of the directory, it is not enough to match.
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing parent through ..", () => {
    const {isAccessible} = isAccessibleGitRepository(ROOT_DIRECTORY_FOR_PUBLIC_GITS + "/../.");
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository acessing parent side-repo through ..", () => {
    const {isAccessible} = isAccessibleGitRepository(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}/./../test`);
    expect(isAccessible).toBeFalsy();
});

test("Test isAccessibleGitRepository accessing public repo through .. and then going back", () => {
    const {isAccessible, normalizedGitPath} = isAccessibleGitRepository(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}/./../public/test`);
    expect(isAccessible).toBeTruthy();
    expect(normalizedGitPath).toBe(`${ROOT_DIRECTORY_FOR_PUBLIC_GITS}${path.sep}test`);
});

