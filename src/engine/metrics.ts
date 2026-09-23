import { SimulationSample, StepResponseMetrics } from '../types/pid';

export function calculateMetrics(
  history: SimulationSample[],
  targetSetpoint: number,
  initialPv: number = 0
): StepResponseMetrics {
  if (history.length < 5) {
    return {
      riseTime: null,
      settlingTime: null,
      overshootPercent: 0,
      peakValue: targetSetpoint,
      peakTime: null,
      steadyStateError: 0,
      isStable: true,
      isOscillating: false,
      dampingRatioEst: null,
    };
  }

  const stepDelta = targetSetpoint - initialPv;
  const isPositiveStep = stepDelta >= 0;
  const absDelta = Math.abs(stepDelta);

  // Peak analysis
  let peakVal = history[0].pv;
  let peakIdx = 0;

  for (let i = 0; i < history.length; i++) {
    const val = history[i].pv;
    if (isPositiveStep ? val > peakVal : val < peakVal) {
      peakVal = val;
      peakIdx = i;
    }
  }

  const peakTime = history[peakIdx]?.time ?? null;

  // Overshoot percentage
  let overshootPercent = 0;
  if (absDelta > 0.001) {
    if (isPositiveStep && peakVal > targetSetpoint) {
      overshootPercent = ((peakVal - targetSetpoint) / absDelta) * 100;
    } else if (!isPositiveStep && peakVal < targetSetpoint) {
      overshootPercent = ((targetSetpoint - peakVal) / absDelta) * 100;
    }
  }

  // Rise time (10% to 90%)
  const y10 = initialPv + 0.1 * stepDelta;
  const y90 = initialPv + 0.9 * stepDelta;
  let t10: number | null = null;
  let t90: number | null = null;

  for (const s of history) {
    if (t10 === null) {
      if (isPositiveStep ? s.pv >= y10 : s.pv <= y10) {
        t10 = s.time;
      }
    }
    if (t90 === null) {
      if (isPositiveStep ? s.pv >= y90 : s.pv <= y90) {
        t90 = s.time;
      }
    }
  }

  const riseTime = (t10 !== null && t90 !== null && t90 >= t10) ? Number((t90 - t10).toFixed(2)) : null;

  // Settling time: within +/-2% of stepDelta around targetSetpoint
  const tolerance = Math.max(0.02 * absDelta, 0.02);
  let settlingTime: number | null = null;

  // Work backwards from end to find where it entered tolerance corridor and stayed inside
  const lastSampleTime = history[history.length - 1].time;
  for (let i = history.length - 1; i >= 0; i--) {
    const diff = Math.abs(history[i].pv - targetSetpoint);
    if (diff > tolerance) {
      // It stepped outside here, so it settled after this point
      if (i + 1 < history.length) {
        settlingTime = Number(history[i + 1].time.toFixed(2));
      }
      break;
    }
  }

  // Steady-state error from average of last 10% samples
  const tailCount = Math.max(5, Math.floor(history.length * 0.1));
  const tail = history.slice(-tailCount);
  const avgTailPv = tail.reduce((acc, s) => acc + s.pv, 0) / tail.length;
  const steadyStateError = Number(Math.abs(targetSetpoint - avgTailPv).toFixed(3));

  // Oscillation / Divergence detection
  let zeroCrossings = 0;
  let prevDiff = history[0].pv - targetSetpoint;
  for (let i = 1; i < history.length; i++) {
    const currDiff = history[i].pv - targetSetpoint;
    if (prevDiff * currDiff < 0) {
      zeroCrossings++;
    }
    prevDiff = currDiff;
  }

  const lastPv = history[history.length - 1].pv;
  const isDiverging = !isFinite(lastPv) || Math.abs(lastPv) > Math.abs(targetSetpoint) * 5 + 500;
  const isOscillating = zeroCrossings >= 4;
  const isStable = !isDiverging && (settlingTime !== null || history.length < 50 || steadyStateError < absDelta * 0.5);

  // Damping ratio approximation from overshoot Mp: zeta = -ln(Mp/100) / sqrt(pi^2 + ln(Mp/100)^2)
  let dampingRatioEst: number | null = null;
  if (overshootPercent > 0.1 && overshootPercent < 99) {
    const osRatio = overshootPercent / 100;
    const lnOs = Math.log(osRatio);
    dampingRatioEst = Number((-lnOs / Math.sqrt(Math.PI * Math.PI + lnOs * lnOs)).toFixed(2));
  } else if (overshootPercent <= 0.1) {
    dampingRatioEst = 1.0; // overdamped / critically damped
  }

  return {
    riseTime,
    settlingTime,
    overshootPercent: Number(overshootPercent.toFixed(1)),
    peakValue: Number(peakVal.toFixed(2)),
    peakTime: peakTime !== null ? Number(peakTime.toFixed(2)) : null,
    steadyStateError,
    isStable,
    isOscillating,
    dampingRatioEst,
  };
}
