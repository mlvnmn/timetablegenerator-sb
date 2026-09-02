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

      // Group text items by vertical position (Y coordinate) to reconstruct lines
      const lineMap = new Map();
      textContent.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y).push(item.str);
      });

      // Sort Y coordinates descending (top to bottom of page)
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
    // Fallback: try parsing as arrayBuffer Excel/Text format if legacy
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
        // Strip HTML tags and clean whitespace
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
  // First check if any extracted table contains teacher/subject data
  for (const table of tables) {
    const config = parseTableAsConfig(table);
    if (config.classes.length > 0 || config.teachers.length > 0) {
      return config;
    }
  }

  // Fallback to text line parser
  return extractConfigFromTextLines(textLines);
}

/**
 * Attempt to parse a 2D table array into timetable config entities.
 */
function parseTableAsConfig(tableRows) {
  if (!tableRows || tableRows.length < 2) {
    return { classes: [], subjects: [], teachers: [], timetable: null };
  }

  const header = tableRows[0].map(h => h.toLowerCase());
  const findIdx = (aliases) => header.findIndex(h => aliases.some(a => h.includes(a)));

  const classIdx   = findIdx(['class', 'batch', 'course', 'dept', 'department']);
  const teacherIdx = findIdx(['teacher', 'faculty', 'staff', 'instructor', 'professor', 'name']);
  const subjectIdx = findIdx(['subject', 'module', 'course name']);
  const hoursIdx   = findIdx(['hours', 'period', 'weekly', 'hrs']);

  const extractedClasses = new Set();
  const teacherMap = {};

  for (let i = 1; i < tableRows.length; i++) {
    const row = tableRows[i];
    const clsName   = (classIdx >= 0 ? row[classIdx] : '') || 'Default Class';
    const tName     = (teacherIdx >= 0 ? row[teacherIdx] : '') || `Teacher ${i}`;
    const subjName  = (subjectIdx >= 0 ? row[subjectIdx] : '') || 'General Subject';
    const hoursNum  = hoursIdx >= 0 ? parseInt(row[hoursIdx], 10) : 3;
    const hours     = isNaN(hoursNum) || hoursNum <= 0 ? 3 : hoursNum;

    if (clsName) extractedClasses.add(clsName);

    const tKey = tName.trim().toLowerCase();
    if (!teacherMap[tKey]) {
      teacherMap[tKey] = {
        id: `t_${tKey.replace(/\s+/g, '_')}`,
        name: tName.trim(),
        subjects: [],
        blockedSlots: []
      };
    }

    const classId = `cls_${clsName.trim().replace(/\s+/g, '_')}`;
    teacherMap[tKey].subjects.push({
      id: `subj_${i}_${Date.now()}`,
      classId,
      subject: subjName.trim(),
      hoursPerWeek: hours,
      isElective: false,
      electiveGroup: ''
    });
  }

  const classes = Array.from(extractedClasses).map(clsName => ({
    id: `cls_${clsName.trim().replace(/\s+/g, '_')}`,
    label: clsName.trim(),
    periodsPerDay: 5
  }));

  return {
    classes,
    subjects: [],
    teachers: Object.values(teacherMap),
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
