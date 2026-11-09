// Reads the values of a fillable character sheet (PDF form fields). Returns a plain { fieldName: value } map.
import { openPdf } from './pdfRender';

function filled(v) {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
}

export async function readFormFields(blob) {
  const doc = await openPdf(blob);
  const values = {};

  // 1. The form's field list.
  const objects = await doc.getFieldObjects().catch(() => null);
  for (const [name, list] of Object.entries(objects || {})) {
    const entry = Array.isArray(list) ? list[0] : null;
    if (entry && filled(entry.value)) values[name] = entry.value;
  }

  // 2. The widgets on each page. The field list can leave out some fields (repeated rows such as weapons),
  //    but every widget carries its own name and value.
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const annotations = await page.getAnnotations();
    for (const a of annotations) {
      if (!a.fieldName || a.fieldName in values) continue;
      if (filled(a.fieldValue)) values[a.fieldName] = a.fieldValue;
    }
  }

  return values;
}
