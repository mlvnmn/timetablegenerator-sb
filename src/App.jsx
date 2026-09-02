import React, { useState, useCallback, useRef } from 'react';
import StepIndicator from './components/layout/StepIndicator';
import Step1_Classes from './components/steps/Step1_Classes';
import Step2_Subjects from './components/steps/Step2_Subjects';
import Step3_Teachers from './components/steps/Step3_Teachers';
import Step3_Constraints from './components/steps/Step3_Constraints';
import Step4_Generate from './components/steps/Step4_Generate';
import { ToastContainer } from './components/shared/Toast';
import { processMultipleImportFiles } from './utils/importUtils';
import { downloadExcelTemplate } from './utils/excelUtils';
import UserGuideModal from './components/shared/UserGuideModal';
import {
  Calendar, Upload, RotateCcw, FileSpreadsheet, ChevronRight, HelpCircle
} from 'lucide-react';

let toastIdCounter = 0;

export default function App() {
  const [currentStep, setCurrentStep]       = useState(1);
  const [completedSteps, setCompletedSteps] = useState([1]);
  const [classes,  setClasses]              = useState([]);
  const [subjects, setSubjects]             = useState([]);
  const [teachers, setTeachers]             = useState([]);
  const [timetable, setTimetable]           = useState(null);
  const [toasts, setToasts]                 = useState([]);
  const [showGuide, setShowGuide]           = useState(false);
  const importRef = useRef();

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Step navigation ────────────────────────────────────────────────────────
  const goToStep = (step) => {
    setCurrentStep(step);
    setCompletedSteps(prev => {
      const s = new Set([...prev, step]);
      for (let i = 1; i < step; i++) s.add(i);
      return [...s];
    });
  };

  const nextStep = () => goToStep(Math.min(currentStep + 1, 5));
  const prevStep = () => goToStep(Math.max(currentStep - 1, 1));

  // ── Import handler (Single or Multiple Excel Files) ───────────────────────
  const handleImport = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const { classes: c, subjects: subj, teachers: t, timetable: tt } = await processMultipleImportFiles(files);
      setClasses(c || []);
      setSubjects(subj || []);
      setTeachers(t || []);
      setTimetable(tt || null);
      setCompletedSteps([1, 2, 3, 4, 5]);
      setCurrentStep(tt ? 5 : 3);

      const msg = files.length === 1
        ? `Imported configuration from ${files[0].name}`
        : `Imported & merged ${files.length} Excel files (${c.length} classes, ${t.length} staff)`;
      addToast(msg, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to import Excel files.', 'error');
    }
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('Reset everything? All classes, subjects, teachers and timetable data will be cleared.')) {
      setClasses([]);
      setSubjects([]);
      setTeachers([]);
      setTimetable(null);
      setCurrentStep(1);
      setCompletedSteps([1]);
      addToast('Application reset successfully.', 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#eff2f5] font-sans">

      {/* ── Left Sidebar (Dark Palette Navy #243b4a / #000000) ───────────────── */}
      <aside className="w-full md:w-64 bg-[#243b4a] text-white flex-shrink-0 flex flex-col justify-between p-4 sticky top-0 md:h-screen z-30 shadow-md">
        <div className="space-y-4">
          {/* Brand Header */}
          <div className="flex items-center gap-2.5 px-1 py-1">
            <div className="w-8 h-8 rounded-lg bg-[#ff732e] text-white flex items-center justify-center font-bold shadow-xs">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-sm font-black text-white tracking-tight leading-tight">Time Table</div>
              <div className="text-[10px] text-[#ff732e] font-extrabold uppercase tracking-wider leading-none mt-0.5">Generator</div>
            </div>
          </div>

          <div className="border-t border-white/10" />

          {/* Stepper Navigation */}
          <div>
            <div className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider mb-2.5 px-1">
              Setup Wizard
            </div>
            <StepIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={goToStep}
            />
          </div>

          {/* Overview Summary */}
          <div className="p-3 bg-white/10 border border-white/15 rounded-xl space-y-2">
            <div className="text-[10px] font-extrabold text-white/80 uppercase tracking-wider">
              Setup Overview
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 bg-black/30 border border-white/15 rounded-lg">
                <div className="text-xs font-black text-white">{classes.length}</div>
                <div className="text-[9px] font-bold text-white/80">Classes</div>
              </div>
              <div className="p-1.5 bg-black/30 border border-white/15 rounded-lg">
                <div className="text-xs font-black text-white">{subjects.length}</div>
                <div className="text-[9px] font-bold text-white/80">Subjs</div>
              </div>
              <div className="p-1.5 bg-black/30 border border-white/15 rounded-lg">
                <div className="text-xs font-black text-white">{teachers.length}</div>
                <div className="text-[9px] font-bold text-white/80">Staff</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions Footer */}
        <div className="mt-4 space-y-1.5 pt-3 border-t border-white/10">
          <input
            ref={importRef}
            type="file"
            multiple
            accept=".xlsx, .xls, .csv"
            onChange={handleImport}
            className="hidden"
            id="sidebar-import-file"
          />
          <button
            onClick={() => importRef.current?.click()}
            className="w-full bg-[#ff732e] hover:bg-[#e8611d] text-white font-bold text-xs py-2 rounded-lg justify-center gap-1.5 flex items-center transition-colors shadow-xs"
            title="Upload Excel (.xlsx, .xls, .csv) spreadsheet"
          >
            <Upload size={14} />
            Import Excel
          </button>
          <button
            onClick={downloadExcelTemplate}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs py-2 rounded-lg justify-center gap-1.5 flex items-center transition-colors border border-white/10"
            title="Download sample Excel template file"
          >
            <FileSpreadsheet size={14} className="text-[#ff732e]" />
            Excel Template
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs py-2 rounded-lg justify-center gap-1.5 flex items-center transition-colors border border-white/10"
          >
            <HelpCircle size={14} className="text-white/80" />
            User Guide
          </button>
          <button
            onClick={handleReset}
            className="w-full text-[11px] py-1 text-white/40 hover:text-rose-400 flex items-center justify-center gap-1 transition-colors font-medium"
          >
            <RotateCcw size={12} />
            Reset All Data
          </button>
        </div>
      </aside>

      {/* ── Main Panel ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white border-b border-[#243b4a]/10 z-20 px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#243b4a]/70">
            <span>Wizard</span>
            <ChevronRight size={13} className="text-[#243b4a]/30" />
            <h1 className="text-xs font-black text-[#000000]">
              {currentStep === 1 && '1. Department Classes'}
              {currentStep === 2 && '2. Subjects Workload'}
              {currentStep === 3 && '3. Teaching Staff & Assignments'}
              {currentStep === 4 && '4. External Blocked Constraints'}
              {currentStep === 5 && '5. Constraint Solver & Generation'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="text-xs text-[#243b4a] hover:text-[#ff732e] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[#eff2f5] transition-colors"
            >
              <HelpCircle size={14} className="text-[#ff732e]" />
              User Guide
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-6 flex flex-col justify-between">
          <div>
            {currentStep === 1 && (
              <Step1_Classes
                classes={classes}
                setClasses={setClasses}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <Step2_Subjects
                classes={classes}
                subjects={subjects}
                setSubjects={setSubjects}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 3 && (
              <Step3_Teachers
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                setTeachers={setTeachers}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 4 && (
              <Step3_Constraints
                teachers={teachers}
                setTeachers={setTeachers}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 5 && (
              <Step4_Generate
                classes={classes}
                subjects={subjects}
                teachers={teachers}
                timetable={timetable}
                setTimetable={setTimetable}
                onBack={prevStep}
                addToast={addToast}
              />
            )}
          </div>

          {/* Middle Footer Branding */}
          <footer className="mt-10 pt-4 border-t border-[#243b4a]/10 text-center">
            <a
              href="https://athlogix.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 text-xs font-bold text-[#243b4a]/70 hover:text-[#ff732e] transition-colors py-1 px-3 rounded-lg hover:bg-white"
              title="Visit Athlogix Official Website"
            >
              <span className="text-xs font-bold text-[#243b4a]/70">Developed by</span>
              <span className="font-fredoka text-[#ff732e] text-xs font-bold">Athlogix</span>
            </a>
          </footer>
        </main>
      </div>

      {/* User Guide Modal */}
      <UserGuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
