import { exec } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";
import { formatDateWithTimezone } from "./dateUtils.js";

const execAsync = promisify(exec);

/**
 * Checks if the given directory is a git repository.
 * @param cwd - The working directory to check
 * @returns True if the directory is a git repository, false otherwise
 */
export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await execAsync("git rev-parse --git-dir", { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Escapes a commit message for safe use in a shell command.
 * @param message - The commit message
 * @returns The escaped commit message
 */
function escapeCommitMessage(message: string): string {
  // Replace double quotes with escaped double quotes and wrap in double quotes
  return message.replace(/(["\\$`])/g, "\\$1");
}

/**
 * Builds a git commit command string with optional custom date.
 * @param cwd - The working directory
 * @param commitMessage - The commit message
 * @param customCommitDate - The custom commit date, or null for current date
 * @returns The git command string
 */
function buildGitCommitCommand({
  commitMessage,
  customCommitDate,
}: {
  commitMessage: string;
  customCommitDate: Date | null;
}): string {
  // Detect platform
  const isWindows = platform() === "win32";
  let gitCommand = "git add . && git commit";
  if (customCommitDate) {
    // Use local time with timezone offset for git
    const localDateStr = formatDateWithTimezone(customCommitDate);
    gitCommand += ` --date=\"${localDateStr}\"`;
    if (isWindows) {
      gitCommand = `set \"GIT_AUTHOR_DATE=${localDateStr}\" && ${gitCommand}`;
    } else {
      gitCommand = `GIT_AUTHOR_DATE=\"${localDateStr}\" ${gitCommand}`;
    }
  }
  gitCommand += ` -m \"${escapeCommitMessage(commitMessage)}\"`;
  return gitCommand;
}

/**
 * Commits changes in the given directory with an optional custom commit date.
 * @param cwd - The working directory
 * @param commitMessage - The commit message
 * @param customCommitDate - The custom commit date, or null for current date
 * @returns The stdout and stderr from the git command
 */
export async function commitWithCustomDate({
  cwd,
  commitMessage,
  customCommitDate,
}: {
  cwd: string;
  commitMessage: string;
  customCommitDate: Date | null;
}): Promise<{ stdout: string; stderr: string }> {
  const gitCommand = buildGitCommitCommand({ commitMessage, customCommitDate });
  return execAsync(gitCommand, { cwd });
}
