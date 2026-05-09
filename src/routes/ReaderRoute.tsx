import { useParams } from "react-router-dom";
export default function ReaderRoute() {
  const { source, id, chapter } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Reader</h1>
      <p className="text-ink-300">{source}/{id} — {chapter}</p>
    </div>
  );
}
