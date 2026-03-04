import { FormEvent, useMemo, useState } from "react";
import {
  DashboardUser,
  EventFormConfig,
  EventFormField,
  FormResponseItem,
  UpdateUserPayload,
} from "../lib/api";

type EditorField = {
  stepKey: string;
  stepLabel: string;
  stepOrder: number;
  fieldName: string;
  fieldType: string;
  fieldLabel: string;
  fieldOrder: number;
  required: boolean;
  placeholder?: string;
  helperText?: string;
  options?: EventFormField["options"];
  rows?: number;
};

type FieldValue = string | boolean;

type GuestEditorModalProps = {
  open: boolean;
  user: DashboardUser | null;
  formConfig: EventFormConfig | null;
  loadingFormConfig: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (userId: string, payload: UpdateUserPayload) => Promise<void>;
};

function toEditableValue(rawValue: unknown, fieldType: string): FieldValue {
  if (fieldType === "checkbox" || fieldType === "switch") {
    return Boolean(rawValue);
  }

  if (typeof rawValue === "string") {
    return rawValue;
  }

  if (typeof rawValue === "number") {
    return String(rawValue);
  }

  if (typeof rawValue === "boolean") {
    return rawValue ? "true" : "false";
  }

  if (rawValue === null || rawValue === undefined) {
    return "";
  }

  if (Array.isArray(rawValue)) {
    return rawValue.join(", ");
  }

  if (typeof rawValue === "object") {
    try {
      return JSON.stringify(rawValue);
    } catch {
      return "";
    }
  }

  return String(rawValue);
}

