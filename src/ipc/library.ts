import { invoke } from "@tauri-apps/api/core";
import type { ProgressRecord, TitleRecord } from "../types";

export const libraryList = (): Promise<TitleRecord[]> => invoke("library_list");
export const isStarred  = (source: string, id: string): Promise<boolean> =>
  invoke("library_is_starred", { source, id });
export const setStarred = (source: string, id: string, starred: boolean): Promise<void> =>
  invoke("library_set_starred", { source, id, starred });
export const continueReading = (limit = 10): Promise<ProgressRecord[]> =>
  invoke("continue_reading", { limit });
export const recordProgress = (
  source: string, id: string, chapterId: string, positionPct: number,
): Promise<void> =>
  invoke("record_progress", { source, id, chapterId, positionPct });
