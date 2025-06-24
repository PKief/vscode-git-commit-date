import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('Commit Date Selector extension is now active');

    let statusBarItem: vscode.StatusBarItem;
    let customCommitDate: Date | null = null;

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'commitDateSelector.setDate';
    context.subscriptions.push(statusBarItem);

    // Update status bar
    function updateStatusBar() {
        const config = vscode.workspace.getConfiguration('commitDateSelector');
        const showStatusBar = config.get<boolean>('showStatusBar', true);
        
        if (!showStatusBar) {
            statusBarItem.hide();
            return;
        }

        if (customCommitDate) {
            const dateFormat = config.get<string>('dateFormat', 'YYYY-MM-DD HH:mm:ss');
            const formattedDate = formatDate(customCommitDate, dateFormat);
            statusBarItem.text = `$(clock) ${formattedDate}`;
            statusBarItem.tooltip = 'Custom commit date set. Click to change.';
            statusBarItem.show();
        } else {
            statusBarItem.text = '$(clock) Set Date';
            statusBarItem.tooltip = 'Click to set custom commit date';
            statusBarItem.show();
        }
    }

    // Format date according to format string
    function formatDate(date: Date, format: string): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year.toString())
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // Generate date options for quick pick
    function generateDateOptions(): vscode.QuickPickItem[] {
        const now = new Date();
        const options: vscode.QuickPickItem[] = [];

        // Add preset options
        options.push({
            label: '$(calendar) Today',
            description: formatDate(now, 'YYYY-MM-DD'),
            detail: 'Use current date with custom time'
        });

        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        options.push({
            label: '$(history) Yesterday',
            description: formatDate(yesterday, 'YYYY-MM-DD'),
            detail: 'Use yesterday\'s date with custom time'
        });

        // Last week
        for (let i = 2; i <= 7; i++) {
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - i);
            const dayName = pastDate.toLocaleDateString('en-US', { weekday: 'long' });
            options.push({
                label: `$(clock) ${dayName}`,
                description: formatDate(pastDate, 'YYYY-MM-DD'),
                detail: `${i} days ago`
            });
        }

        // Add separator
        options.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });

        // Custom date option
        options.push({
            label: '$(edit) Custom Date',
            description: 'Enter a specific date manually',
            detail: 'Format: YYYY-MM-DD HH:MM:SS'
        });

        // Clear option
        if (customCommitDate) {
            options.push({
                label: '$(trash) Clear Custom Date',
                description: 'Remove custom commit date',
                detail: 'Use current timestamp for commits'
            });
        }

        return options;
    }

    // Generate time options for quick pick
    function generateTimeOptions(): vscode.QuickPickItem[] {
        const options: vscode.QuickPickItem[] = [];
        const now = new Date();

        // Current time
        options.push({
            label: '$(clock) Current Time',
            description: formatDate(now, 'HH:mm:ss'),
            detail: 'Use current time'
        });

        // Common times
        const commonTimes = [
            { hour: 9, minute: 0, label: 'Morning (9:00 AM)' },
            { hour: 12, minute: 0, label: 'Noon (12:00 PM)' },
            { hour: 14, minute: 0, label: 'Afternoon (2:00 PM)' },
            { hour: 17, minute: 0, label: 'Evening (5:00 PM)' },
            { hour: 20, minute: 0, label: 'Night (8:00 PM)' },
            { hour: 23, minute: 59, label: 'End of Day (11:59 PM)' }
        ];

        commonTimes.forEach(time => {
            const timeStr = `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`;
            options.push({
                label: `$(watch) ${time.label}`,
                description: timeStr,
                detail: `Set time to ${timeStr}`
            });
        });

        // Add separator
        options.push({
            label: '',
            kind: vscode.QuickPickItemKind.Separator
        });

        // Custom time option
        options.push({
            label: '$(edit) Custom Time',
            description: 'Enter specific time',
            detail: 'Format: HH:MM:SS'
        });

        return options;
    }

    // Show date picker interface
    async function showDatePicker(): Promise<Date | null> {
        const dateOptions = generateDateOptions();
        
        const selectedDateOption = await vscode.window.showQuickPick(dateOptions, {
            placeHolder: 'Select a date for your commit',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selectedDateOption) {
            return null; // User cancelled
        }

        // Handle clear option
        if (selectedDateOption.label.includes('Clear Custom Date')) {
            return null;
        }

        // Handle custom date input
        if (selectedDateOption.label.includes('Custom Date')) {
            const dateInput = await vscode.window.showInputBox({
                prompt: 'Enter commit date and time',
                placeHolder: 'YYYY-MM-DD HH:MM:SS (e.g., 2023-12-25 14:30:00)',
                value: customCommitDate ? formatDate(customCommitDate, 'YYYY-MM-DD HH:mm:ss') : '',
                validateInput: (value: string) => {
                    if (!value.trim()) {
                        return 'Date cannot be empty';
                    }
                    
                    const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                    if (!dateRegex.test(value)) {
                        return 'Please use format: YYYY-MM-DD HH:MM:SS';
                    }
                    
                    const date = new Date(value);
                    if (isNaN(date.getTime())) {
                        return 'Invalid date';
                    }
                    
                    return null;
                }
            });

            if (!dateInput) {
                return null;
            }

            return new Date(dateInput);
        }

        // Parse selected date
        let selectedDate: Date;
        if (selectedDateOption.description) {
            selectedDate = new Date(selectedDateOption.description);
        } else {
            selectedDate = new Date();
        }

        // Now show time picker
        const timeOptions = generateTimeOptions();
        
        const selectedTimeOption = await vscode.window.showQuickPick(timeOptions, {
            placeHolder: `Select time for ${formatDate(selectedDate, 'YYYY-MM-DD')}`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selectedTimeOption) {
            return null; // User cancelled
        }

        // Handle custom time input
        if (selectedTimeOption.label.includes('Custom Time')) {
            const timeInput = await vscode.window.showInputBox({
                prompt: 'Enter time',
                placeHolder: 'HH:MM:SS (e.g., 14:30:00)',
                validateInput: (value: string) => {
                    if (!value.trim()) {
                        return 'Time cannot be empty';
                    }
                    
                    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
                    if (!timeRegex.test(value)) {
                        return 'Please use format: HH:MM:SS';
                    }
                    
                    const [hours, minutes, seconds] = value.split(':').map(Number);
                    if (hours > 23 || minutes > 59 || seconds > 59) {
                        return 'Invalid time values';
                    }
                    
                    return null;
                }
            });

            if (!timeInput) {
                return null;
            }

            const [hours, minutes, seconds] = timeInput.split(':').map(Number);
            selectedDate.setHours(hours, minutes, seconds, 0);
        } else if (selectedTimeOption.description) {
            // Parse selected time
            const [hours, minutes, seconds] = selectedTimeOption.description.split(':').map(Number);
            selectedDate.setHours(hours, minutes, seconds, 0);
        }

        return selectedDate;
    }

    // Command: Set custom commit date with picker
    const setDateCommand = vscode.commands.registerCommand('commitDateSelector.setDate', async () => {
        try {
            const selectedDate = await showDatePicker();
            
            if (selectedDate === null) {
                // Check if this was a clear action
                const dateOptions = generateDateOptions();
                const hasClearOption = dateOptions.some(opt => opt.label.includes('Clear Custom Date'));
                
                if (hasClearOption && customCommitDate) {
                    customCommitDate = null;
                    vscode.window.showInformationMessage('Custom commit date cleared');
                    updateStatusBar();
                }
                return;
            }

            customCommitDate = selectedDate;
            vscode.window.showInformationMessage(`Commit date set to: ${formatDate(customCommitDate, 'YYYY-MM-DD HH:mm:ss')}`);
            updateStatusBar();
        } catch (error) {
            vscode.window.showErrorMessage(`Error setting date: ${error}`);
        }
    });

    // Command: Clear custom commit date
    const clearDateCommand = vscode.commands.registerCommand('commitDateSelector.clearDate', () => {
        customCommitDate = null;
        updateStatusBar();
        vscode.window.showInformationMessage('Custom commit date cleared');
    });

    // Command: Commit with custom date
    const commitWithDateCommand = vscode.commands.registerCommand('commitDateSelector.commitWithDate', async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;

            // Check if we're in a git repository
            try {
                await execAsync('git rev-parse --git-dir', { cwd: workspaceRoot });
            } catch {
                vscode.window.showErrorMessage('Not a git repository');
                return;
            }

            // Get commit message
            const commitMessage = await vscode.window.showInputBox({
                prompt: 'Enter commit message',
                placeHolder: 'Commit message',
                validateInput: (value: string) => {
                    return value.trim() ? null : 'Commit message cannot be empty';
                }
            });

            if (!commitMessage) {
                return; // User cancelled
            }

            // Prepare git command
            let gitCommand = 'git add . && git commit';
            
            if (customCommitDate) {
                const isoDate = customCommitDate.toISOString();
                gitCommand += ` --date="${isoDate}"`;
                
                // Also set author date
                gitCommand = `GIT_AUTHOR_DATE="${isoDate}" ${gitCommand}`;
            }
            
            gitCommand += ` -m "${commitMessage.replace(/"/g, '\\"')}"`;

            // Execute git command
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Committing changes...',
                cancellable: false
            }, async (progress) => {
                try {
                    const { stdout, stderr } = await execAsync(gitCommand, { cwd: workspaceRoot });
                    
                    if (stderr && !stderr.includes('warning')) {
                        throw new Error(stderr);
                    }

                    const dateInfo = customCommitDate 
                        ? ` with date ${formatDate(customCommitDate, 'YYYY-MM-DD HH:mm:ss')}`
                        : '';
                    
                    vscode.window.showInformationMessage(`Successfully committed${dateInfo}`);
                    
                    // Clear custom date after successful commit (optional)
                    const shouldClear = await vscode.window.showQuickPick(
                        ['Keep custom date', 'Clear custom date'], 
                        { placeHolder: 'What would you like to do with the custom date?' }
                    );
                    
                    if (shouldClear === 'Clear custom date') {
                        customCommitDate = null;
                        updateStatusBar();
                    }
                    
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Commit failed: ${error.message}`);
                }
            });

        } catch (error: any) {
            vscode.window.showErrorMessage(`Error during commit: ${error.message}`);
        }
    });

    // Register commands
    context.subscriptions.push(setDateCommand);
    context.subscriptions.push(clearDateCommand);
    context.subscriptions.push(commitWithDateCommand);

    // Initial status bar update
    updateStatusBar();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('commitDateSelector')) {
            updateStatusBar();
        }
    });
}

export function deactivate() {
    // Cleanup if needed
}