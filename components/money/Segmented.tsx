"use client";

// Bascule à deux ou trois choix, dessinée comme les maquettes.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: "pk" | "tl";
  label: string;
}) {
  return (
    <div className={`seg${tone ? ` ${tone}` : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
