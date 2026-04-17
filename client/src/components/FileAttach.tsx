import { ChangeEvent, useRef } from 'react';

export interface AttachedFile {
  name: string;
  size: number;
  content: string;
}

export const MAX_FILE_BYTES = 500 * 1024; // 500KB per file
export const MAX_FILES = 3;
export const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.tsv', '.log'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

function hasAcceptedExt(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((e) => lower.endsWith(e));
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Read failed'));
    reader.readAsText(file);
  });
}

export function formatAttachmentsForPrompt(attached: AttachedFile[]): string {
  if (attached.length === 0) return '';
  return attached
    .map(
      (f) =>
        `\n\n--- Attached file: ${f.name} (${Math.round(f.size / 1024)}KB) ---\n${f.content}\n--- end ${f.name} ---`
    )
    .join('');
}

export function FileAttach({
  attached,
  onChange,
  disabled,
  onError,
}: {
  attached: AttachedFile[];
  onChange: (next: AttachedFile[]) => void;
  disabled?: boolean;
  onError?: (msg: string) => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_FILES - attached.length;
    if (remaining <= 0) {
      onError?.(`Max ${MAX_FILES} files per message.`);
      return;
    }

    const take = files.slice(0, remaining);
    if (files.length > take.length) {
      onError?.(`Only the first ${take.length} file(s) were kept (max ${MAX_FILES}).`);
    }

    const next: AttachedFile[] = [...attached];
    for (const f of take) {
      if (!hasAcceptedExt(f.name)) {
        onError?.(`"${f.name}" — unsupported file type. Use: ${ACCEPTED_EXTENSIONS.join(', ')}`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        onError?.(`"${f.name}" is larger than 500KB — trim it or split into smaller files.`);
        continue;
      }
      try {
        const content = await readAsText(f);
        next.push({ name: f.name, size: f.size, content });
      } catch {
        onError?.(`Could not read "${f.name}".`);
      }
    }
    onChange(next);
  }

  function remove(name: string) {
    onChange(attached.filter((f) => f.name !== name));
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={onPick}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn-ghost !px-2 !py-2 !border !border-neutral-200"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || attached.length >= MAX_FILES}
        title={`Attach file (text types, ≤500KB, max ${MAX_FILES})`}
        aria-label="Attach file"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 11.5l-9.3 9.3a5.4 5.4 0 1 1-7.7-7.7l9.3-9.3a3.6 3.6 0 1 1 5.1 5.1l-9.3 9.3a1.8 1.8 0 1 1-2.5-2.5L15 7.5" />
        </svg>
      </button>
    </>
  );
}

export function AttachmentChips({
  attached,
  onRemove,
}: {
  attached: AttachedFile[];
  onRemove: (name: string) => void;
}): JSX.Element | null {
  if (attached.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2">
      {attached.map((f) => (
        <span
          key={f.name}
          className="inline-flex items-center gap-1.5 text-[11px] border border-neutral-200 bg-neutral-50 px-2 py-1"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span className="truncate max-w-[160px]">{f.name}</span>
          <span className="text-neutral-400">{Math.round(f.size / 1024)}KB</span>
          <button
            type="button"
            onClick={() => onRemove(f.name)}
            className="text-neutral-400 hover:text-red-600"
            aria-label={`Remove ${f.name}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
