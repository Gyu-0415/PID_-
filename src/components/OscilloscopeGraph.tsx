import React, { useRef, useEffect, useState } from 'react';
import { SimulationSample, StepResponseMetrics } from '../types/pid';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Sliders,
  Layers,
  HelpCircle,
  Clock,
  Zap,
  Check,
  Eye,
  EyeOff,
  Flame,
  AlertTriangle,
} from 'lucide-react';

interface BenchmarkCurves {
  onOff: SimulationSample[];
  pOnly: SimulationSample[];
  piOnly: SimulationSample[];
  pidCurrent: SimulationSample[];
}

interface OscilloscopeGraphProps {
  history: SimulationSample[];
  allSamples: SimulationSample[];
  previousSamples?: SimulationSample[] | null;
  comparison3Way?: BenchmarkCurves | null;
  metrics: StepResponseMetrics;
  unit: string;
  variableName: string;
  outMin: number;
  outMax: number;
  durationSec: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onChangeDuration: (dur: number) => void;
}

export const OscilloscopeGraph: React.FC<OscilloscopeGraphProps> = ({
  history,
  allSamples,
  previousSamples,
  comparison3Way,
  metrics,
  unit,
  variableName,
  outMin,
  outMax,
  durationSec,
  currentTime,
  isPlaying,
  onTogglePlay,
  onRestart,
  onSeek,
  onChangeDuration,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Curve Visibility Toggles (ON / OFF)
  const [showPIDCurve, setShowPIDCurve] = useState<boolean>(true);
  const [showOnOffCurve, setShowOnOffCurve] = useState<boolean>(false);
  const [showPOnlyCurve, setShowPOnlyCurve] = useState<boolean>(false);
  const [showPICurve, setShowPICurve] = useState<boolean>(false);
  const [showGhostCurve, setShowGhostCurve] = useState<boolean>(true);
  const [showSettlingBand, setShowSettlingBand] = useState<boolean>(true);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showPIDComponents, setShowPIDComponents] = useState<boolean>(true);

  // Hover state
  const [hoverSample, setHoverSample] = useState<SimulationSample | null>(null);
  const [hoverXRatio, setHoverXRatio] = useState<number | null>(null);

  const isCompleted = currentTime >= durationSec - 0.02;

  // Active sample at currentTime
  const currentSample =
    allSamples.find((s) => Math.abs(s.time - currentTime) < 0.03) ||
    allSamples[allSamples.length - 1] ||
    null;

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (allSamples.length === 0) {
      ctx.restore();
      return;
    }

    // Graph Layout Constants
    const padL = 54;
    const padR = 24;
    const padT = 24;
    const padB = 28;

    const totalH = height - padT - padB;
    const topH = showPIDComponents ? totalH * 0.64 : totalH;
    const splitGap = 16;
    const botH = showPIDComponents ? totalH * 0.36 - splitGap : 0;
    const botY = padT + topH + splitGap;
    const plotW = width - padL - padR;

    // Determine Y range across all active datasets
    let minPv = Infinity;
    let maxPv = -Infinity;

    for (const s of allSamples) {
      minPv = Math.min(minPv, s.pv, s.setpoint);
      maxPv = Math.max(maxPv, s.pv, s.setpoint);
    }

    if (showOnOffCurve && comparison3Way?.onOff) {
      for (const s of comparison3Way.onOff) {
        minPv = Math.min(minPv, s.pv);
        maxPv = Math.max(maxPv, s.pv);
      }
    }

    if (showPOnlyCurve && comparison3Way?.pOnly) {
      for (const s of comparison3Way.pOnly) {
        minPv = Math.min(minPv, s.pv);
        maxPv = Math.max(maxPv, s.pv);
      }
    }

    if (showPICurve && comparison3Way?.piOnly) {
      for (const s of comparison3Way.piOnly) {
        minPv = Math.min(minPv, s.pv);
        maxPv = Math.max(maxPv, s.pv);
      }
    }

    if (showGhostCurve && previousSamples && previousSamples.length > 0) {
      for (const s of previousSamples) {
        minPv = Math.min(minPv, s.pv);
        maxPv = Math.max(maxPv, s.pv);
      }
    }

    const pvSpan = Math.max(2.0, maxPv - minPv);
    const yMargin = pvSpan * 0.18;
    const topYMin = minPv - yMargin;
    const topYMax = maxPv + yMargin;

    // Fixed Time Domain coordinates (0 to durationSec)
    const getX = (t: number) => padL + (Math.max(0, Math.min(durationSec, t)) / durationSec) * plotW;
    const getTopY = (v: number) => padT + topH - ((v - topYMin) / (topYMax - topYMin)) * topH;

    // 1. Background Grid & Framing
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(padL, padT, plotW, topH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    // Horizontal Y Grid lines
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = topYMin + (i / yTicks) * (topYMax - topYMin);
      const y = getTopY(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), padL - 8, y + 3);
    }

    // 2. Settling Corridor (+/- 2% Band)
    const targetSp = allSamples[0]?.setpoint ?? 10;
    if (showSettlingBand) {
      const bandSpan = Math.max(0.3, Math.abs(targetSp) * 0.02);
      const yBandTop = getTopY(targetSp + bandSpan);
      const yBandBot = getTopY(targetSp - bandSpan);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(padL, Math.min(yBandTop, yBandBot), plotW, Math.abs(yBandBot - yBandTop));
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.setLineDash([2, 4]);
      ctx.strokeRect(padL, Math.min(yBandTop, yBandBot), plotW, Math.abs(yBandBot - yBandTop));
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('±2% 안전 정착 구역 (Settling Corridor)', padL + 6, Math.min(yBandTop, yBandBot) - 4);
    }

    // 3. Target Setpoint Line (Amber Dashed)
    ctx.save();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.0;
    ctx.setLineDash([6, 4]);
    const spY = getTopY(targetSp);
    ctx.beginPath();
    ctx.moveTo(padL, spY);
    ctx.lineTo(padL + plotW, spY);
    ctx.stroke();
    ctx.restore();

    // 4. Ghost Curve (Previous Parameter Run)
    if (showGhostCurve && previousSamples && previousSamples.length > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < previousSamples.length; i++) {
        const s = previousSamples[i];
        if (s.time > durationSec) break;
        const x = getX(s.time);
        const y = getTopY(s.pv);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. ON/OFF (Bang-Bang Relay) Control Curve (Orange Dashed)
    if (showOnOffCurve && comparison3Way?.onOff) {
      const onOffVisible = comparison3Way.onOff.filter((s) => s.time <= currentTime);
      if (onOffVisible.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#f97316'; // Vibrant orange
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        for (let i = 0; i < onOffVisible.length; i++) {
          const s = onOffVisible[i];
          const x = getX(s.time);
          const y = getTopY(s.pv);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // Callout pin on ON/OFF curve
        if (showAnnotations && onOffVisible.length > 30) {
          const peakSample = onOffVisible.reduce((max, s) => (s.pv > max.pv ? s : max), onOffVisible[0]);
          const px = getX(peakSample.time);
          const py = getTopY(peakSample.pv);

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          const note = '⚡ ON/OFF 제어: 영구 헌팅 진동 발생';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
          ctx.beginPath();
          ctx.roundRect(px - 10, py - 20, 190, 16, 3);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(note, px - 6, py - 8);
        }
      }
    }

    // 6. P-Only Control Curve (Red Dashed)
    if (showPOnlyCurve && comparison3Way?.pOnly) {
      const pVisible = comparison3Way.pOnly.filter((s) => s.time <= currentTime);
      if (pVisible.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#ef4444'; // Bright Red
        ctx.lineWidth = 2.2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        for (let i = 0; i < pVisible.length; i++) {
          const s = pVisible[i];
          const x = getX(s.time);
          const y = getTopY(s.pv);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        // Callout annotation for P-only offset
        if (showAnnotations && pVisible.length > 40) {
          const lastP = pVisible[pVisible.length - 1];
          const lx = getX(lastP.time);
          const ly = getTopY(lastP.pv);

          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(lx, ly, 4, 0, Math.PI * 2);
          ctx.fill();

          const offsetNote = '⚠️ P만 사용: 정상 잔여 오차(Offset)';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.beginPath();
          ctx.roundRect(Math.max(padL + 10, lx - 180), ly + 6, 175, 16, 3);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(offsetNote, Math.max(padL + 14, lx - 176), ly + 18);
        }
      }
    }

    // 7. PI Control Curve (Emerald Dashed)
    if (showPICurve && comparison3Way?.piOnly) {
      const piVisible = comparison3Way.piOnly.filter((s) => s.time <= currentTime);
      if (piVisible.length > 0) {
        ctx.save();
        ctx.strokeStyle = '#10b981'; // Emerald
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        for (let i = 0; i < piVisible.length; i++) {
          const s = piVisible[i];
          const x = getX(s.time);
          const y = getTopY(s.pv);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // 8. Currently Simulated Active PID Curve (Cyan Solid)
    const visibleSamples = allSamples.filter((s) => s.time <= currentTime);

    // Error area shading (Only if PID curve is shown)
    if (showPIDCurve && visibleSamples.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < visibleSamples.length; i++) {
        const s = visibleSamples[i];
        const x = getX(s.time);
        const y = getTopY(s.setpoint);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = visibleSamples.length - 1; i >= 0; i--) {
        const s = visibleSamples[i];
        const x = getX(s.time);
        const y = getTopY(s.pv);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fill();
      ctx.restore();
    }

    // Active Process Variable PV Line
    if (showPIDCurve && visibleSamples.length > 0) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.0;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < visibleSamples.length; i++) {
        const s = visibleSamples[i];
        const x = getX(s.time);
        const y = getTopY(s.pv);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current Head Dot on PV
      const lastPt = visibleSamples[visibleSamples.length - 1];
      const headX = getX(lastPt.time);
      const headY = getTopY(lastPt.pv);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX, headY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.restore();
    }

    // 9. Educational Annotations on PID Graph
    if (showAnnotations && showPIDCurve && visibleSamples.length > 10) {
      // Overshoot Peak Marker
      if (metrics.peakTime !== null && metrics.peakTime <= currentTime && metrics.overshootPercent > 2.0) {
        const peakX = getX(metrics.peakTime);
        const peakY = getTopY(metrics.peakValue);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(peakX, peakY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const bannerText = `오버슈트 피크 +${metrics.overshootPercent.toFixed(1)}% (Kd로 제동 가능)`;
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const bW = ctx.measureText(bannerText).width;
        const bX = Math.min(padL + plotW - bW - 10, Math.max(padL + 10, peakX - bW / 2));
        const bY = peakY - 16;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bX - 6, bY - 11, bW + 12, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(bannerText, bX, bY + 2);
      }

      // Rise Time Marker (10% to 90%)
      if (metrics.riseTime !== null && metrics.riseTime <= currentTime) {
        const rtX = getX(metrics.riseTime);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(rtX, padT);
        ctx.lineTo(rtX, padT + topH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`상승 시간 ${metrics.riseTime}s (Kp 가속)`, rtX, padT + 12);
      }

      // Settling Marker
      if (isCompleted && metrics.settlingTime !== null) {
        const stX = getX(metrics.settlingTime);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(stX, padT);
        ctx.lineTo(stX, padT + topH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#10b981';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`정착 완료 ${metrics.settlingTime}s`, stX, padT + 26);
      }
    }

    // 10. Bottom Plot: Control Output u(t)
    if (showPIDComponents) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(padL, botY, plotW, botH);

      let botYMin = outMin;
      let botYMax = outMax;
      for (const s of allSamples) {
        botYMin = Math.min(botYMin, s.output, s.pTerm, s.iTerm, s.dTerm);
        botYMax = Math.max(botYMax, s.output, s.pTerm, s.iTerm, s.dTerm);
      }
      const botSpan = Math.max(2.0, botYMax - botYMin);
      const botMargin = botSpan * 0.14;
      const finalBotMin = botYMin - botMargin;
      const finalBotMax = botYMax + botMargin;

      const getBotY = (v: number) =>
        botY + botH - ((v - finalBotMin) / (finalBotMax - finalBotMin)) * botH;

      // Zero axis line
      if (finalBotMin <= 0 && finalBotMax >= 0) {
        const zeroY = getBotY(0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, zeroY);
        ctx.lineTo(padL + plotW, zeroY);
        ctx.stroke();
      }

      // ON/OFF square wave output if active
      if (showOnOffCurve && comparison3Way?.onOff) {
        const onOffVisible = comparison3Way.onOff.filter((s) => s.time <= currentTime);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        for (let i = 0; i < onOffVisible.length; i++) {
          const s = onOffVisible[i];
          const x = getX(s.time);
          const y = getBotY(s.output);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // PID decomposed terms
      if (showPIDCurve) {
        // P-Term
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < visibleSamples.length; i++) {
          const s = visibleSamples[i];
          const x = getX(s.time);
          const y = getBotY(s.pTerm);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // I-Term
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < visibleSamples.length; i++) {
          const s = visibleSamples[i];
          const x = getX(s.time);
          const y = getBotY(s.iTerm);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // D-Term
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < visibleSamples.length; i++) {
          const s = visibleSamples[i];
          const x = getX(s.time);
          const y = getBotY(s.dTerm);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Total Output u(t)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let i = 0; i < visibleSamples.length; i++) {
          const s = visibleSamples[i];
          const x = getX(s.time);
          const y = getBotY(s.output);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(finalBotMax.toFixed(0), padL - 8, botY + 10);
      ctx.fillText(finalBotMin.toFixed(0), padL - 8, botY + botH - 2);

      ctx.textAlign = 'left';
      ctx.fillText(
        showOnOffCurve
          ? '제어 신호 u(t): 흰색(PID 연속 제어) vs 주황색(ON/OFF 풀파워 스위칭)'
          : '제어 신호 u(t) = P(오차 반작용) + I(누적 오차) + D(변화율 제동)',
        padL + 8,
        botY + 12
      );
    }

    // 11. Permanently Fixed Time Axis (0 to durationSec)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const timeAxisY = height - padB;
    ctx.beginPath();
    ctx.moveTo(padL, timeAxisY);
    ctx.lineTo(padL + plotW, timeAxisY);
    ctx.stroke();

    const tTicks = 5;
    for (let i = 0; i <= tTicks; i++) {
      const tVal = (i / tTicks) * durationSec;
      const x = padL + (i / tTicks) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, timeAxisY);
      ctx.lineTo(x, timeAxisY + 4);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${tVal.toFixed(1)}초`, x, timeAxisY + 16);
    }

    // Current Time Progress Needle
    const curX = getX(currentTime);
    ctx.strokeStyle = isCompleted ? 'rgba(16, 185, 129, 0.8)' : 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, height - padB);
    ctx.stroke();

    // Mouse Hover Cursor Line
    if (hoverXRatio !== null) {
      const cursorX = padL + hoverXRatio * plotW;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cursorX, padT);
      ctx.lineTo(cursorX, height - padB);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    allSamples,
    previousSamples,
    comparison3Way,
    durationSec,
    currentTime,
    showPIDCurve,
    showOnOffCurve,
    showPOnlyCurve,
    showPICurve,
    showGhostCurve,
    showSettlingBand,
    showAnnotations,
    showPIDComponents,
    metrics,
    unit,
    variableName,
    outMin,
    outMax,
    hoverXRatio,
    isCompleted,
  ]);

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || allSamples.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const padL = 54;
    const padR = 24;
    const plotW = rect.width - padL - padR;

    if (x < padL || x > rect.width - padR) {
      setHoverXRatio(null);
      setHoverSample(null);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (x - padL) / plotW));
    setHoverXRatio(ratio);
    const targetT = ratio * durationSec;

    let nearest = allSamples[0];
    let minDiff = Math.abs(nearest.time - targetT);
    for (const s of allSamples) {
      const diff = Math.abs(s.time - targetT);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = s;
      }
    }
    setHoverSample(nearest);
  };

  const handleMouseLeave = () => {
    setHoverXRatio(null);
    setHoverSample(null);
  };

  // Find corresponding sample at target hover time for ON/OFF & P-only
  const getSampleAtTime = (list: SimulationSample[] | undefined, t: number) => {
    if (!list || list.length === 0) return null;
    return list.find((s) => Math.abs(s.time - t) < 0.03) || null;
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
      {/* 1. Header: Fixed Process Control & Timeline Scrubber */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status & Playback Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                isCompleted
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                  : isPlaying
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음부터 재실행</span>
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>일시정지</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>실행</span>
                </>
              )}
            </button>

            <button
              onClick={onRestart}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="시간 0.0초로 되감기"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Time readout */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-100 font-bold tabular-nums">
                {currentTime.toFixed(2)}s
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{durationSec.toFixed(1)}s</span>
            </div>

            {/* Completion status pill */}
            {isCompleted ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 공정 완료 (정착 상태 고정)
              </span>
            ) : (
              <span className="text-[11px] text-cyan-400 animate-pulse font-medium">
                ● 실시간 응답 해석 중...
              </span>
            )}
          </div>

          {/* Process Duration Limit Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">전공정 제한시간:</span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-mono">
              {[5, 10, 15, 20].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onChangeDuration(sec)}
                  className={`px-2 py-0.5 rounded-md text-xs transition-colors ${
                    durationSec === sec
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}초
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div className="flex items-center gap-3 w-full">
          <input
            type="range"
            min="0"
            max={durationSec}
            step="0.05"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
          />
          <span className="text-[11px] font-mono text-slate-400 shrink-0">
            {Math.round((currentTime / durationSec) * 100)}%
          </span>
        </div>
      </div>

      {/* 2. Educational Overlay & Curve ON/OFF Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800 mb-2">
        {/* Left: Individual Curve ON/OFF Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px] font-medium mr-0.5">곡선 ON/OFF:</span>

          {/* 1. PID Curve Toggle */}
          <button
            onClick={() => setShowPIDCurve(!showPIDCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
              showPIDCurve
                ? 'bg-sky-950/80 text-sky-200 border-sky-600 shadow-xs'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="현재 PID 제어 응답 곡선 표시/숨김"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                showPIDCurve ? 'bg-sky-400 ring-2 ring-sky-400/40' : 'bg-slate-600'
              }`}
            ></span>
            <span className="font-semibold">PID 제어</span>
          </button>

          {/* 2. ON/OFF (Bang-Bang) Curve Toggle */}
          <button
            onClick={() => setShowOnOffCurve(!showOnOffCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
              showOnOffCurve
                ? 'bg-orange-950/90 text-orange-200 border-orange-500 shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="ON/OFF 뱅뱅 제어 곡선: 100%와 0%만을 스위칭하여 끊임없이 상하 진동(헌팅)하는 기본 제어 방식입니다"
          >
            <Zap
              className={`w-3.5 h-3.5 ${showOnOffCurve ? 'text-orange-400' : 'text-slate-500'}`}
            />
            <span className="font-bold">ON/OFF 제어</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                showOnOffCurve ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {showOnOffCurve ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 3. P-Only Curve Toggle */}
          <button
            onClick={() => setShowPOnlyCurve(!showPOnlyCurve)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs border transition-colors ${
              showPOnlyCurve
                ? 'bg-red-950/90 text-red-200 border-red-500 shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="P만 사용한 제어 곡선: Ki와 Kd가 0일 때 목표값에 못 미치고 정상 오차가 남는 현상을 확인합니다"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                showPOnlyCurve ? 'bg-red-500 ring-2 ring-red-400/40' : 'bg-slate-600'
              }`}
            ></span>
            <span className="font-bold">P만 사용</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-sans ${
                showPOnlyCurve ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {showPOnlyCurve ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 4. PI Curve Toggle */}
          <button
            onClick={() => setShowPICurve(!showPICurve)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-mono text-xs border transition-colors ${
              showPICurve
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600 shadow-xs'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="PI 제어 곡선: Kd=0일 때 오차는 제거되나 오버슈트가 발생하는 곡선입니다"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                showPICurve ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            ></span>
            <span>PI 제어</span>
          </button>

          {/* 5. Previous Ghost Curve Toggle */}
          {previousSamples && previousSamples.length > 0 && (
            <button
              onClick={() => setShowGhostCurve(!showGhostCurve)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors border ${
                showGhostCurve
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title="파라미터 변경 전 이전 응답 곡선(회색 점선) 비교"
            >
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block"></span>
              <span>이전 설정</span>
            </button>
          )}
        </div>

        {/* Right: Display Elements & Decomposition Toggle */}
        <div className="flex items-center gap-2 text-xs">
          {/* Toggle Educational Annotations */}
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
              showAnnotations
                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>구간 해설 {showAnnotations ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle P/I/D decomposed channel */}
          <button
            onClick={() => setShowPIDComponents(!showPIDComponents)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            {showPIDComponents ? '제어 출력 u(t) 숨김' : '제어 출력 u(t) 보기'}
          </button>
        </div>
      </div>

      {/* 3. Main Fixed Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex-1 min-h-[370px] w-full cursor-crosshair rounded-xl overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Live Hover Inspector Card */}
        {hoverSample && (
          <div className="absolute top-3 right-4 z-20 bg-slate-900/95 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono shadow-2xl backdrop-blur flex flex-col gap-1 pointer-events-none min-w-[210px]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1 text-slate-400">
              <span>시간 t:</span>
              <span className="text-slate-100 font-bold">{hoverSample.time.toFixed(2)}초</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-400">
              <span>목표값 (SP):</span>
              <span className="font-bold">
                {hoverSample.setpoint.toFixed(2)} {unit}
              </span>
            </div>

            {showPIDCurve && (
              <div className="flex items-center justify-between gap-4 text-sky-400">
                <span>PID 현재값:</span>
                <span className="font-bold">
                  {hoverSample.pv.toFixed(2)} {unit}
                </span>
              </div>
            )}

            {showOnOffCurve && comparison3Way?.onOff && (
              <div className="flex items-center justify-between gap-4 text-orange-400">
                <span>ON/OFF 제어:</span>
                <span className="font-bold">
                  {getSampleAtTime(comparison3Way.onOff, hoverSample.time)?.pv.toFixed(2) ?? '-'} {unit}
                </span>
              </div>
            )}

            {showPOnlyCurve && comparison3Way?.pOnly && (
              <div className="flex items-center justify-between gap-4 text-red-400">
                <span>P만 사용값:</span>
                <span className="font-bold">
                  {getSampleAtTime(comparison3Way.pOnly, hoverSample.time)?.pv.toFixed(2) ?? '-'} {unit}
                </span>
              </div>
            )}

            {showPIDCurve && (
              <div className="flex items-center justify-between gap-4 text-slate-300 border-t border-slate-800 pt-1">
                <span>PID 출력 u:</span>
                <span className="font-bold">{hoverSample.output.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Educational Comparison Summary Cards */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
        {/* ON/OFF Control Metaphor */}
        <div
          onClick={() => setShowOnOffCurve(!showOnOffCurve)}
          className={`cursor-pointer rounded-lg p-2.5 flex items-start gap-2 border transition-all ${
            showOnOffCurve
              ? 'bg-orange-950/40 border-orange-500/60 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1"></span>
          <div>
            <div className="font-bold text-orange-300 flex items-center gap-1">
              <span>ON/OFF (뱅뱅) 제어</span>
              <span className="text-[9px] font-normal text-orange-400">
                {showOnOffCurve ? '[그래프 켜짐]' : '[클릭하여 켜기]'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              스위치처럼 100%와 0%만 반복하여 목표선 주변을 <strong>끊임없이 출렁이며 진동(헌팅)</strong>합니다.
            </div>
          </div>
        </div>

        {/* P-Only Control Metaphor */}
        <div
          onClick={() => setShowPOnlyCurve(!showPOnlyCurve)}
          className={`cursor-pointer rounded-lg p-2.5 flex items-start gap-2 border transition-all ${
            showPOnlyCurve
              ? 'bg-red-950/40 border-red-500/60 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0 mt-1"></span>
          <div>
            <div className="font-bold text-red-300 flex items-center gap-1">
              <span>P만 사용 (비례 제어)</span>
              <span className="text-[9px] font-normal text-red-400">
                {showPOnlyCurve ? '[그래프 켜짐]' : '[클릭하여 켜기]'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              목표에 다가갈수록 힘이 빠져 목표선 아래에 멈춰서는 <strong>정상 상태 오차(Offset)</strong>가 남습니다.
            </div>
          </div>
        </div>

        {/* I-Term Metaphor */}
        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-lg p-2.5 flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1"></span>
          <div>
            <div className="font-bold text-emerald-300">I (적분: 오차 청소기)</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              P만으로 못 채운 잔여 오차를 끝까지 누적해서 밀어주어 <strong>오차를 완벽히 0으로</strong> 만듭니다.
            </div>
          </div>
        </div>

        {/* D-Term Metaphor */}
        <div className="bg-slate-900/80 border border-purple-500/20 rounded-lg p-2.5 flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0 mt-1"></span>
          <div>
            <div className="font-bold text-purple-300">D (미분: 스마트 브레이크)</div>
            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              목표에 접근하는 속도를 감지해 <strong>미리 브레이크를 걸어</strong> 치솟는 오버슈트를 억제합니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
