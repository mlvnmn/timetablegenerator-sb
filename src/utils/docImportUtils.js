import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { parseExcelImport } from './excelUtils';

// Set up PDF.js worker URL for Vite browser environment
if (pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

/**
 * Parse a PDF file ArrayBuffer into structured timetable configuration.
 */
export async function parsePdfImport(arrayBuffer) {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const textLines = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const lineMap = new Map();
      textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push(item.str);
      });

      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedYs.forEach(y => {
        const lineText = lineMap.get(y).join(' ').trim();
        if (lineText) textLines.push(lineText);
      });
    }

    return extractConfigFromTextLines(textLines);
  } catch (err) {
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }
}

/**
 * Parse a Word (.docx / .doc) document ArrayBuffer into structured timetable configuration.
 */
export async function parseDocxImport(arrayBuffer) {
  try {
    // 1. Extract raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = textResult.value || '';
    const textLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 2. Extract HTML to parse structured tables
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value || '';
    const tableData = parseHtmlTables(html);

    return extractConfigFromTextAndTables(textLines, tableData);
  } catch (err) {
    try {
      return parseExcelImport(arrayBuffer);
    } catch {
      throw new Error(`Failed to parse Word document: ${err.message}`);
    }
  }
}

/**
 * Parse HTML string to extract table rows as structured arrays.
 */
