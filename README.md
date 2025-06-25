<br>

<div align="center">
  <img src="https://raw.githubusercontent.com/PKief/vscode-git-commit-date/refs/heads/main/logo.png" alt="logo" width="200">

  # VS Code Git Date <br><br>

  ####  A VS Code extension to set custom commit timestamps
</div>

A VS Code extension that allows you to select a custom timestamp for your git commits.

## Features

- **Set Custom Commit Date**: Choose any date and time for your commits
- **Visual Status Bar**: See your selected date in the status bar
- **Easy Commit**: Commit with your custom date in one command
- **Date Validation**: Ensures you enter valid dates
- **Flexible Format**: Supports standard YYYY-MM-DD HH:MM:SS format

## Usage

### Setting a Custom Date

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Git: Set Commit Date"
3. Enter your desired date in format: `YYYY-MM-DD HH:MM:SS`
4. The date will appear in your status bar

### Committing with Custom Date

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Git: Commit with Custom Date"
3. Enter your commit message
4. Your changes will be committed with the selected timestamp

### Clearing Custom Date

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run "Git: Clear Custom Commit Date"

## Commands

- `Git: Set Commit Date` - Set a custom commit timestamp
- `Git: Commit with Custom Date` - Commit with the selected timestamp
- `Git: Clear Custom Commit Date` - Remove the custom timestamp

## Configuration

- `commitDateSelector.showStatusBar` - Show/hide the status bar indicator (default: true)
- `commitDateSelector.dateFormat` - Display format for dates (default: "YYYY-MM-DD HH:mm:ss")

## Installation

1. Package the extension: `vsce package`
2. Install the generated `.vsix` file in VS Code
3. Reload VS Code
4. Start using the commands from the Command Palette

## Requirements

- VS Code 1.80.0 or higher
- Git repository in your workspace

## How It Works

The extension uses Git's `--date` parameter to set both the commit date and author date to your specified timestamp. This means:

- The commit will appear in your git history with your chosen date
- Both `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` are set to your selected time
- The date persists until you clear it or set a new one

## Examples

Setting a commit date for a past event:
```
2023-12-25 09:00:00  // Christmas morning commit
2024-01-01 00:00:01  // New Year's resolution commit
2023-06-15 14:30:45  // Specific moment in time
```

## License

MIT
