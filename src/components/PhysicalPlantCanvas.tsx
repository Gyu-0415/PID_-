import React, { useRef, useEffect } from 'react';
import { PlantModelId } from '../types/pid';
import { PLANT_CONFIGS } from '../physics/plants';

interface PhysicalPlantCanvasProps {
  plantId: PlantModelId;
  pv: number;
  setpoint: number;
  output: number;
  disturbance: number;
  isPaused: boolean;
  onSetpointChange?: (newSp: number) => void;
}

export const PhysicalPlantCanvas: React.FC<PhysicalPlantCanvasProps> = ({
  plantId,
  pv,
  setpoint,
  output,
  disturbance,
  isPaused,
  onSetpointChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  const plant = PLANT_CONFIGS[plantId];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      if (!isPaused) {
        phaseRef.current += 0.05;
      }
      const phase = phaseRef.current;

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

      // Background subtle technical blueprint grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render specific plant physics graphic
      switch (plantId) {
        case 'drone':
          drawDrone(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
        case 'car':
          drawCar(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
        case 'tank':
          drawTank(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
        case 'temperature':
          drawTemperature(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
        case 'pendulum':
          drawPendulum(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
        case 'motor':
          drawMotor(ctx, width, height, pv, setpoint, output, disturbance, phase);
          break;
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      running = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [plantId, pv, setpoint, output, disturbance, isPaused]);

  return (
    <div className="relative w-full h-full min-h-[260px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex flex-col">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-200 tracking-wide">
          {plant.name}
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          PV: {pv.toFixed(1)} {plant.unit} · SP: {setpoint.toFixed(1)} {plant.unit}
        </span>
      </div>

      {Math.abs(disturbance) > 0.001 && (
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          외란 인가 중 ({disturbance > 0 ? `+${disturbance}` : disturbance})
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full flex-1 touch-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

// ==================== Plant Renderers ====================

function drawDrone(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const maxAlt = 30.0;
  const groundY = h - 35;
  const ceilingY = 40;
  const usableH = groundY - ceilingY;

  const droneY = groundY - Math.min(1.0, Math.max(0, pv / maxAlt)) * usableH;
  const spY = groundY - Math.min(1.0, Math.max(0, sp / maxAlt)) * usableH;

  // Altitude Ruler on Left
  const rulerX = 50;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(rulerX, ceilingY);
  ctx.lineTo(rulerX, groundY);
  ctx.stroke();

  for (let alt = 0; alt <= maxAlt; alt += 5) {
    const y = groundY - (alt / maxAlt) * usableH;
    ctx.beginPath();
    ctx.moveTo(rulerX - 5, y);
    ctx.lineTo(rulerX, y);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${alt}m`, rulerX - 8, y + 3);
  }

  // Setpoint guideline (amber dashed line with target flag)
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(rulerX, spY);
  ctx.lineTo(w - 20, spY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Setpoint target tag
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(w - 20, spY);
  ctx.lineTo(w - 30, spY - 6);
  ctx.lineTo(w - 30, spY + 6);
  ctx.closePath();
  ctx.fill();
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`목표 ${sp.toFixed(1)}m`, w - 34, spY + 3);
  ctx.restore();

  // Ground plane
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(rulerX, groundY, w - rulerX - 10, 4);

  // Drone position in center
  const droneX = w * 0.52;

  // Thrust exhaust plumes (scales with output %)
  const thrustNorm = Math.max(0, Math.min(1, output / 100));
  const flameLen = thrustNorm * 45;
  if (flameLen > 2) {
    const grad = ctx.createLinearGradient(0, droneY + 6, 0, droneY + 6 + flameLen);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(0.5, 'rgba(14, 165, 233, 0.5)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

    ctx.fillStyle = grad;
    // Left thruster plume
    ctx.beginPath();
    ctx.moveTo(droneX - 28, droneY + 6);
    ctx.lineTo(droneX - 24, droneY + 6 + flameLen + Math.sin(phase * 4) * 3);
    ctx.lineTo(droneX - 20, droneY + 6);
    ctx.fill();

    // Right thruster plume
    ctx.beginPath();
    ctx.moveTo(droneX + 20, droneY + 6);
    ctx.lineTo(droneX + 24, droneY + 6 + flameLen + Math.cos(phase * 4) * 3);
    ctx.lineTo(droneX + 28, droneY + 6);
    ctx.fill();
  }

  // Drone body & arms
  ctx.save();
  ctx.translate(droneX, droneY);

  // Main carbon fiber body
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(-16, -6, 32, 12, 4);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // LED status eye
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Motor arms
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-32, 0);
  ctx.lineTo(32, 0);
  ctx.stroke();

  // Rotor motors
  ctx.fillStyle = '#475569';
  ctx.fillRect(-34, -4, 4, 8);
  ctx.fillRect(30, -4, 4, 8);

  // Spinning propeller blur disks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  const propSpin = Math.sin(phase * 15);
  ctx.beginPath();
  ctx.ellipse(-32, -5, 14, 2 + Math.abs(propSpin) * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(32, -5, 14, 2 + Math.abs(propSpin) * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Wind Disturbance arrows
  if (Math.abs(dist) > 0.01) {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    ctx.lineWidth = 2;
    const arrowDir = dist > 0 ? -1 : 1; // negative = down-gust
    for (let i = 0; i < 3; i++) {
      const ax = droneX - 50 + i * 50;
      const ay = droneY - 40 * arrowDir;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, ay + 20 * arrowDir);
      ctx.lineTo(ax - 4, ay + 14 * arrowDir);
      ctx.moveTo(ax, ay + 20 * arrowDir);
      ctx.lineTo(ax + 4, ay + 14 * arrowDir);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const roadY = h - 55;
  const hillAngle = dist * 0.005; // hill angle tilt

  ctx.save();
  ctx.translate(0, roadY);
  ctx.rotate(-hillAngle);

  // Road
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-50, 0, w + 100, 50);

  // Animated Road lane dashes
  const speedNorm = pv / 160;
  const offset = (phase * speedNorm * 60) % 40;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(-50 - offset, 25);
  ctx.lineTo(w + 100, 25);
  ctx.stroke();
  ctx.setLineDash([]);

  // Car chassis
  const carX = w * 0.45;
  const carY = -12;

  // Exhaust particles when accelerating
  if (output > 10) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    for (let i = 1; i <= 3; i++) {
      const pX = carX - 42 - i * 12 - (phase * 5) % 10;
      const pY = carY + 8 + Math.sin(phase * 2 + i) * 3;
      ctx.beginPath();
      ctx.arc(pX, pY, 2 + i * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Car body
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.moveTo(carX - 40, carY + 8);
  ctx.lineTo(carX - 35, carY - 6);
  ctx.lineTo(carX - 15, carY - 6);
  ctx.lineTo(carX - 5, carY - 18);
  ctx.lineTo(carX + 25, carY - 18);
  ctx.lineTo(carX + 38, carY - 4);
  ctx.lineTo(carX + 44, carY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Windows
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(carX - 10, carY - 4);
  ctx.lineTo(carX - 3, carY - 15);
  ctx.lineTo(carX + 22, carY - 15);
  ctx.lineTo(carX + 32, carY - 4);
  ctx.closePath();
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(carX - 24, carY + 10, 8, 0, Math.PI * 2);
  ctx.arc(carX + 26, carY + 10, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rims
  const wheelSpin = phase * speedNorm * 10;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(carX - 24 - Math.cos(wheelSpin) * 5, carY + 10 - Math.sin(wheelSpin) * 5);
  ctx.lineTo(carX - 24 + Math.cos(wheelSpin) * 5, carY + 10 + Math.sin(wheelSpin) * 5);
  ctx.moveTo(carX + 26 - Math.cos(wheelSpin) * 5, carY + 10 - Math.sin(wheelSpin) * 5);
  ctx.lineTo(carX + 26 + Math.cos(wheelSpin) * 5, carY + 10 + Math.sin(wheelSpin) * 5);
  ctx.stroke();

  // Brake light when output < 0
  if (output < -2) {
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(carX - 41, carY - 2, 3, 5);
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // Speedometer HUD in top right
  const hudX = w - 100;
  const hudY = 70;
  const radius = 38;

  ctx.beginPath();
  ctx.arc(hudX, hudY, radius, Math.PI * 0.75, Math.PI * 2.25);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Speed arc
  const normSp = Math.min(1, Math.max(0, pv / 160));
  ctx.beginPath();
  ctx.arc(hudX, hudY, radius, Math.PI * 0.75, Math.PI * 0.75 + normSp * Math.PI * 1.5);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Digital readout
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${pv.toFixed(0)}`, hudX, hudY + 4);
  ctx.fillStyle = '#64748b';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.fillText('km/h', hudX, hudY + 16);
}

function drawTank(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const tankW = 120;
  const tankH = 140;
  const tankX = (w - tankW) / 2;
  const tankY = (h - tankH) / 2 + 10;
  const maxLevel = 100;

  const currentLevelNorm = Math.min(1.0, Math.max(0, pv / maxLevel));
  const waterH = tankH * currentLevelNorm;
  const waterY = tankY + tankH - waterH;

  // Inflow pipe from top-left
  ctx.fillStyle = '#334155';
  ctx.fillRect(tankX - 40, tankY - 14, 55, 14);
  ctx.fillRect(tankX + 15, tankY - 14, 14, 14);

  // Inflow stream (proportional to output)
  if (output > 1) {
    const streamW = Math.max(2, (output / 100) * 10);
    const grad = ctx.createLinearGradient(0, tankY, 0, waterY);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.85)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(tankX + 17, tankY, streamW, waterY - tankY);
  }

  // Outflow pipe at bottom-right
  ctx.fillStyle = '#334155';
  ctx.fillRect(tankX + tankW - 4, tankY + tankH - 20, 35, 14);

  // Outflow stream
  if (pv > 1) {
    const streamH = Math.min(10, Math.sqrt(pv) * 1.0);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.fillRect(tankX + tankW + 20, tankY + tankH - 18, 25, streamH);
  }

  // Tank Water fill with surface wave
  if (waterH > 2) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(tankX, waterY, tankW, waterH);
    ctx.clip();

    const waterGrad = ctx.createLinearGradient(0, waterY, 0, tankY + tankH);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = waterGrad;

    ctx.beginPath();
    ctx.moveTo(tankX, waterY);
    for (let x = tankX; x <= tankX + tankW; x += 4) {
      const yWave = waterY + Math.sin(phase * 3 + x * 0.1) * 2;
      ctx.lineTo(x, yWave);
    }
    ctx.lineTo(tankX + tankW, tankY + tankH);
    ctx.lineTo(tankX, tankY + tankH);
    ctx.closePath();
    ctx.fill();

    // Floating bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 4; i++) {
      const bx = tankX + 20 + i * 25 + Math.sin(phase + i) * 8;
      const by = tankY + tankH - ((phase * 20 + i * 30) % waterH);
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Tank Glass Container Walls
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.strokeRect(tankX, tankY, tankW, tankH);

  // Volumetric measurement tick marks
  for (let lvl = 0; lvl <= maxLevel; lvl += 20) {
    const yTick = tankY + tankH - (lvl / maxLevel) * tankH;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tankX, yTick);
    ctx.lineTo(tankX + 10, yTick);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${lvl}cm`, tankX - 4, yTick + 3);
  }

  // Setpoint guideline
  const spLevelNorm = Math.min(1.0, Math.max(0, sp / maxLevel));
  const spY = tankY + tankH - spLevelNorm * tankH;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(tankX - 10, spY);
  ctx.lineTo(tankX + tankW + 10, spY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawTemperature(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const boxW = 160;
  const boxH = 140;
  const boxX = (w - boxW) / 2;
  const boxY = (h - boxH) / 2 + 10;

  // Outer Chamber insulation wall
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(boxX - 8, boxY - 8, boxW + 16, boxH + 16);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX - 8, boxY - 8, boxW + 16, boxH + 16);

  // Inner chamber cavity
  const heatFactor = Math.min(1, Math.max(0, (pv - 25) / 100));
  const r = Math.floor(15 + heatFactor * 120);
  const g = Math.floor(23 + heatFactor * 30);
  const b = Math.floor(42 - heatFactor * 25);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Heating coil elements at bottom
  const coilY = boxY + boxH - 18;
  const heaterGlow = Math.min(1, Math.max(0, output / 100));
  ctx.strokeStyle = heaterGlow > 0.05 ? `rgba(239, 68, 68, ${0.4 + heaterGlow * 0.6})` : '#64748b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = boxX + 15; x < boxX + boxW - 15; x += 10) {
    ctx.lineTo(x, coilY - 6);
    ctx.lineTo(x + 5, coilY + 6);
  }
  ctx.stroke();

  // Heat convection waves rising
  if (pv > 35) {
    ctx.strokeStyle = `rgba(249, 115, 22, ${0.15 + heatFactor * 0.4})`;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const cx = boxX + 30 + i * 32;
      const cy = boxY + 30 + (i % 2) * 15;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 30);
      ctx.bezierCurveTo(
        cx + Math.sin(phase + i) * 6,
        cy + 15,
        cx - Math.sin(phase + i) * 6,
        cy + 5,
        cx,
        cy - 10
      );
      ctx.stroke();
    }
  }

  // Workpiece / Ingot in center
  ctx.fillStyle = '#64748b';
  ctx.fillRect(boxX + boxW / 2 - 25, boxY + boxH / 2 - 15, 50, 30);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + boxW / 2 - 25, boxY + boxH / 2 - 15, 50, 30);

  // Thermometer bar on right side
  const thermoX = boxX + boxW + 24;
  const thermoH = 100;
  const thermoY = boxY + 20;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(thermoX, thermoY, 12, thermoH);
  ctx.strokeStyle = '#475569';
  ctx.strokeRect(thermoX, thermoY, 12, thermoH);

  const mercuryH = Math.min(thermoH, Math.max(2, ((pv - 20) / 120) * thermoH));
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(thermoX + 1, thermoY + thermoH - mercuryH, 10, mercuryH);

  // Digital display inside chamber top
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(boxX + 15, boxY + 10, boxW - 30, 24);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${pv.toFixed(1)}°C / 목표 ${sp.toFixed(1)}°C`, boxX + boxW / 2, boxY + 26);
}

function drawPendulum(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const railY = h - 60;
  const cartW = 60;
  const cartH = 30;
  const poleLen = 95;

  // Rail
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(30, railY);
  ctx.lineTo(w - 30, railY);
  ctx.stroke();

  // Center vertical target dashed line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(w / 2, railY - poleLen - 15);
  ctx.lineTo(w / 2, railY + 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cart position (center with minor motion)
  const cartX = w / 2;
  const cartY = railY - cartH / 2;

  // Draw Cart
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.roundRect(cartX - cartW / 2, cartY - cartH / 2, cartW, cartH, 4);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cartX - 18, railY, 5, 0, Math.PI * 2);
  ctx.arc(cartX + 18, railY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Pendulum rod angle theta (pv in degrees)
  const thetaRad = (pv * Math.PI) / 180;
  const hingeX = cartX;
  const hingeY = cartY - 5;
  const tipX = hingeX + Math.sin(thetaRad) * poleLen;
  const tipY = hingeY - Math.cos(thetaRad) * poleLen;

  // Pole rod
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(hingeX, hingeY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Pole Tip mass
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(tipX, tipY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hinge pivot
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(hingeX, hingeY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Force arrow from output
  if (Math.abs(output) > 2) {
    const fDir = Math.sign(output);
    const fLen = Math.min(35, Math.abs(output) * 0.4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cartX + fDir * (cartW / 2), cartY);
    ctx.lineTo(cartX + fDir * (cartW / 2 + fLen), cartY);
    ctx.lineTo(cartX + fDir * (cartW / 2 + fLen - 5), cartY - 4);
    ctx.moveTo(cartX + fDir * (cartW / 2 + fLen), cartY);
    ctx.lineTo(cartX + fDir * (cartW / 2 + fLen - 5), cartY + 4);
    ctx.stroke();
  }
}

function drawMotor(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pv: number,
  sp: number,
  output: number,
  dist: number,
  phase: number
) {
  const centerX = w / 2;
  const centerY = h / 2 + 10;
  const radius = 65;

  // Stator circle ring
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
  ctx.stroke();

  // Dial angle graduations
  for (let a = 0; a < 360; a += 30) {
    const rad = (a * Math.PI) / 180;
    const x1 = centerX + Math.cos(rad) * (radius - 5);
    const y1 = centerY + Math.sin(rad) * (radius - 5);
    const x2 = centerX + Math.cos(rad) * radius;
    const y2 = centerY + Math.sin(rad) * radius;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Target Setpoint Marker (Amber triangle)
  const spRad = (sp * Math.PI) / 180;
  const spTipX = centerX + Math.cos(spRad) * (radius + 18);
  const spTipY = centerY + Math.sin(spRad) * (radius + 18);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(spTipX, spTipY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Rotor disk
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2);
  ctx.fill();

  // Pointer Needle for current angle PV
  const pvRad = (pv * Math.PI) / 180;
  const needleX = centerX + Math.cos(pvRad) * (radius - 10);
  const needleY = centerY + Math.sin(pvRad) * (radius - 10);

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(needleX, needleY);
  ctx.stroke();

  // Center axle pin
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Voltage drive glow ring
  if (Math.abs(output) > 0.5) {
    ctx.strokeStyle = output > 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
    ctx.stroke();
  }
}
