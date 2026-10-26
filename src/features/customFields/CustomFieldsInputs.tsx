import type { ReactNode } from 'react';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import type { CustomFieldDef } from './api';

type CustomFieldsInputsProps = {
  definitions: CustomFieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  canEdit: boolean;
  idPrefix?: string;
};

const EMPTY_OPTION = '__none__';

export function customFieldValueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function listOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  return customFieldValueToString(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isChecked(value: unknown): boolean {
  return value === true || value === 'true';
}

export function CustomFieldsInputs({
  definitions,
  values,
  onChange,
  canEdit,
  idPrefix = 'custom-field',
}: CustomFieldsInputsProps) {
  if (!definitions.length) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions.map((definition) => {
        const controlId = `${idPrefix}-${definition.key}`;
        const text = customFieldValueToString(values[definition.key]);
        const wide =
          definition.type === 'longtext' || definition.type === 'multiselect';
        const disabled = !canEdit;

        let control: ReactNode;
        switch (definition.type) {
          case 'longtext':
            control = (
              <Textarea
                id={controlId}
                rows={3}
                value={text}
                disabled={disabled}
                onChange={(event) => onChange(definition.key, event.target.value)}
              />
            );
            break;
          case 'number':
            control = (
              <Input
                id={controlId}
                type="number"
                step="any"
                value={text}
                disabled={disabled}
                onChange={(event) => onChange(definition.key, event.target.value)}
              />
            );
            break;
          case 'date':
            control = (
              <Input
                id={controlId}
                type="date"
                value={text.slice(0, 10)}
                disabled={disabled}
                onChange={(event) => onChange(definition.key, event.target.value)}
              />
            );
            break;
          case 'url':
            control = (
              <Input
                id={controlId}
                type="url"
                value={text}
                disabled={disabled}
                onChange={(event) => onChange(definition.key, event.target.value)}
              />
            );
            break;
          case 'checkbox':
            return (
              <div key={definition.id} className="flex items-center gap-2 pt-6">
                <Checkbox
                  id={controlId}
                  checked={isChecked(values[definition.key])}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(definition.key, event.target.checked)
                  }
                />
                <Label htmlFor={controlId}>
                  {definition.label}
                  {definition.required ? ' *' : ''}
                </Label>
              </div>
            );
          case 'select':
            control = (
              <Select
                value={text || EMPTY_OPTION}
                disabled={disabled}
                onValueChange={(value) =>
                  onChange(definition.key, value === EMPTY_OPTION ? '' : value)
                }
              >
                <SelectTrigger id={controlId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_OPTION}>Не выбрано</SelectItem>
                  {definition.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
            break;
          case 'multiselect': {
            const selected = new Set(listOf(values[definition.key]));
            control = (
              <div className="flex flex-wrap gap-3">
                {definition.options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm text-ink-700"
                  >
                    <Checkbox
                      checked={selected.has(option)}
                      disabled={disabled}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) {
                          next.add(option);
                        } else {
                          next.delete(option);
                        }
                        onChange(definition.key, Array.from(next));
                      }}
                    />
                    {option}
                  </label>
                ))}
              </div>
            );
            break;
          }
          default:
            control = (
              <Input
                id={controlId}
                value={text}
                disabled={disabled}
                onChange={(event) => onChange(definition.key, event.target.value)}
              />
            );
        }

        return (
          <div
            key={definition.id}
            className={wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}
          >
            <Label htmlFor={controlId}>
              {definition.label}
              {definition.required ? ' *' : ''}
            </Label>
            {control}
          </div>
        );
      })}
    </div>
  );
}
