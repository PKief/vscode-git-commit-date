import * as vscode from "vscode";
import { formatDate } from "./utils/dateUtils.js";
import { commitWithCustomDate, isGitRepository } from "./utils/gitUtils.js";
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
        const commitMessage = await vscode.window.showInputBox({
          prompt: "Enter commit message",
          placeHolder: "Commit message",
          validateInput: (value: string) =>
            value.trim() ? null : "Commit message cannot be empty",
        });
        if (!commitMessage) return;
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Committing changes...",
            cancellable: false,
          },
          async () => {
            try {
              const { stderr } = await commitWithCustomDate({
                cwd: workspaceRoot,
                commitMessage,
                customCommitDate: statusBar.getDate(),
              });
              if (stderr && !stderr.includes("warning"))
                throw new Error(stderr);
              const customDate = statusBar.getDate();
              const dateInfo = customDate
                ? ` with date ${formatDate(customDate, "YYYY-MM-DD HH:mm:ss")}`
                : "";
              vscode.window.showInformationMessage(
                `Successfully committed${dateInfo}`,
              );
              // Optionally clear custom date
              const shouldClear = await vscode.window.showQuickPick(
                ["Keep custom date", "Clear custom date"],
                {
                  placeHolder:
                    "What would you like to do with the custom date?",
                },
              );
              if (shouldClear === "Clear custom date") {
                statusBar.setDate(null);
              }
            } catch (error: unknown) {
              showError(`Commit failed: ${(error as Error).message}`);
            }
          },
        );
      } catch (error: unknown) {
        showError(`Error during commit: ${(error as Error).message}`);
      }
    },
  );
}

export function deactivate() {
  // Cleanup if needed
}
