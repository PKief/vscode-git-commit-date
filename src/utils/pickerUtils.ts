import * as vscode from "vscode";
import {
  formatDate,
  generateDateOptions,
  generateTimeOptions,
} from "./dateUtils";

export async function showDatePicker(
  customCommitDate: Date | null,
): Promise<Date | null> {
  const dateOptions = generateDateOptions(customCommitDate, formatDate);
  const selectedDateOption = await vscode.window.showQuickPick(dateOptions, {
    placeHolder: "Select a date for your commit",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selectedDateOption) return null;
  if (selectedDateOption.label.includes("Clear Custom Date")) return null;
  if (selectedDateOption.label.includes("Custom Date")) {
    const defaultValue = customCommitDate
      ? formatDate(customCommitDate, "YYYY-MM-DD HH:mm:ss")
      : formatDate(new Date(), "YYYY-MM-DD HH:mm:ss");
    const dateInput = await vscode.window.showInputBox({
      prompt: "Enter commit date and time (modify as needed)",
      placeHolder: "YYYY-MM-DD HH:MM:SS",
      value: defaultValue,
      valueSelection: [0, defaultValue.length],
      validateInput: (value: string) => {
        if (!value.trim()) return "Date cannot be empty";
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(value))
          return "Please use format: YYYY-MM-DD HH:MM:SS";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Invalid date";
        return null;
      },
    });
    if (!dateInput) return null;
    return new Date(dateInput);
  }
  let selectedDate: Date;
  if (selectedDateOption.description) {
    selectedDate = new Date(selectedDateOption.description);
  } else {
    selectedDate = new Date();
  }
  const timeOptions = generateTimeOptions(formatDate);
  const selectedTimeOption = await vscode.window.showQuickPick(timeOptions, {
    placeHolder: `Select time for ${formatDate(selectedDate, "YYYY-MM-DD")}`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selectedTimeOption) return null;
  if (selectedTimeOption.label.includes("Custom Time")) {
    const currentTime = new Date();
    const defaultTimeValue =
      customCommitDate &&
      formatDate(selectedDate, "YYYY-MM-DD") ===
        formatDate(customCommitDate, "YYYY-MM-DD")
        ? formatDate(customCommitDate, "HH:mm:ss")
        : formatDate(currentTime, "HH:mm:ss");
    const timeInput = await vscode.window.showInputBox({
      prompt: "Enter time (modify as needed)",
      placeHolder: "HH:MM:SS",
      value: defaultTimeValue,
      valueSelection: [0, defaultTimeValue.length],
      validateInput: (value: string) => {
        if (!value.trim()) return "Time cannot be empty";
        const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
        if (!timeRegex.test(value)) return "Please use format: HH:MM:SS";
        const [hours, minutes, seconds] = value.split(":").map(Number);
        if (hours > 23 || minutes > 59 || seconds > 59)
          return "Invalid time values";
        return null;
      },
    });
    if (!timeInput) return null;
    const [hours, minutes, seconds] = timeInput.split(":").map(Number);
    selectedDate.setHours(hours, minutes, seconds, 0);
  } else if (selectedTimeOption.description) {
    const [hours, minutes, seconds] = selectedTimeOption.description
      .split(":")
      .map(Number);
    selectedDate.setHours(hours, minutes, seconds, 0);
  }
  return selectedDate;
}
