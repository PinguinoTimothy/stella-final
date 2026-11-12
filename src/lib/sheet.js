// Character sheet PDFs: read the fillable fields, group them for the editor, and write values back into the PDF.
// The PDF stays the source of the layout; the app stores the values (sheet.fields) and writes them into the file on export.
import { PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFRawStream, PDFRef, PDFString, PDFTextField } from 'pdf-lib';

const GROUPS = [
  ['Character', 'Character'],
  ['Ability', 'Abilities'],
  ['AD', 'Armor class, saves and attacks'],
  ['CR', 'Class record'],
  ['Stats', 'Speed and initiative'],
  ['Armor', 'Armor and shield'],
  ['Weapon', 'Weapons'],
  ['Skill', 'Skills'],
  ['Skills', 'Skills'],
  ['FeatFeatures', 'Feats and features'],
  ['FeatsSpecial', 'Feats and special abilities'],
  ['Equip', 'Equipment'],
  ['Worn', 'Worn magic items'],
  ['Currency', 'Currency'],
  ['Weight', 'Carried weight'],
  ['Load', 'Loads and lift'],
  ['Caster1', 'Spells (page 1)'],
  ['Caster2', 'Spells (page 2)'],
  ['Spell', 'Spells'],
];

/** Which section a field belongs to, by its name prefix. Unknown names go to "Other". */
export function groupOf(name) {
  const prefix = name.split('_')[0];
  const hit = GROUPS.find(([p]) => p === prefix);
  return hit ? hit[1] : 'Other';
}

/** Kind of control the editor shows for a field. */
export function kindOf(field) {
  if (field instanceof PDFCheckBox) return 'check';
  if (field instanceof PDFDropdown) return 'select';
  if (field instanceof PDFTextField) return 'text';
  return null; // buttons and anything else are not editable here
}

async function inflate(bytes) {
  const ds = new DecompressionStream('deflate');
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const stream = source.pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The script of one of a field's actions ("C" calculate, "F" format...), decompressed, or '' when it has none. */
async function actionScript(doc, field, key) {
  const get = o => (o instanceof PDFRef ? doc.context.lookup(o) : o);
  const aa = get(field.acroField.dict.get(PDFName.of('AA')));
  if (!(aa instanceof PDFDict)) return '';
  const action = get(aa.get(PDFName.of(key)));
  const js = action instanceof PDFDict ? get(action.get(PDFName.of('JS'))) : null;
  if (!js) return '';
  if (js instanceof PDFString || js instanceof PDFHexString) return js.decodeText();
  if (js instanceof PDFRawStream) {
    const filter = String(get(js.dict.get(PDFName.of('Filter'))) ?? '');
    const raw = filter.includes('FlateDecode') ? await inflate(js.contents) : js.contents;
    return new TextDecoder().decode(raw);
  }
  return '';
}

/** Reads the fields of a sheet: name, kind, section, current value and options (for dropdowns). */
export async function readFields(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const out = [];
  const calcs = {};
  const decimals = {};
  for (const f of form.getFields()) {
    const kind = kindOf(f);
    if (!kind) continue;
    const name = f.getName();
    const script = await actionScript(doc, f, 'C');
    if (script) calcs[name] = script;
    const fmt = /AFNumber_Format\(\s*(\d+)/.exec(await actionScript(doc, f, 'F'));
    if (fmt) decimals[name] = Number(fmt[1]);
    let value;
    if (kind === 'check') value = f.isChecked();
    else if (kind === 'select') value = f.getSelected()[0] || '';
    else value = f.getText() || '';
    out.push({
      name,
      kind,
      group: groupOf(name),
      value,
      options: kind === 'select' ? f.getOptions() : undefined,
    });
  }
  return { pageCount: doc.getPageCount(), fields: out, calcs, decimals };
}

/** Writes values into the PDF's form and returns the new file. Unknown names are skipped, not created. */
export async function fillPdf(bytes, values) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  // index the fields once: getField() scans them all, which is too slow for ~1500 values
  const byName = new Map(doc.getForm().getFields().map(f => [f.getName(), f]));
  for (const [name, value] of Object.entries(values)) {
    const f = byName.get(name);
    if (!f) continue;
    if (f instanceof PDFCheckBox) {
      if (f.isChecked() === !!value) continue;
      if (value) f.check();
      else f.uncheck();
    } else if (f instanceof PDFDropdown) {
      if (value && f.getSelected()[0] !== String(value)) f.select(String(value));
    } else if (f instanceof PDFTextField) {
      const text = value == null ? '' : String(value);
      if ((f.getText() || '') === text) continue; // untouched: leave the field exactly as it is
      try {
        f.setText(text);
      } catch {
        // some sheets set a maximum length of 0 on fields that must still take a value
        f.setMaxLength(undefined);
        f.setText(text);
      }
    }
  }
  return doc.save();
}
