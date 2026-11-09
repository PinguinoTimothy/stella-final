// Reads the values of a fillable character sheet (PDF form fields). Returns a plain { fieldName: value } map.
import { openPdf } from './pdfRender';

export async function readFormFields(blob) {
  const doc = await openPdf(blob);
  const objects = await doc.getFieldObjects();
  if (!objects) return {};
  const values = {};
  for (const [name, list] of Object.entries(objects)) {
    const entry = Array.isArray(list) ? list[0] : null;
    if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
      values[name] = entry.value;
    }
  }
  return values;
}
