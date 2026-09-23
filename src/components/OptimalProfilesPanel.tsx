import React from 'react';
import { PlantModelId, PIDParameters, OptimalProfile } from '../types/pid';
import { OPTIMAL_PROFILES_BY_PLANT } from '../physics/optimalProfiles';
import { Sparkles, Check, ArrowRight, ShieldCheck, Zap, Award, HelpCircle } from 'lucide-react';

interface OptimalProfilesPanelProps {
  plantId: PlantModelId;
  currentParams: PIDParameters;
  onApplyProfile: (profile: OptimalProfile) => void;
}

export const OptimalProfilesPanel: React.FC<OptimalProfilesPanelProps> = ({
  plantId,
  currentParams,
  onApplyProfile,
}) => {
  const profiles = OPTIMAL_PROFILES_BY_PLANT[plantId] || [];

  // Check if current parameters closely match a profile
  const isProfileActive = (p: OptimalProfile) => {
    const kpDiff = Math.abs(currentParams.kp - (p.params.kp ?? currentParams.kp));
    const kiDiff = Math.abs(currentParams.ki - (p.params.ki ?? currentParams.ki));
    const kdDiff = Math.abs(currentParams.kd - (p.params.kd ?? currentParams.kd));
    return kpDiff < 0.05 && kiDiff < 0.05 && kdDiff < 0.05;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>현재 공정 전용 최적 PID 추천 팩</span>
              <span className="text-[10px] text-cyan-400 font-mono font-normal">
                (Optimal Tuning Profiles)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              이 플랜트의 물리적 특성(질량, 관성, 시간 지연, 외란)에 맞춰 엔지니어가 사전 튜닝한 4대 최적 세팅입니다.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 4 Optimal Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {profiles.map((prof) => {
          const active = isProfileActive(prof);
          const isGolden = prof.id === 'golden';

          return (
            <div
              key={prof.id}
              onClick={() => onApplyProfile(prof)}
              className={`relative rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border text-left ${
                active
                  ? 'bg-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                  : isGolden
                  ? 'bg-slate-950/90 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-900/60'
                  : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              {/* Top Tag & Active Status */}
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${prof.badgeColor}`}
                >
                  {prof.tag}
                </span>

                {active ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    <Check className="w-3 h-3 stroke-[3]" /> 적용 중
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-200">
                    클릭하여 적용
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mb-2">
                <h4
                  className={`text-xs font-bold ${
                    active ? 'text-cyan-300' : isGolden ? 'text-amber-200' : 'text-slate-200'
                  }`}
                >
                  {prof.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {prof.description}
                </p>
              </div>

              {/* Key Gain Readout (Kp, Ki, Kd) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 mb-2 font-mono text-[11px] grid grid-cols-3 gap-1 text-center">
                <div className="flex flex-col">
                  <span className="text-[9px] text-red-400 font-sans">Kp</span>
                  <span className="font-bold text-slate-200">{prof.params.kp}</span>
                </div>
                <div className="flex flex-col border-x border-slate-800">
                  <span className="text-[9px] text-emerald-400 font-sans">Ki</span>
                  <span className="font-bold text-slate-200">{prof.params.ki}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-purple-400 font-sans">Kd</span>
                  <span className="font-bold text-slate-200">{prof.params.kd}</span>
                </div>
              </div>

              {/* Expected Response Specs */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80 mb-2">
                <div className="flex justify-between">
                  <span>상승 시간:</span>
                  <span className="font-mono font-medium text-slate-300">
                    {prof.expectedResult.riseTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>오버슈트:</span>
                  <span
                    className={`font-mono font-medium ${
                      prof.expectedResult.overshoot === '0.0%' ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                  >
                    {prof.expectedResult.overshoot}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>정착 시간:</span>
                  <span className="font-mono font-medium text-slate-300">
                    {prof.expectedResult.settlingTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>안정성:</span>
                  <span className="font-medium text-cyan-300">
                    {prof.expectedResult.stability}
                  </span>
                </div>
              </div>

              {/* Why Optimal Engineering Note */}
              <div className="bg-slate-950/80 border border-slate-800/70 rounded p-1.5 text-[10px] text-slate-400 leading-tight">
                <strong className="text-slate-300">💡 튜닝 근거:</strong> {prof.whyOptimal}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
