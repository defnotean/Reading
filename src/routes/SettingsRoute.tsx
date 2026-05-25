import { Check, RotateCcw, Trash2 } from "lucide-react";
import {
  useReaderSettings,
  type FitMode,
  type FontFamily,
  type FontSize,
  type LineSpacing,
  type ReadingDirection,
  type ReadingMode,
  type Theme,
} from "../stores/useReaderSettings";
import { useCache } from "../stores/useCache";
import { toastInfo } from "../stores/useToast";

export default function SettingsRoute() {
  const settings = useReaderSettings();
  const clearCache = useCache(s => s.clear);

  function clear(bucket: "browse" | "title") {
    clearCache(bucket);
    toastInfo(`${bucket === "browse" ? "Browse" : "Title"} cache cleared.`);
  }

  function resetReaderDefaults() {
    settings.reset();
    toastInfo("Reader defaults reset.");
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <SettingsPanel title="Manga defaults">
            <SettingRow label="Mode">
              <SegmentedControl<ReadingMode>
                label="Manga mode"
                value={settings.mangaMode}
                options={[
                  { value: "paginated", label: "Pages" },
                  { value: "continuous", label: "Scroll" },
                ]}
                onChange={v => settings.set("mangaMode", v)}
              />
            </SettingRow>
            <SettingRow label="Direction">
              <SegmentedControl<ReadingDirection>
                label="Manga direction"
                value={settings.mangaDirection}
                options={[
                  { value: "ltr", label: "Left to right" },
                  { value: "rtl", label: "Right to left" },
                ]}
                onChange={v => settings.set("mangaDirection", v)}
              />
            </SettingRow>
            <SettingRow label="Fit">
              <SegmentedControl<FitMode>
                label="Manga fit"
                value={settings.mangaFit}
                options={[
                  { value: "width", label: "Width" },
                  { value: "height", label: "Height" },
                  { value: "actual", label: "Actual" },
                ]}
                onChange={v => settings.set("mangaFit", v)}
              />
            </SettingRow>
          </SettingsPanel>

          <SettingsPanel title="Novel defaults">
            <SettingRow label="Mode">
              <SegmentedControl<ReadingMode>
                label="Novel mode"
                value={settings.novelMode}
                options={[
                  { value: "paginated", label: "Pages" },
                  { value: "continuous", label: "Scroll" },
                ]}
                onChange={v => settings.set("novelMode", v)}
              />
            </SettingRow>
            <SettingRow label="Theme">
              <SegmentedControl<Theme>
                label="Novel theme"
                value={settings.novelTheme}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "sepia", label: "Sepia" },
                  { value: "light", label: "Light" },
                ]}
                onChange={v => settings.set("novelTheme", v)}
              />
            </SettingRow>
            <SettingRow label="Font">
              <SegmentedControl<FontFamily>
                label="Novel font"
                value={settings.novelFont}
                options={[
                  { value: "serif", label: "Serif" },
                  { value: "sans", label: "Sans" },
                ]}
                onChange={v => settings.set("novelFont", v)}
              />
            </SettingRow>
            <SettingRow label="Size">
              <SegmentedControl<FontSize>
                label="Novel size"
                value={settings.novelSize}
                options={[
                  { value: "xs", label: "XS" },
                  { value: "sm", label: "SM" },
                  { value: "base", label: "Base" },
                  { value: "lg", label: "LG" },
                  { value: "xl", label: "XL" },
                ]}
                onChange={v => settings.set("novelSize", v)}
              />
            </SettingRow>
            <SettingRow label="Spacing">
              <SegmentedControl<LineSpacing>
                label="Novel spacing"
                value={settings.novelSpacing}
                options={[
                  { value: "tight", label: "Tight" },
                  { value: "normal", label: "Normal" },
                  { value: "loose", label: "Loose" },
                ]}
                onChange={v => settings.set("novelSpacing", v)}
              />
            </SettingRow>
          </SettingsPanel>
        </section>

        <SettingsPanel title="Local data">
          <div className="flex flex-wrap gap-2">
            <ActionButton label="Clear browse cache" onClick={() => clear("browse")} icon="trash" />
            <ActionButton label="Clear title cache" onClick={() => clear("title")} icon="trash" />
            <ActionButton label="Reset reader defaults" onClick={resetReaderDefaults} icon="reset" />
          </div>
        </SettingsPanel>
      </div>
    </div>
  );
}

function SettingsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink-700/60 bg-ink-900/55 p-4 shadow-lg shadow-black/20">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-300">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-center">
      <span className="text-sm text-ink-300">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-md bg-ink-950/60 p-1">
      {options.map(option => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded px-2.5 py-1.5 text-xs font-medium transition-colors focus-ring ${
              selected
                ? "bg-accent text-white"
                : "text-ink-300 hover:bg-ink-700/70 hover:text-ink-100"
            }`}
          >
            {selected && <Check size={12} className="mr-1 inline-block" aria-hidden="true" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: "trash" | "reset";
}) {
  const Icon = icon === "trash" ? Trash2 : RotateCcw;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md border border-ink-700/70 bg-ink-800/70 px-3 py-2 text-sm text-ink-200 transition-colors hover:border-ink-500 hover:bg-ink-700/80 focus-ring"
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  );
}
