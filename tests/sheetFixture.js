// A small fillable sheet made in the test, with the same field names as a real Pathfinder sheet.
// No personal character data is stored in the repository.
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function makeSheet() {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = [doc.addPage([612, 792]), doc.addPage([612, 792]), doc.addPage([612, 792])];
  const text = (name, value, page = 0, y = 740, maxLength) => {
    const f = form.createTextField(name);
    if (maxLength !== undefined) f.setMaxLength(maxLength); // set before any value: pdf-lib refuses a limit below the current text
    else f.setText(value);
    f.addToPage(pages[page], { x: 40, y, width: 200, height: 18, font });
  };
  text('Character_Name', 'Hood Robinson');
  text('Character_Race', 'Human', 0, 710);
  text('Ability_STR_Total', '16', 0, 680);
  text('Ability_DEX_Total', '19', 0, 650);
  text('Skill_Acrobatics_Ranks', '3', 0, 620);
  text('CR_HP_Total', '', 0, 590, 0); // empty, with a 0 maximum length, as in the real sheet
  text('Weapon_Attack_1', '+10(x2)/+8/+5', 1, 740);
  const cb = form.createCheckBox('Skill_Acrobatics_Isclass');
  cb.check();
  cb.addToPage(pages[0], { x: 40, y: 560, width: 14, height: 14 });
  const dd = form.createDropdown('AD_CMB_Option');
  dd.setOptions(['STR', 'DEX']);
  dd.select('STR');
  dd.addToPage(pages[1], { x: 40, y: 700, width: 80, height: 18, font });
  return doc.save();
}