function parseHtmlTables(html) {
  const tables = [];
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let match;

  while ((match = tableRegex.exec(html)) !== null) {
    const tableHtml = match[1];
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
        cells.push(text);
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

/**
 * Combine text lines and table structures into timetable config entities.
 */
function extractConfigFromTextAndTables(textLines, tables) {
  for (const table of tables) {
    const config = parseTableAsConfig(table);
    if (config.classes.length > 0 || config.teachers.length > 0) {
      return config;
    }
  }

  return extractConfigFromTextLines(textLines);
}

/**
 * Robust document table parser supporting merged cells (rowspan/colspan),
 * teacher continuity across rows, and shifted column indices.
 */
function parseTableAsConfig(tableRows) {
  if (!tableRows || tableRows.length < 2) {
    return { classes: [], subjects: [], teachers: [], timetable: null };
  }

  const extractedClassesMap = {};
  const extractedTeacherMap = {};
  let currentTeacher = null;

  for (let r = 0; r < tableRows.length; r++) {
    const row = tableRows[r];
    const rowText = row.join(' ').toLowerCase();

    // Skip header rows
    if (rowText.includes('faculty name') || rowText.includes('teacher name') || rowText.includes('faculty_name')) {
      continue;
    }

    // Skip total/summary rows containing only numbers
    const nonNumCells = row.filter(c => c && isNaN(Number(c)));
    if (nonNumCells.length === 0) continue;

    let clsName = '';
    let subjectName = '';
    let hours = 3;

    // Case A: 7+ column row -> [NO, FACULTY, CLASS, SUBJECT, THEORY, LAB, TOTAL]
    if (row.length >= 7) {
      if (row[1] && isNaN(Number(row[1]))) currentTeacher = row[1].trim();
      clsName = row[2];
      subjectName = row[3];
      hours = Number(row[6]) || Number(row[4]) || 3;
    }
    // Case B: 6-column row -> [FACULTY/NO, CLASS, SUBJECT, THEORY, LAB, TOTAL]
    else if (row.length === 6) {
      if (row[0] && isNaN(Number(row[0]))) {
        currentTeacher = row[0].trim();
        clsName = row[1];
        subjectName = row[2];
        hours = Number(row[5]) || Number(row[3]) || 3;
      } else {
        clsName = row[1];
        subjectName = row[2];
        hours = Number(row[5]) || Number(row[3]) || 3;
      }
    }
    // Case C: 5-column row -> [CLASS, SUBJECT, THEORY, LAB, TOTAL]
    else if (row.length === 5) {
      clsName = row[0];
      subjectName = row[1];
      hours = Number(row[4]) || Number(row[2]) || 3;
    }
    // Case D: 4-column row -> [CLASS, SUBJECT, THEORY, TOTAL]
    else if (row.length === 4) {
      clsName = row[0];
      subjectName = row[1];
      hours = Number(row[3]) || Number(row[2]) || 3;
    }
    // Case E: 3-column row -> [CLASS, SUBJECT, HOURS]
    else if (row.length === 3) {
      clsName = row[0];
      subjectName = row[1];
      hours = Number(row[2]) || 3;
    }

    if (!currentTeacher) continue;
    if (!clsName || !subjectName) continue;
    if (clsName.toLowerCase() === 'total' || subjectName.toLowerCase() === 'total') continue;

    // Register Class
    const classId = `cls_${clsName.trim().replace(/\s+/g, '_').toLowerCase()}`;
    if (!extractedClassesMap[classId]) {
      extractedClassesMap[classId] = {
        id: classId,
        label: clsName.trim(),
        periodsPerDay: 5
      };
    }

    // Register Teacher
    const tKey = currentTeacher.toLowerCase();
    if (!extractedTeacherMap[tKey]) {
      extractedTeacherMap[tKey] = {
        id: `t_${tKey.replace(/\s+/g, '_')}`,
        name: currentTeacher,
        subjects: [],
        blockedSlots: []
      };
    }

    // Add assignment if not duplicate
    const exists = extractedTeacherMap[tKey].subjects.some(
      s => s.classId === classId && s.subject.toLowerCase() === subjectName.toLowerCase()
    );

    if (!exists) {
      extractedTeacherMap[tKey].subjects.push({
        id: `subj_${r}_${Date.now()}`,
        classId,
        subject: subjectName.trim(),
        hoursPerWeek: isNaN(hours) || hours <= 0 ? 3 : hours,
        isElective: subjectName.toLowerCase().includes('elective'),
        electiveGroup: ''
      });
    }
  }

  return {
    classes: Object.values(extractedClassesMap),
    subjects: [],
    teachers: Object.values(extractedTeacherMap),
    timetable: null
  };
}

/**
 * Parse raw text lines into timetable configuration entities.
 */
function extractConfigFromTextLines(lines) {
  const extractedClassesMap = {};
  const extractedTeacherMap = {};
  let currentClass = null;

  lines.forEach((line, idx) => {
    // 1. Check for Class declarations (e.g. "Class: UG-1A", "Batch: CSE 2nd Year")
    const classMatch = line.match(/(?:Class|Batch|Course|Department)\s*[:-]\s*(.+)/i);
    if (classMatch) {
      const label = classMatch[1].trim();
      const id = `cls_${label.replace(/\s+/g, '_')}`;
      currentClass = { id, label, periodsPerDay: 5 };
      extractedClassesMap[id] = currentClass;
      return;
    }

    // 2. Check for Teacher mapping line (e.g. "Dr. Alan Turing - Data Structures (4 hrs)")
    const teacherSubjectMatch = line.match(/([A-Z][A-Za-z\s.-]+)\s*[:-]\s*([A-Za-z0-9\s]+?)(?:\((\d+)\s*(?:hrs|hours|periods)?\))?$/i);
    if (teacherSubjectMatch) {
      const teacherName = teacherSubjectMatch[1].trim();
      const subjName = teacherSubjectMatch[2].trim();
      const hours = teacherSubjectMatch[3] ? parseInt(teacherSubjectMatch[3], 10) : 3;

      const cls = currentClass || { id: 'cls_default', label: 'Default Class', periodsPerDay: 5 };
      extractedClassesMap[cls.id] = cls;

      const tKey = teacherName.toLowerCase();
      if (!extractedTeacherMap[tKey]) {
        extractedTeacherMap[tKey] = {
          id: `t_${tKey.replace(/\s+/g, '_')}`,
          name: teacherName,
          subjects: [],
          blockedSlots: []
        };
      }

      extractedTeacherMap[tKey].subjects.push({
        id: `subj_${idx}_${Date.now()}`,
        classId: cls.id,
        subject: subjName,
        hoursPerWeek: isNaN(hours) ? 3 : hours,
        isElective: false,
        electiveGroup: ''
      });
    }
  });

  const classes = Object.values(extractedClassesMap);
  const teachers = Object.values(extractedTeacherMap);

  if (classes.length === 0 && teachers.length === 0) {
    throw new Error('No structured timetable config data found in document text.');
  }

  return { classes, subjects: [], teachers, timetable: null };
}
