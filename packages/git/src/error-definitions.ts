export class GitRestApiOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Git Rest API operation error";
  }
}


export class ErrorDefinitionConstantsClass {
  private constructor() {}

  public static BRANCH_ALREADY_MERGE_ERROR_MSG = "The merge from branch was already merged. We can not merge again.";
  public static NO_CHANGES_TO_COMMIT_ERROR_MSG = "There are no changes to commit.";

  public static convertToFrontendResponseMessage(errorMsg: string) {
    return "Error: " + errorMsg;
  }
}
