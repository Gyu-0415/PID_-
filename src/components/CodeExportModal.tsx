import React, { useState } from 'react';
import { PIDParameters, PlantConfig } from '../types/pid';
import { generateAllCodeTemplates } from '../engine/codeGenerator';
import { X, Copy, Check, Download, Code2, Terminal, FileCode } from 'lucide-react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: PIDParameters;
  plant: PlantConfig;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  params,
  plant,
}) => {
  const [selectedLang, setSelectedLang] = useState<'cpp' | 'python' | 'arduino' | 'typescript' | 'matlab'>('cpp');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const templates = generateAllCodeTemplates(params, plant);
  const activeTemplate = templates[selectedLang];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTemplate.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeTemplate.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTemplate.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                PID 컨트롤러 패키지 코드 내보내기 (Export Package)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                현재 튜닝된 파라미터(Kp={params.kp}, Ki={params.ki}, Kd={params.kd})가 적용된 독립 실행형 패키지입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Tabs & Action Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {(
              [
                { id: 'cpp', label: 'C++ (Class)' },
                { id: 'python', label: 'Python (NumPy)' },
                { id: 'arduino', label: 'Arduino (IDE)' },
                { id: 'typescript', label: 'TypeScript (npm)' },
                { id: 'matlab', label: 'MATLAB / Octave' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedLang(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedLang === item.id
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사 완료!' : '코드 복사'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>파일 다운로드 ({activeTemplate.filename})</span>
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="px-6 py-2 bg-slate-950/90 text-xs text-slate-400 border-b border-slate-800/80 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{activeTemplate.instructions}</span>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-[#090d16] font-mono text-xs leading-relaxed text-slate-200">
          <pre className="selection:bg-cyan-800">
            <code>{activeTemplate.code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Target Plant: {plant.name}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
