import simpleGit, { SimpleGit } from 'simple-git';
import { ConflictInfo } from './types.js';

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

/**
 * Check if the working tree has merge conflicts
 */
export async function checkConflicts(): Promise<ConflictInfo> {
  const git: SimpleGit = simpleGit();

  try {
    const status = await git.status();
    const conflictFiles = status.conflicted || [];
    return {
      hasConflicts: conflictFiles.length > 0,
      conflictFiles,
    };
  } catch (error) {
    return { hasConflicts: false, conflictFiles: [] };
  }
}

/**
 * Abort an in-progress merge
 */
export async function abortMerge(): Promise<boolean> {
  const git: SimpleGit = simpleGit();

  try {
    await git.merge(['--abort']);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a merge/rebase is in progress
 */
export async function isMergeInProgress(): Promise<boolean> {
  const git: SimpleGit = simpleGit();

  try {
    const status = await git.status();
    // simple-git doesn't expose MERGE_HEAD directly, but conflicted files indicate it
    return (status.conflicted && status.conflicted.length > 0);
  } catch (error) {
    return false;
  }
}

/**
 * List all local branch names
 */
export async function listLocalBranches(): Promise<string[]> {
  const git: SimpleGit = simpleGit();

  try {
    const summary = await git.branchLocal();
    return summary.all;
  } catch (error) {
    return [];
  }
}

/**
 * List remote branch names (without the remote/ prefix)
 */
export async function listRemoteBranches(): Promise<string[]> {
  const git: SimpleGit = simpleGit();

  try {
    const summary = await git.branch(['-r']);
    return summary.all.map(b => b.replace(/^origin\//, ''));
  } catch (error) {
    return [];
  }
}