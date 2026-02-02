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
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get current branch: ${errorMsg}`);
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