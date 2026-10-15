// Stable React adapters for the domain mutation services.
import {
  archivePath,
  createPath,
  deletePathWithMigration,
  unarchivePath,
  updatePath,
} from "./mutations/paths";
import { undoable } from "./undo";
import { createReminder, deleteReminder, updateReminder } from "./mutations/reminders";
import { createRoutine, deleteRoutine, updateRoutine } from "./mutations/routines";
import { updateDaySettings } from "./mutations/settings";
import {
  createStep,
  deleteStep,
  mergeIntoStep,
  reorderSteps,
  toggleStepCompletion,
  toggleStepFailed,
  updateStep,
} from "./mutations/steps";
import { addTimeEntry, deleteTimeEntry, updateTimeEntry } from "./mutations/time-entries";
import { discardTimer, startTimer, stopTimer, stopTimerAt } from "./mutations/timers";
export {
  MAX_DESCRIPTION_LENGTH,
  MAX_DUE_OFFSET_DAYS,
  MAX_TITLE_LENGTH,
  TIMER_STARTED_EVENT,
} from "./mutations/helpers";
// Every user action is one undoable step (undo.ts).
const u = {
  createStep: undoable("Create step", createStep),
  updateStep: undoable("Edit step", updateStep),
  mergeIntoStep: undoable("Merge duplicate step", mergeIntoStep),
  deleteStep: undoable("Delete step", deleteStep),
  toggleStepCompletion: undoable("Complete step", toggleStepCompletion),
  toggleStepFailed: undoable("Mark step failed", toggleStepFailed),
  reorderSteps: undoable("Reorder steps", reorderSteps),
  startTimer: undoable("Start timer", startTimer),
  stopTimer: undoable("Stop timer", stopTimer),
  stopTimerAt: undoable("Stop timer", stopTimerAt),
  discardTimer: undoable("Discard timer", discardTimer),
  addTimeEntry: undoable("Add time block", addTimeEntry),
  updateTimeEntry: undoable("Edit time block", updateTimeEntry),
  deleteTimeEntry: undoable("Delete time block", deleteTimeEntry),
  createPath: undoable("Create path", createPath),
  updatePath: undoable("Edit path", updatePath),
  archivePath: undoable("Archive path", archivePath),
  unarchivePath: undoable("Unarchive path", unarchivePath),
  deletePathWithMigration: undoable("Delete path", deletePathWithMigration),
  createRoutine: undoable("Create routine", createRoutine),
  updateRoutine: undoable("Edit routine", updateRoutine),
  deleteRoutine: undoable("Delete routine", deleteRoutine),
  createReminder: undoable("Create reminder", createReminder),
  updateReminder: undoable("Edit reminder", updateReminder),
  deleteReminder: undoable("Delete reminder", deleteReminder),
  updateDaySettings: undoable("Change day settings", updateDaySettings),
};

export function useCreateStep() {
  return u.createStep;
}
export function useUpdateStep() {
  return u.updateStep;
}
export function useMergeIntoStep() {
  return u.mergeIntoStep;
}
export function useDeleteStep() {
  return u.deleteStep;
}
export function useToggleStepCompletion() {
  return u.toggleStepCompletion;
}
export function useToggleStepFailed() {
  return u.toggleStepFailed;
}
export function useReorderSteps() {
  return u.reorderSteps;
}
export function useStartTimer() {
  return u.startTimer;
}
export function useStopTimer() {
  return u.stopTimer;
}
export function useStopTimerAt() {
  return u.stopTimerAt;
}
export function useDiscardTimer() {
  return u.discardTimer;
}
export function useAddTimeEntry() {
  return u.addTimeEntry;
}
export function useUpdateTimeEntry() {
  return u.updateTimeEntry;
}
export function useDeleteTimeEntry() {
  return u.deleteTimeEntry;
}
export function useCreatePath() {
  return u.createPath;
}
export function useUpdatePath() {
  return u.updatePath;
}
export function useArchivePath() {
  return u.archivePath;
}
export function useUnarchivePath() {
  return u.unarchivePath;
}
export function useDeletePathWithMigration() {
  return u.deletePathWithMigration;
}
export function useCreateRoutine() {
  return u.createRoutine;
}
export function useUpdateRoutine() {
  return u.updateRoutine;
}
export function useDeleteRoutine() {
  return u.deleteRoutine;
}
export function useCreateReminder() {
  return u.createReminder;
}
export function useUpdateReminder() {
  return u.updateReminder;
}
export function useDeleteReminder() {
  return u.deleteReminder;
}
export function useUpdateDaySettings() {
  return u.updateDaySettings;
}
