import { PlantModelId, PIDParameters, SimulationSample, StepResponseMetrics } from '../types/pid';
import { PLANT_CONFIGS, stepPlant, getInitialPlantState } from '../physics/plants';
import { PIDController } from './pidController';
import { calculateMetrics } from './metrics';

export interface ProcessSimulationResult {
  samples: SimulationSample[];
  metrics: StepResponseMetrics;
  durationSec: number;
}

/**
 * Clean deterministic step response simulation from t = 0 to t = durationSec
 */
export function runProcessSimulation(
  plantId: PlantModelId,
  params: PIDParameters,
  setpoint: number,
  disturbance: { magnitude: number; startTime: number; duration: number } | null = null,
  durationSec: number = 10,
  dt: number = 0.02
): ProcessSimulationResult {
  const controller = new PIDController(params);
  let plantSt = getInitialPlantState(plantId);
  controller.reset(plantSt.pv);

  const totalSteps = Math.ceil(durationSec / dt);
  const samples: SimulationSample[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = Number((i * dt).toFixed(2));

    // Calculate active disturbance at time t
    let activeDist = 0;
    if (
      disturbance &&
      t >= disturbance.startTime &&
      t <= disturbance.startTime + disturbance.duration
    ) {
      activeDist = disturbance.magnitude;
    }

    // PID compute
    const pidResult = controller.compute(setpoint, plantSt.pv, dt);

    // Record sample
    samples.push({
      time: t,
      setpoint,
      pv: plantSt.pv,
      error: pidResult.error,
      output: pidResult.output,
      pTerm: pidResult.pTerm,
      iTerm: pidResult.iTerm,
      dTerm: pidResult.dTerm,
      disturbance: activeDist,
    });

    // Physics step
    plantSt = stepPlant(plantId, plantSt, pidResult.output, activeDist, dt);
  }

  const metrics = calculateMetrics(samples, setpoint, samples[0]?.pv || 0);

  return {
    samples,
    metrics,
    durationSec,
  };
}

/**
 * Clean deterministic step response simulation from t = 0 to t = durationSec
 */
export function runOnOffSimulation(
  plantId: PlantModelId,
  setpoint: number,
  durationSec: number = 10,
  dt: number = 0.02
): SimulationSample[] {
  const cfg = PLANT_CONFIGS[plantId];
  let plantSt = getInitialPlantState(plantId);
  const totalSteps = Math.ceil(durationSec / dt);
  const samples: SimulationSample[] = [];

  // Hysteresis deadband: e.g. 1.2% of setpoint span
  const span = Math.max(1.0, cfg.maxSetpoint - cfg.minSetpoint);
  const deadband = Math.max(0.1, span * 0.015);
  let stateOn = plantSt.pv < setpoint;

  for (let i = 0; i <= totalSteps; i++) {
    const t = Number((i * dt).toFixed(2));
    const error = setpoint - plantSt.pv;

    if (plantSt.pv < setpoint - deadband) {
      stateOn = true;
    } else if (plantSt.pv > setpoint + deadband) {
      stateOn = false;
    }

    const output = stateOn ? cfg.outMax : cfg.outMin;

    samples.push({
      time: t,
      setpoint,
      pv: plantSt.pv,
      error,
      output,
      pTerm: 0,
      iTerm: 0,
      dTerm: 0,
      disturbance: 0,
    });

    plantSt = stepPlant(plantId, plantSt, output, 0, dt);
  }

  return samples;
}

/**
 * Generate benchmark comparison curves:
 * 1. ON/OFF Bang-Bang control (Oscillates / hunting)
 * 2. Pure P control (Ki=0, Kd=0) -> Shows offset / steady-state error
 * 3. PI control (Kd=0) -> Eliminates offset but creates overshoot
 * 4. Full PID control -> Dampened, fast, zero offset
 */
export function generate3WayComparison(
  plantId: PlantModelId,
  baseParams: PIDParameters,
  setpoint: number,
  durationSec: number = 10
) {
  // 1. ON/OFF relay control
  const onOffSamples = runOnOffSimulation(plantId, setpoint, durationSec);

  // 2. P-only: Ki=0, Kd=0
  const pParams: PIDParameters = {
    ...baseParams,
    ki: 0,
    kd: 0,
  };
  const pResult = runProcessSimulation(plantId, pParams, setpoint, null, durationSec);

  // 3. PI: Kd=0
  const piParams: PIDParameters = {
    ...baseParams,
    kd: 0,
  };
  const piResult = runProcessSimulation(plantId, piParams, setpoint, null, durationSec);

  // 4. Current PID
  const pidResult = runProcessSimulation(plantId, baseParams, setpoint, null, durationSec);

  return {
    onOff: onOffSamples,
    pOnly: pResult.samples,
    piOnly: piResult.samples,
    pidCurrent: pidResult.samples,
  };
}
