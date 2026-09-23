import { PlantModelId, PIDParameters } from '../types/pid';
import { PLANT_CONFIGS } from '../physics/plants';

export interface AutoTuneResult {
  methodName: string;
  description: string;
  ku?: number;
  tu?: number;
  params: PIDParameters;
  notes: string[];
}

export function calculateZieglerNicholsOscillation(
  plantId: PlantModelId,
  mode: 'classic' | 'no_overshoot' | 'pessen' | 'pi' | 'p'
): AutoTuneResult {
  const baseConfig = PLANT_CONFIGS[plantId];
  const def = baseConfig.defaultParams;

  // Characteristic ultimate gain Ku and ultimate period Tu for each model
  const plantKuTu: Record<PlantModelId, { ku: number; tu: number }> = {
    drone: { ku: 12.0, tu: 1.8 },
    car: { ku: 7.5, tu: 2.6 },
    tank: { ku: 6.2, tu: 4.5 },
    temperature: { ku: 9.8, tu: 8.0 },
    pendulum: { ku: 28.0, tu: 0.9 },
    motor: { ku: 1.8, tu: 1.2 },
  };

  const { ku, tu } = plantKuTu[plantId];
  let kp = 0;
  let ki = 0;
  let kd = 0;
  let desc = '';

  switch (mode) {
    case 'classic':
      kp = 0.6 * ku;
      ki = (1.2 * ku) / tu;
      kd = 0.075 * ku * tu;
      desc = '지글러-니콜스 표준 PID (빠른 응답, 약 10~25% 오버슈트 허용)';
      break;
    case 'no_overshoot':
      kp = 0.33 * ku;
      ki = (0.66 * ku) / tu;
      kd = 0.11 * ku * tu;
      desc = '무오버슈트 감쇠형 PID (오버슈트 억제, 안전하고 완만한 정착)';
      break;
    case 'pessen':
      kp = 0.7 * ku;
      ki = (1.75 * ku) / tu;
      kd = 0.105 * ku * tu;
      desc = '페센 적분 규칙 (Pessen Integral: 외란 억제 극대화)';
      break;
    case 'pi':
      kp = 0.45 * ku;
      ki = (0.54 * ku) / tu;
      kd = 0;
      desc = '지글러-니콜스 PI 제어기 (고주파 노이즈 민감 공정에 적합)';
      break;
    case 'p':
      kp = 0.5 * ku;
      ki = 0;
      kd = 0;
      desc = '순수 비례(P) 제어 (정상 상태 오차 잔류)';
      break;
  }

  const tuned: PIDParameters = {
    ...def,
    kp: Number(kp.toFixed(3)),
    ki: Number(ki.toFixed(3)),
    kd: Number(kd.toFixed(3)),
  };

  return {
    methodName: `Ziegler-Nichols (${mode.toUpperCase()})`,
    description: desc,
    ku,
    tu,
    params: tuned,
    notes: [
      `임계 이득 Ku = ${ku}, 임계 주기 Tu = ${tu}s 기준 계산`,
      `비례 이득 Kp = ${tuned.kp}`,
      `적분 이득 Ki = ${tuned.ki} (Ti = ${(tuned.kp / Math.max(0.001, tuned.ki)).toFixed(2)}s)`,
      `미분 이득 Kd = ${tuned.kd} (Td = ${(tuned.kd / Math.max(0.001, tuned.kp)).toFixed(2)}s)`,
    ],
  };
}

export function calculateCohenCoon(plantId: PlantModelId): AutoTuneResult {
  const baseConfig = PLANT_CONFIGS[plantId];
  const def = baseConfig.defaultParams;

  // Process reaction curve parameters (K: process gain, L: dead-time delay, T: time constant)
  const reactionModels: Record<PlantModelId, { K: number; L: number; T: number }> = {
    drone: { K: 0.25, L: 0.12, T: 1.1 },
    car: { K: 1.2, L: 0.35, T: 3.2 },
    tank: { K: 0.85, L: 0.5, T: 4.8 },
    temperature: { K: 2.2, L: 0.9, T: 12.0 },
    pendulum: { K: 0.5, L: 0.08, T: 0.6 },
    motor: { K: 15.0, L: 0.05, T: 0.4 },
  };

  const { K, L, T } = reactionModels[plantId];
  const r = L / T;

  // Cohen-Coon Formulas
  const kp = (T / (K * L)) * (4 / 3 + r / 4);
  const Ti = L * ((32 + 6 * r) / (13 + 8 * r));
  const Td = L * (4 / (11 + 2 * r));

  const ki = kp / Ti;
  const kd = kp * Td;

  const tuned: PIDParameters = {
    ...def,
    kp: Number(kp.toFixed(3)),
    ki: Number(ki.toFixed(3)),
    kd: Number(kd.toFixed(3)),
  };

  return {
    methodName: 'Cohen-Coon (코헨-쿤 튜닝법)',
    description: '공정 지연(Dead-time)이 큰 시스템에 최적화된 반응 곡선 기반 튜닝',
    params: tuned,
    notes: [
      `공정 이득 K = ${K}, 시간지연 L = ${L}s, 시상수 T = ${T}s`,
      `지연율 L/T = ${r.toFixed(3)}`,
      `추천 비례 Kp = ${tuned.kp}, 적분 Ki = ${tuned.ki}, 미분 Kd = ${tuned.kd}`,
    ],
  };
}
