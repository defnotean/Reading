import { invoke } from "@tauri-apps/api/core";
import type {
  BrowseList, ChapterContent, SourceCapabilities, TitleDetail, TitleSummary,
} from "../types";

export async function sourceCapabilities(): Promise<SourceCapabilities[]> {
  return invoke("source_capabilities");
}

export async function browse(
  source: string, list: BrowseList, page = 0,
): Promise<TitleSummary[]> {
  return invoke("browse", { source, list, page });
}

export async function search(
  source: string, q: string, page = 0,
): Promise<TitleSummary[]> {
  return invoke("search", { source, q, page });
}

export async function getTitle(source: string, id: string): Promise<TitleDetail> {
  return invoke("get_title", { source, id });
}

export async function getChapter(
  source: string, titleId: string, chapterId: string,
): Promise<ChapterContent> {
  return invoke("get_chapter", { source, titleId, chapterId });
}

export interface GenericRouteHint {
  source: "generic";
  source_id: string;
  kind: import("../types").ContentKind;
  title: string;
  chapter_id: string;
}

export const fromUrl = (url: string): Promise<GenericRouteHint> => invoke("from_url", { url });
