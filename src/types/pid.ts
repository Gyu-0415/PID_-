export type PlantModelId = 'drone' | 'car' | 'tank' | 'temperature' | 'pendulum' | 'motor';

export type AntiWindupMethod = 'clamping' | 'back-calculation' | 'none';

export type DerivativeMode = 'on_error' | 'on_measurement';

export interface PIDParameters {
  kp: number;
  ki: number;
  kd: number;
  filterN: number;          // Derivative filter coefficient (LPF cutoff ~ N/dt)
  antiWindup: AntiWindupMethod;
  derivativeMode: DerivativeMode;
  kw: number;               // Back-calculation tracking gain
  b: number;                // Setpoint weight for P term (0.0 ~ 1.0)
  c: number;                // Setpoint weight for D term (0.0 ~ 1.0)
  outMin: number;
  outMax: number;
  dt: number;               // Sample time in seconds
}

export interface OptimalProfile {
  id: string;
  name: string;
  tag: string;
  badgeColor: string;
  description: string;
  whyOptimal: string;
  params: Partial<PIDParameters>;
  expectedResult: {
    riseTime: string;
    overshoot: string;
    settlingTime: string;
    stability: string;
  };
}

export interface PlantConfig {
  id: PlantModelId;
  name: string;
  category: string;
  description: string;
  unit: string;
  variableName: string;
  setpointDefault: number;
  minSetpoint: number;
  maxSetpoint: number;
  outMin: number;
  outMax: number;
  defaultParams: PIDParameters;
  stepPresets: number[];
  optimalProfiles?: OptimalProfile[];
  disturbances: {
    id: string;
    label: string;
    description: string;
    magnitude: number;
  }[];
}

export interface SimulationSample {
  time: number;
  setpoint: number;
  pv: number;               // Process variable
  error: number;
  output: number;           // Total control output
  pTerm: number;
  iTerm: number;
  dTerm: number;
  disturbance: number;
}

export interface StepResponseMetrics {
  riseTime: number | null;      // Time to go from 10% to 90% of step
  settlingTime: number | null;  // Time to stay within +/- 2% or 5% of final value
  overshootPercent: number;     // % overshoot above target
  peakValue: number;
  peakTime: number | null;
  steadyStateError: number;
  isStable: boolean;
  isOscillating: boolean;
  dampingRatioEst: number | null;
}

export interface TuningPreset {
  id: string;
  name: string;
  description: string;
  params: Partial<PIDParameters>;
}

export type AutoTuneMethod = 'zn_oscillation' | 'zn_reaction' | 'cohen_coon' | 'aggressive' | 'conservative';
