import * as vscode from "vscode";
import {
  formatDate,
  generateDateOptions,
  generateTimeOptions,
} from "./dateUtils.js";

/**
 * Utility to parse a date string (YYYY-MM-DD) as local time at midnight.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Utility to parse a date-time string (YYYY-MM-DD HH:mm:ss) as local time.
 */
function parseLocalDateTime(dateTimeStr: string): Date {
  const [datePart, timePart] = dateTimeStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds, 0);
}

/**
 * Shows a date and time picker for selecting a custom commit date.
 * @param customCommitDate - The currently selected custom commit date, if any
 * @returns The selected Date object, or null if cancelled/cleared
 */
export async function showDatePicker(
  customCommitDate: Date | null,
): Promise<Date | null> {
  // Step 1: Show date options
  const dateOptions = generateDateOptions(customCommitDate, formatDate);
  const selectedDateOption = await vscode.window.showQuickPick(dateOptions, {
    placeHolder: "Select a date for your commit",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selectedDateOption) return null;
  if (selectedDateOption.label.includes("Clear Custom Date")) return null;

  // Step 2: Handle custom date input
  if (selectedDateOption.label.includes("Custom Date")) {
    return await promptForCustomDateTime(customCommitDate);
  }
  // Step 3: Parse selected date (always as local time)
  const selectedDate = selectedDateOption.description
    ? parseLocalDate(selectedDateOption.description)
    : new Date();

  // Step 4: Show time options
  return await pickTimeForDate(selectedDate, customCommitDate);
}

/**
 * Prompts the user to enter a custom date and time string.
 * @param customCommitDate - The currently selected custom commit date, if any
 * @returns The Date object, or null if cancelled/invalid
 */
async function promptForCustomDateTime(
  customCommitDate: Date | null,
): Promise<Date | null> {
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
      const date = parseLocalDateTime(value);
      if (Number.isNaN(date.getTime())) return "Invalid date";
      return null;
    },
  });
  if (!dateInput) return null;
  return parseLocalDateTime(dateInput);
}

/**
 * Shows a time picker for the given date and applies the selected time.
 * @param selectedDate - The date to set the time for
 * @param customCommitDate - The currently selected custom commit date, if any
 * @returns The Date object with the selected time, or null if cancelled
 */
async function pickTimeForDate(
  selectedDate: Date,
  customCommitDate: Date | null,
): Promise<Date | null> {
  const timeOptions = generateTimeOptions(formatDate);
  const selectedTimeOption = await vscode.window.showQuickPick(timeOptions, {
    placeHolder: `Select time for ${formatDate(selectedDate, "YYYY-MM-DD")}`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!selectedTimeOption) return null;

  // Handle custom time input
  if (selectedTimeOption.label.includes("Custom Time")) {
    const defaultTimeValue =
      customCommitDate &&
      formatDate(selectedDate, "YYYY-MM-DD") ===
        formatDate(customCommitDate, "YYYY-MM-DD")
        ? formatDate(customCommitDate, "HH:mm:ss")
        : formatDate(new Date(), "HH:mm:ss");

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
    // Set time as local
    selectedDate.setHours(hours, minutes, seconds, 0);
    return selectedDate;
  }
  // Handle predefined time option
  if (selectedTimeOption.description) {
    const [hours, minutes, seconds] = selectedTimeOption.description
      .split(":")
      .map(Number);
    selectedDate.setHours(hours, minutes, seconds, 0);
  }
  return selectedDate;
}
