import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Capture a DOM element as a PNG blob.
 */
/**
 * Capture a DOM element as a base64 PNG string (more reliable than toBlob with JSZip).
 */
async function captureElement(element) {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0f172a',
    scale: 2,
    useCORS: true,
    logging: false,
    allowTaint: true,
  });
  // Strip the data:image/png;base64, prefix
  return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Download a ZIP containing:
 *  - One PNG per class timetable grid
 *  - timetable_data.json
 */
export async function downloadZip({ classes, subjects, teachers, timetable, gridRefs, onProgress }) {
  const zip = new JSZip();
  const imgFolder = zip.folder('timetables');

  let done = 0;
  const total = classes.length + 1;

  for (const cls of classes) {
    const el = gridRefs[cls.id]?.current;
    if (el) {
      const base64 = await captureElement(el);
      // Sanitize the label to make it a safe filename
      const safeLabel = cls.label.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      imgFolder.file(`${safeLabel}.png`, base64, { base64: true });
    }
    done++;
    if (onProgress) onProgress(Math.round((done / total) * 100));
  }

  // Build JSON export
  const exportData = {
    exportedAt: new Date().toISOString(),
    classes,
    subjects,
    teachers,
    timetable,
  };
  zip.file('timetable_data.json', JSON.stringify(exportData, null, 2));
  done++;
  if (onProgress) onProgress(100);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `CS_Timetable_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.zip`);
}
