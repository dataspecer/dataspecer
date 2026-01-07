export class GitRestApiOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Git Rest API operation error";
  }
}
