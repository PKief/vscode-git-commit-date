import * as vscode from "vscode";
import { formatDate } from "./utils/dateUtils.js";
import { isGitRepository } from "./utils/gitUtils.js";
import { showDatePicker } from "./utils/pickerUtils.js";

/**
 * Helper to read extension configuration
 */
function getExtensionConfig() {
  const config = vscode.workspace.getConfiguration("commitDateSelector");
  return {
    showStatusBar: config.get<boolean>("showStatusBar", true),
    dateFormat: config.get<string>("dateFormat", "YYYY-MM-DD HH:mm:ss"),
  };
}

/**
 * Helper to show error messages
 */
function showError(message: string) {
  vscode.window.showErrorMessage(message);
}

/**
 * Status bar manager for custom commit date
 */
class CommitDateStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private get customCommitDate(): Date | null {
    return this._customCommitDate;
  }
  private set customCommitDate(date: Date | null) {
    this._customCommitDate = date;
    this.update();
  }
  private _customCommitDate: Date | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.command = "commitDateSelector.setDate";
    context.subscriptions.push(this.statusBarItem);
    this.update();
  }

  public setDate(date: Date | null) {
    this.customCommitDate = date;
  }

  public getDate() {
    return this.customCommitDate;
  }

  public update() {
    const { showStatusBar, dateFormat } = getExtensionConfig();
    if (!showStatusBar) {
      this.statusBarItem.hide();
      return;
    }
    if (this.customCommitDate) {
      this.statusBarItem.text = `$(clock) ${formatDate(this.customCommitDate, dateFormat)}`;
      this.statusBarItem.tooltip = "Custom commit date set. Click to change.";
    } else {
      this.statusBarItem.text = "$(clock) Set Date";
      this.statusBarItem.tooltip = "Click to set custom commit date";
    }
    this.statusBarItem.show();
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Commit Date Selector extension is now active");

  // Status bar manager instance
  const statusBar = new CommitDateStatusBar(context);

  // Register commands
  context.subscriptions.push(
    registerSetDateCommand(statusBar),
    registerClearDateCommand(statusBar),
    registerCommitWithDateCommand(statusBar),
  );

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("commitDateSelector")) {
      statusBar.update();
    }
  });
}

function registerSetDateCommand(statusBar: CommitDateStatusBar) {
  return vscode.commands.registerCommand(
    "commitDateSelector.setDate",
    async () => {
      try {
        const selectedDate = await showDatePicker(statusBar.getDate());
        if (selectedDate === null) {
          // Clear action
          if (statusBar.getDate()) {
            statusBar.setDate(null);
            vscode.window.showInformationMessage("Custom commit date cleared");
          }
          return;
        }
        statusBar.setDate(selectedDate);
        vscode.window.showInformationMessage(
          `Commit date set to: ${formatDate(selectedDate, "YYYY-MM-DD HH:mm:ss")}`,
        );
      } catch (error) {
        showError(`Error setting date: ${error}`);
      }
    },
  );
}

function registerClearDateCommand(statusBar: CommitDateStatusBar) {
  return vscode.commands.registerCommand("commitDateSelector.clearDate", () => {
    statusBar.setDate(null);
    vscode.window.showInformationMessage("Custom commit date cleared");
  });
}

function registerCommitWithDateCommand(statusBar: CommitDateStatusBar) {
  return vscode.commands.registerCommand(
    "commitDateSelector.commitWithDate",
    async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          showError("No workspace folder open");
          return;
        }
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        if (!(await isGitRepository(workspaceRoot))) {
          showError("Not a git repository");
          return;
        }

        // Use VS Code Git extension API to commit
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
          showError("VS Code Git extension not found");
          return;
        }
        const gitApi = gitExtension.isActive
          ? gitExtension.exports.getAPI(1)
          : (await gitExtension.activate()).getAPI(1);
        // Import the Repository type from the Git extension API
        type Repository = (typeof gitApi.repositories)[0];
        const repo = gitApi.repositories.find(
          (r: Repository) => r.rootUri.fsPath === workspaceRoot,
        );
        if (!repo) {
          showError("No matching git repository found");
          return;
        }
        const commitMessage = repo.inputBox.value.trim();
        if (!commitMessage) {
          showError("Commit message cannot be empty");
          return;
        }

        // Stage all changes if nothing is staged
        if (
          repo.state.indexChanges.length === 0 &&
          repo.state.workingTreeChanges.length > 0
        ) {
          await repo.add([]); // Add all changes
        }
        await repo.commit(commitMessage, false);

        // If a custom date is set, amend the commit with the custom date
        const customDate = statusBar.getDate();
        if (customDate) {
          const { formatDateWithTimezone } = await import(
            "./utils/dateUtils.js"
          );
          const localDateStr = formatDateWithTimezone(customDate);
          const shell = vscode.env.shell;
          const amendCmd = buildEnvCommand(
            shell,
            {
              GIT_AUTHOR_DATE: localDateStr,
              GIT_COMMITTER_DATE: localDateStr,
            },
            `git commit --amend --no-edit --date=\"${localDateStr}\"`,
          );
          // Run the amend command in the background using Node.js
          const { exec } = await import("node:child_process");
          exec(
            amendCmd,
            { cwd: workspaceRoot, shell: shell },
            (error, _stdout, stderr) => {
              if (error) {
                showError(`Amend failed: ${stderr || error.message}`);
              } else {
                vscode.window.showInformationMessage(
                  `Committed and amended date to: ${localDateStr}`,
                );
              }
            },
          );
        } else {
          vscode.window.showInformationMessage(
            "Committed using VS Code Git extension",
          );
        }
      } catch (error: unknown) {
        showError(`Error during commit: ${(error as Error).message}`);
      }
    },
  );
}

/**
 * Helper to build a cross-shell command with environment variables.
 * @param shell - The shell path
 * @param envVars - Object of env var name to value
 * @param command - The command to run
 */
function buildEnvCommand(
  shell: string,
  envVars: Record<string, string>,
  command: string,
): string {
  const envAssignments = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
  }));
  if (shell.match(/pwsh|powershell/i)) {
    // PowerShell
    return `${envAssignments.map((e) => `$env:${e.key}="${e.value}"`).join("; ")}; ${command}`;
  } else if (shell.match(/cmd.exe/i)) {
    // cmd.exe
    return `${envAssignments.map((e) => `set \"${e.key}=${e.value}\"`).join(" && ")} && ${command}`;
  } else {
    // bash/sh
    return `${envAssignments.map((e) => `${e.key}="${e.value}"`).join(" ")} ${command}`;
  }
}

export function deactivate() {
  // Cleanup if needed
}
