import React from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                PID 제어기 이론 및 실전 튜닝 가이드
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Proportional-Integral-Derivative 제어의 핵심 메커니즘과 실무 팁
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
          {/* PID Equation */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
              기본 수식 (Standard PID Formula)
            </h3>
            <div className="font-mono text-center text-sm sm:text-base py-2 text-slate-100 bg-slate-900/80 rounded-lg border border-slate-800">
              u(t) = K_p · e(t) + K_i ∫ e(τ) dτ + K_d · (de(t) / dt)
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              e(t) = r(t) - y(t) : 현재 오차 (목표값 - 현재 공정값)
            </p>
          </div>

          {/* 3 Pillars: P, I, D */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-red-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                <h4 className="font-bold text-red-300 text-sm">P (비례 제어)</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                현재 오차의 크기에 비례하여 힘을 가합니다. 반응 속도를 빠르게 하지만, P만으로는 외란이나 마찰을 극복하지 못해 <strong className="text-red-400">정상 상태 오차(Offset)</strong>가 잔류합니다.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <h4 className="font-bold text-emerald-300 text-sm">I (적분 제어)</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                과거의 누적된 오차를 시간에 따라 합산합니다. 작은 오차라도 시간이 지나면 힘이 커지므로 <strong className="text-emerald-400">정상 상태 오차를 0으로 완벽히 제거</strong>합니다. 단, 과도하면 오버슈트와 와인드업이 발생합니다.
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <h4 className="font-bold text-purple-300 text-sm">D (미분 제어)</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                오차의 변화율(속도)을 감지하여 미래를 예측합니다. 목표값에 접근할 때 <strong className="text-purple-400">브레이크(제동력)</strong>를 걸어 오버슈트를 억제하고 진동을 안정화합니다. 고주파 센서 노이즈 필터링이 필수입니다.
              </p>
            </div>
          </div>

          {/* Parameter Effects Matrix Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
              게인 증가 시 응답 특성 변화표
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono">
                  <tr>
                    <th className="p-2.5">파라미터 증가</th>
                    <th className="p-2.5">상승 시간 (Rise Time)</th>
                    <th className="p-2.5">오버슈트 (Overshoot)</th>
                    <th className="p-2.5">정착 시간 (Settling Time)</th>
                    <th className="p-2.5">정상 오차 (SS Error)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                  <tr>
                    <td className="p-2.5 font-bold text-red-400">Kp 증가</td>
                    <td className="p-2.5 text-emerald-400 font-medium">감소 (빨라짐)</td>
                    <td className="p-2.5 text-rose-400 font-medium">증가 (위험)</td>
                    <td className="p-2.5 text-slate-300">미세 변화</td>
                    <td className="p-2.5 text-emerald-400 font-medium">감소</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-emerald-400">Ki 증가</td>
                    <td className="p-2.5 text-emerald-400 font-medium">감소 (빨라짐)</td>
                    <td className="p-2.5 text-rose-400 font-medium">증가 (위험)</td>
                    <td className="p-2.5 text-rose-400 font-medium">증가 (오래 걸림)</td>
                    <td className="p-2.5 text-emerald-400 font-bold">완전 제거 (0)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-purple-400">Kd 증가</td>
                    <td className="p-2.5 text-slate-300">미세 변화</td>
                    <td className="p-2.5 text-emerald-400 font-bold">감소 (안정화)</td>
                    <td className="p-2.5 text-emerald-400 font-medium">감소 (개선)</td>
                    <td className="p-2.5 text-slate-400">영향 없음</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Industrial Features */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              실무 필수 기능 2가지
            </h3>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs flex gap-3">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">안티 와인드업 (Anti-Windup):</strong>
                <p className="text-slate-400 mt-0.5">
                  모터나 히터가 100% 한계에 도달했는데도 오차가 남아있으면 적분값이 무한히 누적되어 정지 명령 후에도 한참 동안 복구되지 않는 현상을 차단합니다.
                </p>
              </div>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 text-xs flex gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100">미분 킥 방지 (Derivative on Measurement):</strong>
                <p className="text-slate-400 mt-0.5">
                  목표값(SP)이 갑자기 계단형으로 점프할 때 오차의 순간 미분값이 무한대로 튀는 현상(스파이크)을 방지하기 위해, 오차 대신 측정값(PV)의 변화율로 미분항을 계산합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
