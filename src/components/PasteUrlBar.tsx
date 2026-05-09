import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";
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
    <div className="relative w-72">
      <Link2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") void go(); }}
        placeholder="Paste a manga or novel URL…"
        disabled={busy}
        className="bg-ink-800/60 rounded-md pl-8 pr-3 py-1.5 text-sm w-full outline-none border border-ink-700/40 focus:border-accent disabled:opacity-50"
      />
    </div>
  );
}
