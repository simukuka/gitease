import simpleGit, { SimpleGit } from 'simple-git';

/**
 * Check if the current directory is inside a Git repository
 */
export async function isGitRepository(): Promise<boolean> {
  const git: SimpleGit = simpleGit();
  
  try {
    await git.revparse(['--is-inside-work-tree']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  const git: SimpleGit = simpleGit();
  
  try {
    // First, try to get the branch name
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch (error) {
    // If that fails, check if it's because there are no commits
    try {
      // Try to get branch name from git symbolic-ref (works even without commits)
      const symbolicRef = await git.raw(['symbolic-ref', '--short', 'HEAD']);
      return symbolicRef.trim();
    } catch (symbolicError) {
      // If both fail, we're in a detached HEAD or brand new repo
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get current branch: ${errorMsg}`);
    }
  }
}

/**
 * Get repository status (modified files, etc.)
 */
export async function getRepoStatus() {
  const git: SimpleGit = simpleGit();
  
  try {
    const status = await git.status();
    return status;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get repository status: ${errorMsg}`);
  }
}

/**
 * Check if repository has any commits
 */
export async function hasCommits(): Promise<boolean> {
  const git: SimpleGit = simpleGit();
  
  try {
    await git.revparse(['HEAD']);
    return true;
  } catch (error) {
    return false;
  }
}