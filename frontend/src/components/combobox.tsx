'use client';

import { useId, useMemo, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  id: string;
  name: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Combobox acessível (padrão ARIA 1.2): digite para filtrar, use as setas para
 * navegar e Enter para escolher. O valor escolhido vai num input escondido.
 */
export function Combobox({
  id,
  name,
  options,
  value,
  onChange,
  placeholder,
  emptyMessage = 'Nenhum resultado',
  ...aria
}: ComboboxProps) {
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term || selected?.label === query) return options;
    return options.filter((option) =>
      normalize(`${option.label} ${option.description ?? ''}`).includes(term),
    );
  }, [options, query, selected]);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listboxId}-${active}` : undefined}
        autoComplete="off"
        className="field-input"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
          if (value) onChange('');
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...aria}
      />
      <input type="hidden" name={name} value={value} />

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-line bg-surface py-1 shadow-[0_8px_24px_-12px_rgb(14_59_67/0.35)]"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-muted">{emptyMessage}</li>}
          {filtered.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={`cursor-pointer px-3 py-2 ${index === active ? 'bg-cedula-tint' : ''}`}
              // mousedown em vez de click: escolhe antes do blur fechar a lista.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(index)}
            >
              <span className="block text-[15px] font-medium text-ink">{option.label}</span>
              {option.description && (
                <span className="block text-[13px] text-muted">{option.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
