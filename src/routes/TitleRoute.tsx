import { useParams } from "react-router-dom";
export default function TitleRoute() {
  const { source, id } = useParams();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Title</h1>
      <p className="text-ink-300">{source}/{id}</p>
    </div>
  );
}
