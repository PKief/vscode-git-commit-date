import * as vscode from "vscode";
import { showDatePicker } from "./utils/pickerUtils";
import { formatDate } from "./utils/dateUtils";
import { isGitRepository, commitWithCustomDate } from "./utils/gitUtils";

export function activate(context: vscode.ExtensionContext) {
  console.log("Commit Date Selector extension is now active");

  let statusBarItem: vscode.StatusBarItem;
  let customCommitDate: Date | null = null;

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = "commitDateSelector.setDate";
  context.subscriptions.push(statusBarItem);

  // Update status bar
  function updateStatusBar() {
    const config = vscode.workspace.getConfiguration("commitDateSelector");
    const showStatusBar = config.get<boolean>("showStatusBar", true);

    if (!showStatusBar) {
      statusBarItem.hide();
      return;
    }

    if (customCommitDate) {
      const dateFormat = config.get<string>(
        "dateFormat",
        "YYYY-MM-DD HH:mm:ss"
      );
      const formattedDate = formatDate(customCommitDate, dateFormat);
      statusBarItem.text = `$(clock) ${formattedDate}`;
      statusBarItem.tooltip = "Custom commit date set. Click to change.";
      statusBarItem.show();
    } else {
      statusBarItem.text = "$(clock) Set Date";
      statusBarItem.tooltip = "Click to set custom commit date";
      statusBarItem.show();
    }
  }

  // Command: Set custom commit date with picker
  const setDateCommand = vscode.commands.registerCommand(
    "commitDateSelector.setDate",
    async () => {
      try {
        const selectedDate = await showDatePicker(customCommitDate);

        if (selectedDate === null) {
          // Check if this was a clear action
          if (customCommitDate) {
            customCommitDate = null;
            vscode.window.showInformationMessage("Custom commit date cleared");
            updateStatusBar();
          }
          return;
        }

        customCommitDate = selectedDate;
        vscode.window.showInformationMessage(
          `Commit date set to: ${formatDate(
            customCommitDate,
            "YYYY-MM-DD HH:mm:ss"
          )}`
        );
        updateStatusBar();
      } catch (error) {
        vscode.window.showErrorMessage(`Error setting date: ${error}`);
      }
    }
  );

  // Command: Clear custom commit date
  const clearDateCommand = vscode.commands.registerCommand(
    "commitDateSelector.clearDate",
    () => {
      customCommitDate = null;
      updateStatusBar();
      vscode.window.showInformationMessage("Custom commit date cleared");
    }
  );

  // Command: Commit with custom date
  const commitWithDateCommand = vscode.commands.registerCommand(
    "commitDateSelector.commitWithDate",
    async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage("No workspace folder open");
          return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;

        // Check if we're in a git repository
        if (!(await isGitRepository(workspaceRoot))) {
          vscode.window.showErrorMessage("Not a git repository");
          return;
        }

        // Get commit message
        const commitMessage = await vscode.window.showInputBox({
          prompt: "Enter commit message",
          placeHolder: "Commit message",
          validateInput: (value: string) => {
            return value.trim() ? null : "Commit message cannot be empty";
          },
        });

        if (!commitMessage) {
          return; // User cancelled
        }

        // Execute git command
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Committing changes...",
            cancellable: false,
          },
          async () => {
            try {
              const { stdout, stderr } = await commitWithCustomDate({
                cwd: workspaceRoot,
                commitMessage,
                customCommitDate,
              });

              if (stderr && !stderr.includes("warning")) {
                throw new Error(stderr);
              }

              const dateInfo = customCommitDate
                ? ` with date ${formatDate(
                    customCommitDate,
                    "YYYY-MM-DD HH:mm:ss"
                  )}`
                : "";

              vscode.window.showInformationMessage(
                `Successfully committed${dateInfo}`
              );

              // Clear custom date after successful commit (optional)
              const shouldClear = await vscode.window.showQuickPick(
                ["Keep custom date", "Clear custom date"],
                {
                  placeHolder:
                    "What would you like to do with the custom date?",
                }
              );

              if (shouldClear === "Clear custom date") {
                customCommitDate = null;
                updateStatusBar();
              }
            } catch (error: any) {
              vscode.window.showErrorMessage(`Commit failed: ${error.message}`);
            }
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(`Error during commit: ${error.message}`);
      }
    }
  );

  // Register commands
  context.subscriptions.push(setDateCommand);
  context.subscriptions.push(clearDateCommand);
  context.subscriptions.push(commitWithDateCommand);

  // Initial status bar update
  updateStatusBar();

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("commitDateSelector")) {
      updateStatusBar();
    }
  });
}

export function deactivate() {
  // Cleanup if needed
}
