import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { fromUrl } from "../ipc/sources";
import { toastError } from "../stores/useToast";

export function PasteUrlBar() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function go() {
    const v = url.trim();
    if (!v) return;
    setBusy(true);
    try {
      const hint = await fromUrl(v);
      // generic route uses the same encoded URL as both source_id and chapter_id
      navigate(`/r/${hint.source}/${hint.source_id}/${hint.chapter_id}`);
      setUrl("");
    } catch (e: any) {
      toastError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="relative w-full sm:w-72"
      onSubmit={(e) => { e.preventDefault(); void go(); }}
    >
      <Link2
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300"
        aria-hidden="true"
      />
      <input
        aria-label="Manga or novel URL"
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste a manga or novel URL..."
        disabled={busy}
        className="bg-ink-800/70 rounded-md pl-8 pr-10 py-2 text-sm w-full outline-none border border-ink-700/60 focus:border-accent focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
      />
      <button
        type="submit"
        aria-label="Open pasted URL"
        disabled={busy || !url.trim()}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-ink-300 hover:text-ink-100 hover:bg-ink-700/80 focus-ring disabled:opacity-35 disabled:pointer-events-none"
      >
        {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
      </button>
    </form>
  );
}
