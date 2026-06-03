export interface FileField {
  key: string;
  value: File | string;
}

export function toFormData(
  data: Record<string, unknown>,
  fileFields?: FileField[]
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  if (fileFields) {
    for (const { key, value } of fileFields) {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    }
  }

  return formData;
}

