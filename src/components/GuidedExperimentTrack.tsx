import React from 'react';
import { PIDParameters, PlantConfig } from '../types/pid';
import { ArrowRight, Play, CheckCircle2, Sparkles, Zap, AlertCircle } from 'lucide-react';

export interface GuidedStep {
  step: number;
  title: string;
  tag: string;
  badgeColor: string;
  description: string;
  keyGraphObservation: string;
  getParams: (base: PIDParameters, plantId: string) => Partial<PIDParameters>;
}

export const GUIDED_STEPS: GuidedStep[] = [
  {
    step: 1,
    title: 'P만 켰을 때 (비례 제어)',
    tag: '정상 상태 오차 잔류',
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
    description: '오차가 클수록 세게 반응하지만, 목표 근처에서 힘이 빠져 목표값에 도달하지 못하고 아래에 멈춥니다.',
    keyGraphObservation: '그래프가 목표선(노란 점선)에 미치지 못하고 평평하게 굳어버리는 잔류 오차를 확인하세요.',
    getParams: (base, plantId) => {
      const pGains: Record<string, number> = {
        drone: 5.0,
        car: 2.5,
        tank: 2.0,
        temperature: 3.5,
        pendulum: 15.0,
        motor: 0.6,
      };
      return {
        kp: pGains[plantId] || 3.0,
        ki: 0,
        kd: 0,
      };
    },
  },
  {
    step: 2,
    title: 'I 추가 (비례 + 적분)',
    tag: '오차 제거 & 오버슈트 발생',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: '과거에 누적된 오차를 시간으로 모아 끝까지 밀어붙여 정상 오차를 0으로 완벽히 없앱니다. 단, 관성으로 목표치를 훌쩍 넘깁니다.',
    keyGraphObservation: '곡선이 목표선에 도달하지만, 위로 볼록하게 솟구치는 오버슈트(치솟음) 봉우리가 생기는 것을 확인하세요.',
    getParams: (base, plantId) => {
      const pGains: Record<string, { kp: number; ki: number }> = {
        drone: { kp: 5.0, ki: 3.0 },
        car: { kp: 2.5, ki: 1.2 },
        tank: { kp: 2.0, ki: 0.6 },
        temperature: { kp: 3.5, ki: 0.3 },
        pendulum: { kp: 15.0, ki: 2.5 },
        motor: { kp: 0.6, ki: 0.2 },
      };
      const g = pGains[plantId] || { kp: 3.0, ki: 1.0 };
      return {
        kp: g.kp,
        ki: g.ki,
        kd: 0,
      };
    },
  },
  {
    step: 3,
    title: 'D 추가 (완전한 PID 제어)',
    tag: '오버슈트 억제 & 안정 정착',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    description: '접근 속도(미래 변화율)를 계산하여 미리 브레이크를 겁니다. 치솟는 오버슈트 봉우리를 깎아내고 부드럽게 안착시킵니다.',
    keyGraphObservation: '2단계 점선과 비교해 보세요! 솟구치던 봉우리가 얌전해지고 목표선에 빠르게 달라붙습니다.',
    getParams: (base, plantId) => {
      const pGains: Record<string, { kp: number; ki: number; kd: number }> = {
        drone: { kp: 6.5, ki: 2.2, kd: 4.8 },
        car: { kp: 3.2, ki: 0.8, kd: 0.8 },
        tank: { kp: 2.8, ki: 0.45, kd: 1.2 },
        temperature: { kp: 4.5, ki: 0.15, kd: 6.0 },
        pendulum: { kp: 18.0, ki: 1.5, kd: 7.5 },
        motor: { kp: 0.85, ki: 0.12, kd: 0.25 },
      };
      const g = pGains[plantId] || { kp: 3.5, ki: 1.0, kd: 1.5 };
      return {
        kp: g.kp,
        ki: g.ki,
        kd: g.kd,
      };
    },
  },
  {
    step: 4,
    title: '외란 충격 복구 테스트',
    tag: '외란 극복 & 강인성',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: '외력(돌풍, 언덕길, 누수)으로 일시적 오차가 발생해도 PID가 즉각 반작용 힘을 만들어 다시 목표선으로 복귀시킵니다.',
    keyGraphObservation: '외란 충격 순간 아래로 푹 꺼진 곡선이 PID 제어로 인해 신속하게 다시 원위치로 복구되는 모습을 확인하세요.',
    getParams: (base, plantId) => {
      return base;
    },
  },
];

interface GuidedExperimentTrackProps {
  currentStep: number | null;
  onSelectStep: (stepIndex: number) => void;
  plant: PlantConfig;
}

export const GuidedExperimentTrack: React.FC<GuidedExperimentTrackProps> = ({
  currentStep,
  onSelectStep,
  plant,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            1분 완성: PID 그래프 원리 4단계 실험 코스 (Interactive Lab Course)
          </h2>
        </div>
        <span className="text-[11px] text-slate-400">
          각 단계를 클릭하면 파라미터가 변경되고 그래프 곡선이 실시간 비교됩니다
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GUIDED_STEPS.map((step, idx) => {
          const isCurrent = currentStep === idx;
          return (
            <button
              key={step.step}
              onClick={() => onSelectStep(idx)}
              className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 group relative overflow-hidden ${
                isCurrent
                  ? 'bg-slate-850 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold font-mono text-cyan-400">
                  Step {step.step}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${step.badgeColor}`}>
                  {step.tag}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-snug mt-1">
                  {step.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 w-full text-[10px] text-cyan-400/90 flex items-center gap-1 font-mono">
                <ArrowRight className="w-3 h-3 shrink-0" />
                <span className="truncate">{step.keyGraphObservation}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
