export class GitRestApiOperationError extends Error {
  private statusCode: number;
  public getStatusCode() {
    return this.statusCode;
  }

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "Git Rest API operation error";
    this.statusCode = statusCode;
  }
}


export class ErrorDefinitionConstantsClass {
  private constructor() {}      // It is "static" class

  public static BRANCH_ALREADY_MERGE_ERROR_MSG = "The merge from branch was already merged. We can not merge again.";
  public static NO_CHANGES_TO_COMMIT_ERROR_MSG = "There are no changes to commit.";
  public static INVALID_FORMAT_ON_PULL = "The pulled data is not in a valid format.";

  public static convertToFrontendResponseMessage(errorMsg: string) {
    return "Error: " + errorMsg;
  }
}
