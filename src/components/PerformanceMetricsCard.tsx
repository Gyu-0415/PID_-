import React from 'react';
import { StepResponseMetrics } from '../types/pid';
import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, TrendingUp, Zap, Clock, Target } from 'lucide-react';

interface PerformanceMetricsCardProps {
  metrics: StepResponseMetrics;
  unit: string;
}

export const PerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({ metrics, unit }) => {
  const {
    riseTime,
    settlingTime,
    overshootPercent,
    peakValue,
    peakTime,
    steadyStateError,
    isStable,
    isOscillating,
    dampingRatioEst,
  } = metrics;

  // Diagnostic feedback logic
  let diagnosisText = '양호한 응답 제어 상태입니다.';
  let diagnosisType: 'success' | 'warning' | 'error' = 'success';

  if (!isStable) {
    diagnosisText = '시스템이 발산하거나 제어 불능 상태입니다. Kp 및 Ki를 낮추세요!';
    diagnosisType = 'error';
  } else if (isOscillating) {
    diagnosisText = '지속적인 진동이 감지됩니다. Kd를 증가시키거나 Kp를 낮추어 감쇠력을 확보하세요.';
    diagnosisType = 'warning';
  } else if (overshootPercent > 25) {
    diagnosisText = `오버슈트(${overshootPercent.toFixed(1)}%)가 큽니다. Kd(미분 이득)를 높여 제동을 걸거나 Kp를 줄이세요.`;
    diagnosisType = 'warning';
  } else if (steadyStateError > 0.5) {
    diagnosisText = `정상 상태 오차(${steadyStateError.toFixed(2)}${unit})가 남아있습니다. Ki(적분 이득)를 추가하여 오차를 0으로 수렴시키세요.`;
    diagnosisType = 'warning';
  } else if (riseTime !== null && riseTime > 8) {
    diagnosisText = '응답 속도가 다소 느립니다. Kp(비례 이득)를 높이면 더 빠르게 목표치에 도달합니다.';
    diagnosisType = 'warning';
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-200 tracking-wide uppercase">
            과도 응답 지표 (Step Response Metrics)
          </h3>
        </div>

        {/* Stability Status Badge */}
        <div className="flex items-center gap-1.5">
          {diagnosisType === 'success' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> 안정적 (Stable)
            </span>
          )}
          {diagnosisType === 'warning' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              <AlertTriangle className="w-3 h-3" /> 주의 (Tuning Needed)
            </span>
          )}
          {diagnosisType === 'error' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              <AlertCircle className="w-3 h-3" /> 발산 (Unstable)
            </span>
          )}
        </div>
      </div>

      {/* Grid of Key Numerical Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Rise Time Tr */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>상승 시간 (Tr)</span>
            <Clock className="w-3 h-3 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-100 tabular-nums">
            {riseTime !== null ? `${riseTime}s` : '계측 중...'}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">10% → 90% 도달</span>
        </div>

        {/* Settling Time Ts */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>정착 시간 (Ts)</span>
            <Target className="w-3 h-3 text-slate-500" />
          </div>
          <div className="text-sm font-bold font-mono text-slate-100 tabular-nums">
            {settlingTime !== null ? `${settlingTime}s` : '정착 대기'}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">±2% 허용 오차대 진입</span>
        </div>

        {/* Max Overshoot Mp */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>최대 오버슈트 (Mp)</span>
            <Zap className="w-3 h-3 text-slate-500" />
          </div>
          <div
            className={`text-sm font-bold font-mono tabular-nums ${
              overshootPercent > 20
                ? 'text-rose-400'
                : overshootPercent > 5
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {overshootPercent.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            피크: {peakValue.toFixed(1)} {unit}
          </span>
        </div>

        {/* Steady-State Error Ess */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span>정상 상태 오차 (Ess)</span>
            <Sparkles className="w-3 h-3 text-slate-500" />
          </div>
          <div
            className={`text-sm font-bold font-mono tabular-nums ${
              steadyStateError > 0.5 ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {steadyStateError.toFixed(3)} {unit}
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            {dampingRatioEst !== null ? `감쇠비 ζ ≈ ${dampingRatioEst}` : '최종 잔류 오차'}
          </span>
        </div>
      </div>

      {/* Engineer Diagnostic Advice Banner */}
      <div
        className={`px-3 py-2 rounded-lg text-xs flex items-start gap-2 border ${
          diagnosisType === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : diagnosisType === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}
      >
        <span className="mt-0.5 font-bold">💡 제어 진단:</span>
        <span className="leading-relaxed flex-1">{diagnosisText}</span>
      </div>
    </div>
  );
};
