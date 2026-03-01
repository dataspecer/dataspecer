export enum IssueState {
  Open = "open",
  Closed = "closed",
  All = "all",
}

export type GitIssueInfo = {
  title: string;
  author: string;
  urlToIssue: string;
  //
  labels: {name: string, color: string}[];
  //
  createdAt: Date;
  lastActivityAt: Date;
};

export type GitIssuesFetchResponse = {
  issues: GitIssueInfo[];
};
