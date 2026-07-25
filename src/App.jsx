import React, { useState, useCallback, useRef } from 'react';
import StepIndicator from './components/layout/StepIndicator';
import Step1_Classes from './components/steps/Step1_Classes';
import Step2_Subjects from './components/steps/Step2_Subjects';
import Step3_Teachers from './components/steps/Step3_Teachers';
import Step3_Constraints from './components/steps/Step3_Constraints';
import Step4_Generate from './components/steps/Step4_Generate';
import { ToastContainer } from './components/shared/Toast';
import { parseImportFile, readFileAsText } from './utils/importUtils';
import {
  Calendar, Upload, RotateCcw, Info
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

  // ── Import handler ─────────────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const { classes: c, subjects: subj, teachers: t, timetable: tt } = parseImportFile(text);
      setClasses(c);
      setSubjects(subj || []);
      setTeachers(t);
      setTimetable(tt);
      setCompletedSteps([1, 2, 3, 4, 5]);
      setCurrentStep(tt ? 5 : 3);
      addToast('Configuration imported successfully!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">

      {/* ── Left Sidebar (Desktop Navigation) ────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200/80 flex-shrink-0 flex flex-col justify-between p-5 sticky top-0 md:h-screen z-30">
        <div className="space-y-6">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs">
              <Calendar size={18} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 leading-tight">Time Table</div>
              <div className="text-[10px] text-slate-400 font-semibold leading-tight">Generator</div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Stepper Navigation */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-3">
              Wizard Steps
            </div>
            <StepIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              onStepClick={goToStep}
            />
          </div>

          {/* Setup Overview Stats Card */}
          <div className="glass-card p-4 space-y-3 bg-slate-50/50">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info size={11} /> Setup Overview
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 bg-white border border-slate-200/60 rounded-lg">
                <div className="text-xs font-bold text-slate-800">{classes.length}</div>
                <div className="text-[8px] font-medium text-slate-400 mt-0.5">Classes</div>
              </div>
              <div className="p-1.5 bg-white border border-slate-200/60 rounded-lg">
                <div className="text-xs font-bold text-slate-800">{subjects.length}</div>
                <div className="text-[8px] font-medium text-slate-400 mt-0.5">Subjs</div>
              </div>
              <div className="p-1.5 bg-white border border-slate-200/60 rounded-lg">
                <div className="text-xs font-bold text-slate-800">{teachers.length}</div>
                <div className="text-[8px] font-medium text-slate-400 mt-0.5">Staff</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions Footer */}
        <div className="mt-6 space-y-2 pt-4 border-t border-slate-100">
          <input
            ref={importRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="sidebar-import-json"
          />
          <button
            onClick={() => importRef.current?.click()}
            className="w-full btn-secondary text-xs py-2 justify-center gap-2"
          >
            <Upload size={13} />
            Import Configuration
          </button>
          <button
            onClick={handleReset}
            className="w-full text-xs py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 transition-all font-semibold"
          >
            <RotateCcw size={13} />
            Reset Application
          </button>
        </div>
      </aside>

      {/* ── Main Panel ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-200/80 z-20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-900">
              {currentStep === 1 && 'Department Classes'}
              {currentStep === 2 && 'Subjects Management'}
              {currentStep === 3 && 'Teaching Staff & Subjects'}
              {currentStep === 4 && 'External Constraints'}
              {currentStep === 5 && 'Constraint solver & Generation'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Local state
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
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
        </main>
      </div>

      {/* Toast notifications rendering container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
