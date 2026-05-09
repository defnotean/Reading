import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import BrowseRoute from "./routes/BrowseRoute";
import LibraryRoute from "./routes/LibraryRoute";
import SettingsRoute from "./routes/SettingsRoute";
import TitleRoute from "./routes/TitleRoute";
import ReaderRoute from "./routes/ReaderRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<BrowseRoute />} />
          <Route path="library"  element={<LibraryRoute />} />
          <Route path="settings" element={<SettingsRoute />} />
          <Route path="t/:source/:id"          element={<TitleRoute />} />
          <Route path="r/:source/:id/:chapter" element={<ReaderRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
