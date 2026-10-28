"use client";
import { useId, useState, type InputHTMLAttributes } from "react";
import { Check, Paperclip, ArrowUpRight } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  title: string;
  hint: string;
};

export default function FilePicker({ title, hint, id, onChange, disabled, ...input }: Props) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const [selected, setSelected] = useState<string[]>([]);
  const descriptionId = `${fieldId}-hint`;
  return <div className={`upload-picker${disabled ? " is-disabled" : ""}`}>
    <input {...input} id={fieldId} className="upload-picker-input" type="file" disabled={disabled}
      aria-label={title}
      aria-describedby={[descriptionId, input["aria-describedby"]].filter(Boolean).join(" ")}
      onChange={event => { onChange?.(event); setSelected(Array.from(event.target.files || [], file => file.name)); }} />
    <label className="upload-picker-face" htmlFor={fieldId}>
      <span className="upload-picker-icon" aria-hidden="true">{selected.length ? <Check size={24} /> : <Paperclip size={24} />}</span>
      <span className="upload-picker-copy"><span className="upload-picker-title">{title}</span>
        <span className="upload-picker-hint" id={descriptionId}>{hint}</span>
        <span className="upload-picker-selection" role="status">{selected.length ? (input.multiple ? `${selected.length} ${selected.length === 1 ? "file" : "files"} selected` : selected[0]) : ""}</span>
      </span>
      <span className="upload-picker-action" aria-hidden="true">{selected.length ? "Change" : "Browse"}<ArrowUpRight size={18} /></span>
    </label>
  </div>;
}
