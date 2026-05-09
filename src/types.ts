export type ContentKind = "manga" | "novel";
export type BrowseList = "trending" | "latest";

export interface TitleSummary {
  source: string;
  source_id: string;
  title: string;
  author?: string | null;
  cover_url?: string | null;
  cover_path?: string | null;
  kind: ContentKind;
}

export interface ChapterSummary {
  chapter_id: string;
  number?: number | null;
  title?: string | null;
  published_at?: number | null;
  language?: string | null;
}

export interface TitleDetail {
  summary: TitleSummary;
  synopsis?: string | null;
  status?: string | null;
  original_language?: string | null;
  genres: string[];
  chapters: ChapterSummary[];
}

export interface PageImage {
  url: string;
  width?: number | null;
  height?: number | null;
}

export type ChapterContent =
  | { kind: "manga_pages"; pages: PageImage[] }
  | { kind: "novel_text"; plain: string; paragraphs: string[] };

export interface TitleRecord {
  source: string;
  source_id: string;
  kind: ContentKind;
  title: string;
  author?: string | null;
  cover_path?: string | null;
  synopsis?: string | null;
  status?: string | null;
  original_lang?: string | null;
  genres: string[];
}

export interface ProgressRecord {
  source: string;
  source_id: string;
  chapter_id: string;
  position_pct: number;
  updated_at: number;
}

export interface AppErr {
  kind: "http" | "parse" | "not_found" | "io" | "db" | "blocked" | "internal";
  message: string;
}
