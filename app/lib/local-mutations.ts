// Stable React adapters for the domain mutation services.
import {
  createNote,
  createNotebook,
  deleteNote,
  deleteNotebook,
  updateNote,
  updateNotebook,
} from "./mutations/notes";
import {
  archivePath,
  createPath,
  deletePathWithMigration,
  unarchivePath,
  updatePath,
} from "./mutations/paths";
import { createReminder, deleteReminder, updateReminder } from "./mutations/reminders";
import { createRoutine, deleteRoutine, updateRoutine } from "./mutations/routines";
import { updateDaySettings } from "./mutations/settings";
import {
  createStep,
  deleteStep,
  reorderSteps,
  toggleStepCompletion,
  toggleStepFailed,
  updateStep,
} from "./mutations/steps";
import { addTimeEntry, deleteTimeEntry, updateTimeEntry } from "./mutations/time-entries";
import { discardTimer, setTotalTime, startTimer, stopTimer, stopTimerAt } from "./mutations/timers";
export {
  MAX_DESCRIPTION_LENGTH,
  MAX_DUE_OFFSET_DAYS,
  MAX_TITLE_LENGTH,
  TIMER_STARTED_EVENT,
} from "./mutations/helpers";
export function useCreateStep() {
  return createStep;
}
export function useUpdateStep() {
  return updateStep;
}
export function useDeleteStep() {
  return deleteStep;
}
export function useToggleStepCompletion() {
  return toggleStepCompletion;
}
export function useToggleStepFailed() {
  return toggleStepFailed;
}
export function useReorderSteps() {
  return reorderSteps;
}
export function useStartTimer() {
  return startTimer;
}
export function useSetTotalTime() {
  return setTotalTime;
}
export function useStopTimer() {
  return stopTimer;
}
export function useStopTimerAt() {
  return stopTimerAt;
}
export function useDiscardTimer() {
  return discardTimer;
}
export function useAddTimeEntry() {
  return addTimeEntry;
}
export function useUpdateTimeEntry() {
  return updateTimeEntry;
}
export function useDeleteTimeEntry() {
  return deleteTimeEntry;
}
export function useCreatePath() {
  return createPath;
}
export function useUpdatePath() {
  return updatePath;
}
export function useArchivePath() {
  return archivePath;
}
export function useUnarchivePath() {
  return unarchivePath;
}
export function useDeletePathWithMigration() {
  return deletePathWithMigration;
}
export function useCreateRoutine() {
  return createRoutine;
}
export function useUpdateRoutine() {
  return updateRoutine;
}
export function useDeleteRoutine() {
  return deleteRoutine;
}
export function useCreateReminder() {
  return createReminder;
}
export function useUpdateReminder() {
  return updateReminder;
}
export function useDeleteReminder() {
  return deleteReminder;
}
export function useUpdateDaySettings() {
  return updateDaySettings;
}
export function useCreateNotebook() {
  return createNotebook;
}
export function useUpdateNotebook() {
  return updateNotebook;
}
export function useDeleteNotebook() {
  return deleteNotebook;
}
export function useCreateNote() {
  return createNote;
}
export function useUpdateNote() {
  return updateNote;
}
export function useDeleteNote() {
  return deleteNote;
}
