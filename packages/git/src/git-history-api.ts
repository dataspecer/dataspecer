
export type GitRawHistoryToSendToClient = {
    rawCommits: readonly RawCommitData[],
}

export type FetchedGitRawHistory = {
  rawCommits: RawCommitData[]
}

export type RawCommit = {
    hash: string,
    authorName: string,
    authorEmail: string,
    authorTimestamp: string,
    commitMessage: string,
    date: string,
    parents: string,
    refs: string,
}

export type BranchHistory = {
  name: string;
  commits: RawCommitData[];
}

export type GitHistory = {
  branches: BranchHistory[];
  /**
   * The default branch - the branch you end up on when doing git clone - usually main/master, but may be develop
   */
  defaultBranch: string;
}

type RawCommitData = {
    hash: string,
    authorName: string,
    authorEmail: string,
    authorTimestamp: string,
    commitMessage: string,
    date: string,
    parents: string,
    refs: string,
}

export type CommitInfo = {
  author: {
    name: string,
    email: string,
    timestamp: string,
  };
  subject: string;      // Commit message
  hash: string;         // Commit hash
  date: string;         // Author date of commit in iso8601
  parents: string[];
  refs: string[];       // The refs which points to this commit (HEADs of branches, i.e. the last commit on branch)
}
