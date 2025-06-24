import * as vscode from "vscode";

/**
 * Default date and time formats used throughout the extension.
 */
const DEFAULT_DATE_FORMAT = "YYYY-MM-DD";
const DEFAULT_TIME_FORMAT = "HH:mm:ss";

/**
 * Formats a Date object into a string using a simple pattern replacement.
 * @param date - The date to format
 * @param format - The format string (e.g. 'YYYY-MM-DD HH:mm:ss')
 * @returns The formatted date string
 */
export function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  // Replace tokens in the format string with actual values
  return format
    .replace("YYYY", year.toString())
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

/**
 * Generates a list of date options for the date picker QuickPick.
 * Includes today, yesterday, past week, custom, and clear options.
 * @param customCommitDate - The currently selected custom commit date, if any
 * @param formatDateFn - The date formatting function to use
 * @returns An array of QuickPickItem options
 */
export function generateDateOptions(
  customCommitDate: Date | null,
  formatDateFn: typeof formatDate,
): vscode.QuickPickItem[] {
  const now = new Date();
  const options: vscode.QuickPickItem[] = [];

  // Today
  options.push({
    label: "$(calendar) Today",
    description: formatDateFn(now, DEFAULT_DATE_FORMAT),
    detail: "Use current date with custom time",
  });

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  options.push({
    label: "$(history) Yesterday",
    description: formatDateFn(yesterday, DEFAULT_DATE_FORMAT),
    detail: "Use yesterday's date with custom time",
  });

  // Past week (2-7 days ago)
  for (let i = 2; i <= 7; i++) {
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - i);
    const dayName = pastDate.toLocaleDateString("en-US", { weekday: "long" });
    options.push({
      label: `$(clock) ${dayName}`,
      description: formatDateFn(pastDate, DEFAULT_DATE_FORMAT),
      detail: `${i} days ago`,
    });
  }

  // Separator
  options.push({
    label: "",
    kind: vscode.QuickPickItemKind.Separator,
  });

  // Custom date option
  options.push({
    label: "$(edit) Custom Date & Time",
    description: "Enter a specific date and time manually",
    detail: "Pre-filled with current timestamp for easy editing",
  });

  // Option to clear custom date if one is set
  if (customCommitDate) {
    options.push({
      label: "$(trash) Clear Custom Date",
      description: "Remove custom commit date",
      detail: "Use current timestamp for commits",
    });
  }

  return options;
}

/**
 * Generates a list of time options for the time picker QuickPick.
 * Includes current time, common times, and a custom time option.
 * @param formatDateFn - The date formatting function to use
 * @returns An array of QuickPickItem options
 */
export function generateTimeOptions(
  formatDateFn: typeof formatDate,
): vscode.QuickPickItem[] {
  const options: vscode.QuickPickItem[] = [];
  const now = new Date();

  // Current time
  options.push({
    label: "$(clock) Current Time",
    description: formatDateFn(now, DEFAULT_TIME_FORMAT),
    detail: "Use current time",
  });

  // Common times of day
  const commonTimes = [
    { hour: 9, minute: 0, label: "Morning (9:00 AM)" },
    { hour: 12, minute: 0, label: "Noon (12:00 PM)" },
    { hour: 14, minute: 0, label: "Afternoon (2:00 PM)" },
    { hour: 17, minute: 0, label: "Evening (5:00 PM)" },
    { hour: 20, minute: 0, label: "Night (8:00 PM)" },
    { hour: 23, minute: 59, label: "End of Day (11:59 PM)" },
  ];

  commonTimes.forEach((time) => {
    const timeStr = `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:00`;
    options.push({
      label: `$(watch) ${time.label}`,
      description: timeStr,
      detail: `Set time to ${timeStr}`,
    });
  });

  // Separator
  options.push({
    label: "",
    kind: vscode.QuickPickItemKind.Separator,
  });

  // Custom time option
  options.push({
    label: "$(edit) Custom Time",
    description: "Enter specific time",
    detail: "Pre-filled with current time for easy editing",
  });

  return options;
}
