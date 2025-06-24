import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await execAsync("git rev-parse --git-dir", { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function commitWithCustomDate({
  cwd,
  commitMessage,
  customCommitDate,
}: {
  cwd: string;
  commitMessage: string;
  customCommitDate: Date | null;
}): Promise<{ stdout: string; stderr: string }> {
  let gitCommand = "git add . && git commit";
  if (customCommitDate) {
    const isoDate = customCommitDate.toISOString();
    gitCommand += ` --date="${isoDate}"`;
    gitCommand = `GIT_AUTHOR_DATE="${isoDate}" ${gitCommand}`;
  }
  gitCommand += ` -m "${commitMessage.replace(/"/g, '"')}"`;
  return execAsync(gitCommand, { cwd });
}
