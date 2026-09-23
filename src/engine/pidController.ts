import { PIDParameters, SimulationSample } from '../types/pid';

export class PIDController {
  private params: PIDParameters;
  private integral: number = 0;
  private prevError: number = 0;
  private prevMeasurement: number = 0;
  private derivativeFiltered: number = 0;
  private prevOutput: number = 0;

  constructor(params: PIDParameters) {
    this.params = { ...params };
  }

  public setParams(newParams: Partial<PIDParameters>) {
    this.params = { ...this.params, ...newParams };
  }

  public getParams(): PIDParameters {
    return { ...this.params };
  }

  public reset(initialPv: number = 0) {
    this.integral = 0;
    this.prevError = 0;
    this.prevMeasurement = initialPv;
    this.derivativeFiltered = 0;
    this.prevOutput = 0;
  }

  /**
   * Execute one discrete PID step calculation
   * @param setpoint Desired target value
   * @param measurement Current process variable (PV)
   * @param dt Sample delta time in seconds
   * @returns Detailed calculation sample
   */
  public compute(setpoint: number, measurement: number, dtOverride?: number): {
    output: number;
    pTerm: number;
    iTerm: number;
    dTerm: number;
    error: number;
    isSaturated: boolean;
  } {
    const dt = Math.max(0.0001, dtOverride ?? this.params.dt);
    const { kp, ki, kd, filterN, antiWindup, derivativeMode, kw, b, c, outMin, outMax } = this.params;

    // Error calculation with optional setpoint weighting 'b'
    const fullError = setpoint - measurement;
    const pError = b * setpoint - measurement;

    // 1. Proportional Term
    const pTerm = kp * pError;

    // 2. Derivative Term
    let dInputDelta = 0;
    if (derivativeMode === 'on_measurement') {
      // Derivative on measurement prevents setpoint step kick: d/dt (-PV)
      dInputDelta = -(measurement - this.prevMeasurement);
    } else {
      // Derivative on error with setpoint weight 'c'
      const dErrorCurrent = c * setpoint - measurement;
      const dErrorPrev = c * setpoint - this.prevMeasurement;
      dInputDelta = dErrorCurrent - dErrorPrev;
    }

    // Derivative filtering: first-order LPF
    // Time constant Tf = Kd / (Kp * N) if Kp > 0, else 1 / N
    const Tf = kp > 0.0001 ? Math.max(0.001, kd / (kp * Math.max(1, filterN))) : 0.05;
    const alpha = Tf / (Tf + dt);
    const rawDerivative = kd * (dInputDelta / dt);
    this.derivativeFiltered = alpha * this.derivativeFiltered + (1 - alpha) * rawDerivative;
    const dTerm = this.derivativeFiltered;

    // 3. Integral Candidate Calculation
    let candidateIntegral = this.integral + ki * fullError * dt;

    // Unsaturated control signal candidate
    const uUnsaturated = pTerm + candidateIntegral + dTerm;

    // 4. Output Saturation & Anti-Windup Logic
    let uSaturated = uUnsaturated;
    let isSaturated = false;

    if (uUnsaturated > outMax) {
      uSaturated = outMax;
      isSaturated = true;
    } else if (uUnsaturated < outMin) {
      uSaturated = outMin;
      isSaturated = true;
    }

    if (antiWindup === 'clamping') {
      // Clamping: If saturated in positive direction, only integrate if error is negative (pulling back into range)
      // If saturated in negative direction, only integrate if error is positive
      const isSaturatedHigh = uUnsaturated > outMax;
      const isSaturatedLow = uUnsaturated < outMin;
      const errorPushesHigher = fullError > 0;
      const errorPushesLower = fullError < 0;

      if ((isSaturatedHigh && errorPushesHigher) || (isSaturatedLow && errorPushesLower)) {
        // Freeze integral!
        // Do not update this.integral
      } else {
        this.integral = candidateIntegral;
      }
    } else if (antiWindup === 'back-calculation') {
      // Back-calculation: tracking gain kw
      const trackingError = uSaturated - uUnsaturated;
      const trackingGain = kw > 0 ? kw : Math.max(0.1, 1 / Math.max(0.1, dt));
      this.integral += (ki * fullError + trackingGain * trackingError) * dt;
    } else {
      // None: allow windup
      this.integral = candidateIntegral;
    }

    // Clamp internal integral to sane bounds to prevent numerical infinity
    const maxInt = (outMax - outMin) * 3;
    this.integral = Math.max(-maxInt, Math.min(maxInt, this.integral));

    const iTerm = this.integral;
    const finalOutput = Math.max(outMin, Math.min(outMax, pTerm + iTerm + dTerm));

    // Update historical states
    this.prevError = fullError;
    this.prevMeasurement = measurement;
    this.prevOutput = finalOutput;

    return {
      output: finalOutput,
      pTerm,
      iTerm,
      dTerm,
      error: fullError,
      isSaturated,
    };
  }
}
