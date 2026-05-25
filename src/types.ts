export type ContentKind = "manga" | "novel";
export type BrowseList =
  | "trending"
  | "latest"
  | { genre: string }
  | { lang: string };

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
  external_url?: string | null;
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

export interface SourceCapabilities {
  source: string;
  content_kind: "manga" | "novel" | "manga_or_novel";
  browse: boolean;
  search: boolean;
  title_detail: boolean;
  chapter_content: boolean;
  external_chapters: boolean;
  public_store_safe: boolean;
}

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
  /** Joined from titles table — null if the title hasn't been opened/cached yet. */
  title?: string | null;
  /** Joined from titles table — null if no cover has been cached locally. */
  cover_path?: string | null;
}

export interface AppErr {
  kind: "http" | "parse" | "not_found" | "io" | "db" | "blocked" | "internal";
  message: string;
}
