import React, { useState } from 'react';
import { PIDParameters, PlantConfig, PlantModelId } from '../types/pid';
import { calculateZieglerNicholsOscillation, calculateCohenCoon } from '../engine/autoTuner';
import { Sliders, Wrench, RotateCcw, Sparkles, ChevronDown, ChevronUp, Zap, HelpCircle } from 'lucide-react';

interface TuningDeckProps {
  params: PIDParameters;
  onParamsChange: (newParams: Partial<PIDParameters>) => void;
  onReset: () => void;
  plant: PlantConfig;
}

export const TuningDeck: React.FC<TuningDeckProps> = ({
  params,
  onParamsChange,
  onReset,
  plant,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Apply auto-tuning preset
  const applyAutoTune = (type: 'classic' | 'no_overshoot' | 'pessen' | 'pi' | 'cohen_coon') => {
    if (type === 'cohen_coon') {
      const res = calculateCohenCoon(plant.id);
      onParamsChange(res.params);
    } else {
      const res = calculateZieglerNicholsOscillation(plant.id, type);
      onParamsChange(res.params);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
      {/* Deck Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            PID 게인 튜닝 & 파라미터 (Controller Deck)
          </h3>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          title="초기 기본 게인값으로 복원"
        >
          <RotateCcw className="w-3 h-3" />
          <span>초기화</span>
        </button>
      </div>

      {/* Main Sliders: Kp, Ki, Kd */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Kp (비례 이득) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400">비례 이득 (Kp)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={params.kp}
              onChange={(e) => onParamsChange({ kp: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-18 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:outline-none focus:border-red-400"
            />
          </div>
          <input
            type="range"
            min="0"
            max={plant.id === 'pendulum' ? 60 : 30}
            step="0.05"
            value={params.kp}
            onChange={(e) => onParamsChange({ kp: parseFloat(e.target.value) })}
            className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>반응 속도 증가</span>
            <div className="flex gap-1">
              <button
                onClick={() => onParamsChange({ kp: Number((params.kp * 0.8).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                -20%
              </button>
              <button
                onClick={() => onParamsChange({ kp: Number((params.kp * 1.25).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                +25%
              </button>
            </div>
          </div>
        </div>

        {/* Ki (적분 이득) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">적분 이득 (Ki)</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="20"
              value={params.ki}
              onChange={(e) => onParamsChange({ ki: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-18 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
            />
          </div>
          <input
            type="range"
            min="0"
            max={plant.id === 'pendulum' ? 10 : 8}
            step="0.02"
            value={params.ki}
            onChange={(e) => onParamsChange({ ki: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>정상 오차 제거</span>
            <div className="flex gap-1">
              <button
                onClick={() => onParamsChange({ ki: Number((params.ki * 0.8).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                -20%
              </button>
              <button
                onClick={() => onParamsChange({ ki: Number((params.ki * 1.25).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                +25%
              </button>
            </div>
          </div>
        </div>

        {/* Kd (미분 이득) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400">미분 이득 (Kd)</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="30"
              value={params.kd}
              onChange={(e) => onParamsChange({ kd: Math.max(0, parseFloat(e.target.value) || 0) })}
              className="w-18 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:outline-none focus:border-purple-400"
            />
          </div>
          <input
            type="range"
            min="0"
            max={plant.id === 'pendulum' ? 20 : 15}
            step="0.02"
            value={params.kd}
            onChange={(e) => onParamsChange({ kd: parseFloat(e.target.value) })}
            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>오버슈트 억제/제동</span>
            <div className="flex gap-1">
              <button
                onClick={() => onParamsChange({ kd: Number((params.kd * 0.8).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                -20%
              </button>
              <button
                onClick={() => onParamsChange({ kd: Number((params.kd * 1.25).toFixed(2)) })}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
              >
                +25%
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Tuning Presets Bar */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>지글러-니콜스 자동 튜닝 (Auto-Tune):</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => applyAutoTune('classic')}
            className="px-2.5 py-1 text-[11px] rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-800/80 transition-colors"
          >
            ZN 표준 PID
          </button>
          <button
            onClick={() => applyAutoTune('no_overshoot')}
            className="px-2.5 py-1 text-[11px] rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 transition-colors"
          >
            무오버슈트 감쇠형
          </button>
          <button
            onClick={() => applyAutoTune('pessen')}
            className="px-2.5 py-1 text-[11px] rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-800/80 transition-colors"
          >
            Pessen 적분 규칙
          </button>
          <button
            onClick={() => applyAutoTune('cohen_coon')}
            className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors"
          >
            Cohen-Coon 튜닝
          </button>
          <button
            onClick={() => applyAutoTune('pi')}
            className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            PI만 사용
          </button>
        </div>
      </div>

      {/* Advanced Parameters Accordion */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
        >
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>고급 제어기 설정 (Anti-Windup, 미분 노이즈 필터 N, 미분 킥 방지)</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800">
            {/* Anti-Windup Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-medium">안티 와인드업 (Anti-Windup)</label>
              <select
                value={params.antiWindup}
                onChange={(e) => onParamsChange({ antiWindup: e.target.value as any })}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="clamping">Clamping (클램핑 정지)</option>
                <option value="back-calculation">Back-Calculation (역계산)</option>
                <option value="none">사용 안 함 (포화 허용)</option>
              </select>
              <span className="text-[10px] text-slate-500">액추에이터 포화 시 적분기 폭주 방지</span>
            </div>

            {/* Derivative Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-medium">미분 적용 방식 (Derivative Mode)</label>
              <select
                value={params.derivativeMode}
                onChange={(e) => onParamsChange({ derivativeMode: e.target.value as any })}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="on_measurement">측정값 기준 (Derivative on PV)</option>
                <option value="on_error">오차 기준 (Derivative on Error)</option>
              </select>
              <span className="text-[10px] text-slate-500">목표값 급변 시 미분 킥(Kick) 방지</span>
            </div>

            {/* Derivative Filter N */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="font-medium">미분 LPF 필터 계수 (N)</span>
                <span className="font-mono text-slate-200">{params.filterN}</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={params.filterN}
                onChange={(e) => onParamsChange({ filterN: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none mt-2"
              />
              <span className="text-[10px] text-slate-500">고주파 센서 노이즈 증폭 억제</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
