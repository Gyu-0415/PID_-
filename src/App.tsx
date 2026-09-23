/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PlantModelId, PIDParameters, SimulationSample, StepResponseMetrics, OptimalProfile } from './types/pid';
import { PLANT_CONFIGS, getInitialPlantState, PlantState } from './physics/plants';
import { runProcessSimulation, generate3WayComparison, ProcessSimulationResult } from './engine/simulationSolver';
import { PhysicalPlantCanvas } from './components/PhysicalPlantCanvas';
import { OscilloscopeGraph } from './components/OscilloscopeGraph';
import { PerformanceMetricsCard } from './components/PerformanceMetricsCard';
import { TuningDeck } from './components/TuningDeck';
import { OptimalProfilesPanel } from './components/OptimalProfilesPanel';
import { GuidedExperimentTrack, GUIDED_STEPS } from './components/GuidedExperimentTrack';
import { CodeExportModal } from './components/CodeExportModal';
import { TheoryModal } from './components/TheoryModal';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  BookOpen,
  Zap,
  Target,
  Plane,
  Car,
  Waves,
  Thermometer,
  Compass,
  Cpu,
  Layers,
  Sparkles,
  Monitor,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function App() {
  // 1. Plant Selection
  const [activePlantId, setActivePlantId] = useState<PlantModelId>('drone');
  const plantConfig = PLANT_CONFIGS[activePlantId];

  // 2. Parameters & Setpoint
  const [params, setParams] = useState<PIDParameters>(plantConfig.defaultParams);
  const [setpoint, setSetpoint] = useState<number>(plantConfig.setpointDefault);
  const [durationSec, setDurationSec] = useState<number>(10);

  // 3. Active Disturbance Event
  const [disturbanceEvent, setDisturbanceEvent] = useState<{
    id: string;
    magnitude: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // 4. Playback State (Fixed Time Domain 0 to durationSec)
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [previousSamples, setPreviousSamples] = useState<SimulationSample[] | null>(null);
  const [currentGuidedStep, setCurrentGuidedStep] = useState<number | null>(null);
  const [showPhysicalMonitor, setShowPhysicalMonitor] = useState<boolean>(true);

  // 5. Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState<boolean>(false);

  // 6. Compute Full Process Simulation & 3-Way Comparison deterministically
  const simResult: ProcessSimulationResult = useMemo(() => {
    return runProcessSimulation(
      activePlantId,
      params,
      setpoint,
      disturbanceEvent
        ? {
            magnitude: disturbanceEvent.magnitude,
            startTime: disturbanceEvent.startTime,
            duration: disturbanceEvent.duration,
          }
        : null,
      durationSec,
      0.02
    );
  }, [activePlantId, params, setpoint, disturbanceEvent, durationSec]);

  // Precompute 3-way baseline comparisons (P vs PI vs PID)
  const comparison3Way = useMemo(() => {
    return generate3WayComparison(activePlantId, params, setpoint, durationSec);
  }, [activePlantId, params, setpoint, durationSec]);

  // Current sample at currentTime for physical canvas
  const currentSample = useMemo(() => {
    if (!simResult.samples.length) return null;
    const match = simResult.samples.find((s) => Math.abs(s.time - currentTime) < 0.025);
    return match || simResult.samples[simResult.samples.length - 1];
  }, [simResult, currentTime]);

  // Active disturbance value right now
  const currentDisturbanceValue = currentSample?.disturbance ?? 0;

  // 7. Smooth Animated Playback Loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.04; // smooth animation steps
        if (next >= durationSec) {
          setIsPlaying(false);
          return durationSec;
        }
        return Number(next.toFixed(2));
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isPlaying, durationSec]);

  // Handlers
  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (currentTime >= durationSec) {
      handleRestart();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(durationSec, time)));
  };

  const handleChangeDuration = (newDur: number) => {
    setDurationSec(newDur);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Reset entire plant
  const handleReset = useCallback(
    (newPlantId?: PlantModelId) => {
      const pId = newPlantId || activePlantId;
      const config = PLANT_CONFIGS[pId];

      setParams(config.defaultParams);
      setSetpoint(config.setpointDefault);
      setDisturbanceEvent(null);
      setPreviousSamples(null);
      setCurrentGuidedStep(null);
      setCurrentTime(0);
      setIsPlaying(true);
    },
    [activePlantId]
  );

  // Switch plant
  const handlePlantChange = (pId: PlantModelId) => {
    setActivePlantId(pId);
    handleReset(pId);
  };

  // Setpoint change
  const handleSetpointStep = (newSp: number) => {
    if (simResult.samples.length > 0) {
      setPreviousSamples([...simResult.samples]);
    }
    setSetpoint(newSp);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Parameter change (snapshot previous curve for ghost comparison)
  const handleParamsChange = (newParams: Partial<PIDParameters>) => {
    if (simResult.samples.length > 0) {
      setPreviousSamples([...simResult.samples]);
    }
    setParams((prev) => ({ ...prev, ...newParams }));
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Apply optimal profile for current plant
  const handleApplyProfile = (prof: OptimalProfile) => {
    if (simResult.samples.length > 0) {
      setPreviousSamples([...simResult.samples]);
    }
    setParams((prev) => ({ ...prev, ...prof.params }));
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Trigger disturbance at current time or t=3s
  const handleTriggerDisturbance = (dist: { id: string; magnitude: number }) => {
    const triggerT = Math.max(1.5, Math.min(durationSec - 2.5, currentTime));
    setDisturbanceEvent({
      id: dist.id,
      magnitude: dist.magnitude,
      startTime: triggerT,
      duration: 2.2,
    });
    setCurrentTime(Math.max(0, triggerT - 0.5));
    setIsPlaying(true);
  };

  // Guided step course
  const handleSelectGuidedStep = (stepIdx: number) => {
    setCurrentGuidedStep(stepIdx);
    const stepDef = GUIDED_STEPS[stepIdx];

    if (simResult.samples.length > 0) {
      setPreviousSamples([...simResult.samples]);
    }

    if (stepIdx === 3) {
      // Disturbance step
      const dist = plantConfig.disturbances[0];
      if (dist) {
        handleTriggerDisturbance(dist);
      }
    } else {
      const newP = stepDef.getParams(params, activePlantId);
      setParams((prev) => ({ ...prev, ...newP }));
      setDisturbanceEvent(null);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  // Plant icon map
  const plantIcons: Record<PlantModelId, React.ReactNode> = {
    drone: <Plane className="w-4 h-4 text-cyan-400" />,
    car: <Car className="w-4 h-4 text-emerald-400" />,
    tank: <Waves className="w-4 h-4 text-sky-400" />,
    temperature: <Thermometer className="w-4 h-4 text-rose-400" />,
    pendulum: <Compass className="w-4 h-4 text-purple-400" />,
    motor: <Cpu className="w-4 h-4 text-amber-400" />,
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <a href="/" className="text-base font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></div>
          <span>PID Simulator Lab</span>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setIsTheoryModalOpen(true)}
            className="hover:text-slate-100 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>제어 이론 가이드</span>
          </button>
          <button
            onClick={handleRestart}
            className="hover:text-slate-100 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>처음부터 재실행</span>
          </button>
          <button
            onClick={() => handleReset()}
            className="hover:text-slate-100 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값 초기화</span>
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="hover:text-slate-100 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>코드 패키지</span>
          </button>
        </nav>

        {/* Primary Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm ${
              isPlaying
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? '일시정지' : '시뮬레이션 실행'}</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-500 transition-colors whitespace-nowrap shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>패키지 내보내기</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        {/* Plant Model Selection Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <span className="text-xs font-medium text-slate-400 px-2 flex items-center gap-1 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> 대상 플랜트:
            </span>
            {(['drone', 'car', 'tank', 'temperature', 'pendulum', 'motor'] as PlantModelId[]).map((pId) => {
              const cfg = PLANT_CONFIGS[pId];
              const isSelected = activePlantId === pId;
              return (
                <button
                  key={pId}
                  onClick={() => handlePlantChange(pId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {plantIcons[pId]}
                  <span>{cfg.name.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            {/* Toggle Physical Canvas Monitor */}
            <button
              onClick={() => setShowPhysicalMonitor(!showPhysicalMonitor)}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                showPhysicalMonitor
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{showPhysicalMonitor ? '물리 뷰 축소' : '물리 뷰 보기'}</span>
            </button>
          </div>
        </div>

        {/* 1. 1분 완성: PID 그래프 원리 4단계 실험 코스 */}
        <GuidedExperimentTrack
          currentStep={currentGuidedStep}
          onSelectStep={handleSelectGuidedStep}
          plant={plantConfig}
        />

        {/* 2. HERO: 고정 제한시간 기반 PID 계단 응답 분석 그래프 (Fixed 0 to T) */}
        <div className="w-full">
          <OscilloscopeGraph
            history={simResult.samples.filter((s) => s.time <= currentTime)}
            allSamples={simResult.samples}
            previousSamples={previousSamples}
            comparison3Way={comparison3Way}
            metrics={simResult.metrics}
            unit={plantConfig.unit}
            variableName={plantConfig.variableName}
            outMin={plantConfig.outMin}
            outMax={plantConfig.outMax}
            durationSec={durationSec}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onRestart={handleRestart}
            onSeek={handleSeek}
            onChangeDuration={handleChangeDuration}
          />
        </div>

        {/* 3. Lower Control & Metrics Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (5 cols): Metrics, Step Controls, Optional Physical View */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* 과도 응답 지표 카드 */}
            <PerformanceMetricsCard metrics={simResult.metrics} unit={plantConfig.unit} />

            {/* 목표값(Setpoint) 설정 바 */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>목표값 설정 (Setpoint, SP)</span>
                </div>
                <div className="text-xs font-mono text-amber-400 font-bold">
                  {setpoint.toFixed(1)} {plantConfig.unit}
                </div>
              </div>

              <input
                type="range"
                min={plantConfig.minSetpoint}
                max={plantConfig.maxSetpoint}
                step={(plantConfig.maxSetpoint - plantConfig.minSetpoint) / 100}
                value={setpoint}
                onChange={(e) => handleSetpointStep(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />

              {/* Step Presets buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">계단 응답 프리셋:</span>
                {plantConfig.stepPresets.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSetpointStep(val)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors ${
                      setpoint === val
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {val} {plantConfig.unit}
                  </button>
                ))}
              </div>
            </div>

            {/* 외란 주입 바 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 외란 주입 테스트:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {plantConfig.disturbances.map((dist) => (
                  <button
                    key={dist.id}
                    onClick={() => handleTriggerDisturbance(dist)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      disturbanceEvent?.id === dist.id
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/20'
                    }`}
                    title={dist.description}
                  >
                    {dist.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Physical Plant Monitor (Synchronized to currentTime) */}
            {showPhysicalMonitor && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                    <span>실시간 물리 플랜트 모니터 (동기화)</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-300">
                    PV: {currentSample?.pv.toFixed(1) ?? '0.0'} {plantConfig.unit}
                  </span>
                </div>
                <div className="h-[180px] w-full">
                  <PhysicalPlantCanvas
                    plantId={activePlantId}
                    pv={currentSample?.pv ?? 0}
                    setpoint={setpoint}
                    output={currentSample?.output ?? 0}
                    disturbance={currentDisturbanceValue}
                    isPaused={!isPlaying}
                    onSetpointChange={handleSetpointStep}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column (7 cols): Optimal PID Tuning Profiles & Full Gain Tuning Deck */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <OptimalProfilesPanel
              plantId={activePlantId}
              currentParams={params}
              onApplyProfile={handleApplyProfile}
            />
            <TuningDeck
              params={params}
              onParamsChange={handleParamsChange}
              onReset={() => handleReset()}
              plant={plantConfig}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 mt-auto py-4 px-6">
        <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">PID Simulator Lab</span>
            <span>·</span>
            <span>고정 전공정 계단 응답 해석 및 PID 교육용 시뮬레이터</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsTheoryModalOpen(true)}
              className="hover:text-slate-200 transition-colors"
            >
              제어 이론 가이드
            </button>
            <span>·</span>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="hover:text-slate-200 transition-colors text-cyan-400"
            >
              C++ / Python / Arduino 코드 내보내기
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CodeExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        params={params}
        plant={plantConfig}
      />

      <TheoryModal
        isOpen={isTheoryModalOpen}
        onClose={() => setIsTheoryModalOpen(false)}
      />
    </div>
  );
}