function toStoredValue(fieldType: string, value: FieldValue): unknown {
  if (fieldType === "checkbox" || fieldType === "switch") {
    return Boolean(value);
  }

  if (fieldType === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return typeof value === "string" ? value : value ? "true" : "false";
}

function buildFields(
  formConfig: EventFormConfig | null,
  responses: FormResponseItem[],
): EditorField[] {
  const fields: EditorField[] = [];

  if (formConfig && Object.keys(formConfig).length > 0) {
    const sortedSteps = Object.entries(formConfig).sort(
      ([, stepA], [, stepB]) => {
        const orderA = stepA.order ?? 0;
        const orderB = stepB.order ?? 0;
        return orderA - orderB;
      },
    );

    for (const [stepKey, step] of sortedSteps) {
      const sortedFields = [...step.fields].sort((fieldA, fieldB) => {
        const orderA = fieldA.order ?? 0;
        const orderB = fieldB.order ?? 0;
        return orderA - orderB;
      });

      for (const field of sortedFields) {
        fields.push({
          stepKey,
          stepLabel: step.label || stepKey,
          stepOrder: step.order ?? 0,
          fieldName: field.name,
          fieldType: field.type,
          fieldLabel: field.label || field.name,
          fieldOrder: field.order ?? 0,
          required: Boolean(field.required),
          placeholder: field.placeholder,
          helperText: field.helperText,
          options: field.options,
          rows: field.rows,
        });
      }
    }
  }

  const definedFieldNames = new Set(fields.map((field) => field.fieldName));

  for (const response of responses) {
    if (definedFieldNames.has(response.fieldName)) {
      continue;
    }

    fields.push({
      stepKey: "legacy",
      stepLabel: "Legacy Fields",
      stepOrder: 9999,
      fieldName: response.fieldName,
      fieldType: response.fieldType || "text",
      fieldLabel: response.fieldLabel || response.fieldName,
      fieldOrder: response.order ?? 9999,
      required: false,
    });
  }

  if (!definedFieldNames.has("email")) {
    fields.unshift({
      stepKey: "account",
      stepLabel: "Account",
      stepOrder: -1,
      fieldName: "email",
      fieldType: "email",
      fieldLabel: "Email",
      fieldOrder: -1,
      required: true,
      placeholder: "guest@example.com",
    });
  }

  return fields.sort((fieldA, fieldB) => {
    if (fieldA.stepOrder !== fieldB.stepOrder) {
      return fieldA.stepOrder - fieldB.stepOrder;
    }

    if (fieldA.stepLabel !== fieldB.stepLabel) {
      return fieldA.stepLabel.localeCompare(fieldB.stepLabel);
    }

    return fieldA.fieldOrder - fieldB.fieldOrder;
  });
}

function buildInitialValues(
  user: DashboardUser,
  fields: EditorField[],
): Record<string, FieldValue> {
  const nextValues: Record<string, FieldValue> = {};

  for (const response of user.formResponses) {
    const matchedField = fields.find(
      (field) => field.fieldName === response.fieldName,
    );

    const resolvedType =
      matchedField?.fieldType || response.fieldType || "text";
    nextValues[response.fieldName] = toEditableValue(
      response.value,
      resolvedType,
    );
  }

  if (!nextValues.email || typeof nextValues.email !== "string") {
    nextValues.email = user.email;
  }

  for (const field of fields) {
    if (nextValues[field.fieldName] !== undefined) {
      continue;
    }

    nextValues[field.fieldName] =
      field.fieldType === "checkbox" || field.fieldType === "switch"
        ? false
        : "";
  }

  return nextValues;
}

function mergeFormResponses(
  original: FormResponseItem[],
  fields: EditorField[],
  values: Record<string, FieldValue>,
): FormResponseItem[] {
  const fieldMap = new Map(fields.map((field) => [field.fieldName, field]));

  const merged = original.map((response) => {
    const matchingField = fieldMap.get(response.fieldName);
    if (!matchingField) {
      return response;
    }

    return {
      fieldName: response.fieldName,
      fieldLabel: response.fieldLabel || matchingField.fieldLabel,
      fieldType: response.fieldType || matchingField.fieldType,
      value: toStoredValue(
        matchingField.fieldType,
        values[response.fieldName] ?? "",
      ),
      step: response.step || matchingField.stepKey,
      order:
        typeof response.order === "number"
          ? response.order
          : matchingField.fieldOrder,
    };
  });

  const existingNames = new Set(merged.map((item) => item.fieldName));
  for (const field of fields) {
    if (existingNames.has(field.fieldName)) {
      continue;
    }

    merged.push({
      fieldName: field.fieldName,
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      value: toStoredValue(field.fieldType, values[field.fieldName] ?? ""),
      step: field.stepKey,
      order: field.fieldOrder,
    });
  }

  return merged;
}

function toInputType(fieldType: string): string {
  switch (fieldType) {
    case "email":
      return "email";
    case "tel":
      return "tel";
    case "number":
      return "number";
    case "date":
      return "date";
    case "time":
      return "time";
    case "datetime":
      return "datetime-local";
    default:
      return "text";
  }
}

export default function GuestEditorModal({
  open,
  user,
  formConfig,
  loadingFormConfig,
  saving,
  error,
  onClose,
  onSave,
}: GuestEditorModalProps) {
  if (!open || !user) {
    return null;
  }

  const fields = buildFields(formConfig, user.formResponses);
  const formKey = `${user.id}-${fields
    .map((field) => `${field.stepKey}:${field.fieldName}`)
    .join("|")}`;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-950/55"
        aria-hidden="true"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative mx-auto mt-8 w-[94%] max-w-3xl rounded-xl border border-slate-300 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Legacy Guest Editor
            </h3>
            <p className="text-xs text-slate-500">
              Minimal form editor for quick demo updates
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </header>

        <GuestEditorForm
          key={formKey}
          user={user}
          fields={fields}
          loadingFormConfig={loadingFormConfig}
          saving={saving}
          error={error}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}

type GuestEditorFormProps = {
  user: DashboardUser;
  fields: EditorField[];
  loadingFormConfig: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (userId: string, payload: UpdateUserPayload) => Promise<void>;
};

function GuestEditorForm({
  user,
  fields,
  loadingFormConfig,
  saving,
  error,
  onClose,
  onSave,
}: GuestEditorFormProps) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    buildInitialValues(user, fields),
  );

  const groupedFields = useMemo(() => {
    const grouped = new Map<string, EditorField[]>();
    for (const field of fields) {
      const current = grouped.get(field.stepLabel) || [];
      current.push(field);
      grouped.set(field.stepLabel, current);
    }

    return Array.from(grouped.entries());
  }, [fields]);

  const emailValue =
    typeof values.email === "string" && values.email.trim().length > 0
      ? values.email.trim()
      : user.email;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(user.id, {
      email: emailValue,
      formResponses: mergeFormResponses(user.formResponses, fields, values),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-h-[68vh] space-y-3 overflow-y-auto p-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Editing attendee:{" "}
          <span className="font-semibold text-slate-800">{user.email}</span>
        </div>

        {loadingFormConfig ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Loading event form config. Falling back to existing fields if this
            takes too long.
          </div>
        ) : null}

        {groupedFields.map(([stepLabel, stepFields]) => (
          <section
            key={stepLabel}
            className="rounded-md border border-slate-200 p-3"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {stepLabel}
            </p>

            <div className="space-y-3">
              {stepFields.map((field) => {
                const fieldValue = values[field.fieldName];

                if (
                  field.fieldType === "checkbox" ||
                  field.fieldType === "switch"
                ) {
                  return (
                    <label
                      key={field.fieldName}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(fieldValue)}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [field.fieldName]: event.target.checked,
                          }));
                        }}
                      />
                      <span>{field.fieldLabel}</span>
                    </label>
                  );
                }

                if (field.fieldType === "textarea") {
                  return (
                    <label key={field.fieldName} className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">
                        {field.fieldLabel}
                        {field.required ? " *" : ""}
                      </span>
                      <textarea
                        value={typeof fieldValue === "string" ? fieldValue : ""}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [field.fieldName]: event.target.value,
                          }));
                        }}
                        rows={field.rows || 3}
                        placeholder={field.placeholder}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                      />
                      {field.helperText ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          {field.helperText}
                        </span>
                      ) : null}
                    </label>
                  );
                }

                if (
                  field.fieldType === "select" ||
                  field.fieldType === "radio" ||
                  field.fieldType === "dynamic-groups-select" ||
                  field.fieldType === "dynamic-hotel-select"
                ) {
                  return (
                    <label key={field.fieldName} className="block text-sm">
                      <span className="mb-1 block font-medium text-slate-700">
                        {field.fieldLabel}
                        {field.required ? " *" : ""}
                      </span>
                      <select
                        value={typeof fieldValue === "string" ? fieldValue : ""}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            [field.fieldName]: event.target.value,
                          }));
                        }}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                      >
                        <option value="">Select</option>
                        {(field.options || []).map((option) => (
                          <option
                            key={`${field.fieldName}-${option.value}`}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {field.helperText ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          {field.helperText}
                        </span>
                      ) : null}
                    </label>
                  );
                }

                return (
                  <label key={field.fieldName} className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">
                      {field.fieldLabel}
                      {field.required ? " *" : ""}
                    </span>
                    <input
                      type={toInputType(field.fieldType)}
                      value={typeof fieldValue === "string" ? fieldValue : ""}
                      onChange={(event) => {
                        setValues((current) => ({
                          ...current,
                          [field.fieldName]: event.target.value,
                        }));
                      }}
                      placeholder={field.placeholder}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
                    />
                    {field.helperText ? (
                      <span className="mt-1 block text-xs text-slate-500">
                        {field.helperText}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="space-y-3 border-t border-slate-200 p-4">
        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Guest"}
          </button>
        </div>
      </footer>
    </form>
  );
}
