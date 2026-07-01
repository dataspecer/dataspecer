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
  /**
   * Since it may be possible that the page will be different than the one currently shown on frontend.
   */
  page: number;
  isLastPage: boolean;
};
