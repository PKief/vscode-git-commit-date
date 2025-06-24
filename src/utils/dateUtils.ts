import * as vscode from "vscode";

export function formatDate(date: Date, format: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", year.toString())
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}

export function generateDateOptions(
  customCommitDate: Date | null,
  formatDateFn: typeof formatDate,
): vscode.QuickPickItem[] {
  const now = new Date();
  const options: vscode.QuickPickItem[] = [];

  options.push({
    label: "$(calendar) Today",
    description: formatDateFn(now, "YYYY-MM-DD"),
    detail: "Use current date with custom time",
  });

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  options.push({
    label: "$(history) Yesterday",
    description: formatDateFn(yesterday, "YYYY-MM-DD"),
    detail: "Use yesterday's date with custom time",
  });

  for (let i = 2; i <= 7; i++) {
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - i);
    const dayName = pastDate.toLocaleDateString("en-US", { weekday: "long" });
    options.push({
      label: `$(clock) ${dayName}`,
      description: formatDateFn(pastDate, "YYYY-MM-DD"),
      detail: `${i} days ago`,
    });
  }

  options.push({
    label: "",
    kind: vscode.QuickPickItemKind.Separator,
  });

  options.push({
    label: "$(edit) Custom Date & Time",
    description: "Enter a specific date and time manually",
    detail: "Pre-filled with current timestamp for easy editing",
  });

  if (customCommitDate) {
    options.push({
      label: "$(trash) Clear Custom Date",
      description: "Remove custom commit date",
      detail: "Use current timestamp for commits",
    });
  }

  return options;
}

export function generateTimeOptions(
  formatDateFn: typeof formatDate,
): vscode.QuickPickItem[] {
  const options: vscode.QuickPickItem[] = [];
  const now = new Date();

  options.push({
    label: "$(clock) Current Time",
    description: formatDateFn(now, "HH:mm:ss"),
    detail: "Use current time",
  });

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

  options.push({
    label: "",
    kind: vscode.QuickPickItemKind.Separator,
  });

  options.push({
    label: "$(edit) Custom Time",
    description: "Enter specific time",
    detail: "Pre-filled with current time for easy editing",
  });

  return options;
}
