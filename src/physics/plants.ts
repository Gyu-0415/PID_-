import { PlantConfig, PlantModelId } from '../types/pid';

export interface PlantState {
  // Primary process variable (displayed as PV)
  pv: number;
  // Secondary internal states
  states: number[];
  // Physical elapsed internal timer
  time: number;
}

export const PLANT_CONFIGS: Record<PlantModelId, PlantConfig> = {
  drone: {
    id: 'drone',
    name: '드론 고도 제어 (Quadcopter Altitude)',
    category: '항공 / 로보틱스',
    description: '쿼드콥터 드론의 수직 추력을 조절하여 목표 고도(m)를 정밀하게 유지합니다. 중력과 하향 기류 외란이 작용합니다.',
    unit: 'm',
    variableName: '고도 (Altitude)',
    setpointDefault: 10.0,
    minSetpoint: 0.0,
    maxSetpoint: 30.0,
    outMin: 0.0,
    outMax: 100.0, // 0 ~ 100% 모터 PWM / 추력
    defaultParams: {
      kp: 6.5,
      ki: 2.2,
      kd: 4.8,
      filterN: 15,
      antiWindup: 'clamping',
      derivativeMode: 'on_measurement',
      kw: 2.0,
      b: 1.0,
      c: 0.0,
      outMin: 0.0,
      outMax: 100.0,
      dt: 0.02,
    },
    stepPresets: [5, 10, 15, 25],
    disturbances: [
      { id: 'wind_gust', label: '하향 돌풍 발생 (Down-gust)', description: '-15N 순간 하향 기류 외란', magnitude: -15 },
      { id: 'thermal_updraft', label: '상승 기류 발생 (Updraft)', description: '+12N 상승 기류 외란', magnitude: 12 },
      { id: 'payload_drop', label: '화물 낙하 (무게 감소)', description: '+8N 무게 감소 효과', magnitude: 8 },
    ],
  },

  car: {
    id: 'car',
    name: '차량 크루즈 컨트롤 (Vehicle Cruise Control)',
    category: '자율주행 / 모빌리티',
    description: '차량의 스로틀 및 제동력을 제어하여 목표 주행 속도(km/h)를 일정하게 유지합니다. 오르막길 경사 외란이 가해집니다.',
    unit: 'km/h',
    variableName: '주행 속도 (Speed)',
    setpointDefault: 80.0,
    minSetpoint: 0.0,
    maxSetpoint: 160.0,
    outMin: -50.0, // -50% (제동)
    outMax: 100.0, // 100% (가속 스로틀)
    defaultParams: {
      kp: 3.2,
      ki: 0.8,
      kd: 0.6,
      filterN: 10,
      antiWindup: 'clamping',
      derivativeMode: 'on_measurement',
      kw: 1.5,
      b: 1.0,
      c: 0.0,
      outMin: -50.0,
      outMax: 100.0,
      dt: 0.02,
    },
    stepPresets: [40, 60, 80, 100, 120],
    disturbances: [
      { id: 'steep_uphill', label: '8% 급경사 오르막길 (Hill Incline)', description: '중력 저항으로 인한 감속 외란', magnitude: -35 },
      { id: 'downhill', label: '6% 내리막길 (Downhill Slope)', description: '중력 가속으로 인한 가속 외란', magnitude: 25 },
      { id: 'headwind', label: '강한 맞바람 (Headwind Drag)', description: '공기 저항 증가 외란', magnitude: -18 },
    ],
  },

  tank: {
    id: 'tank',
    name: '액체 수위 탱크 제어 (Liquid Level Tank)',
    category: '공정 제어 / 화학공학',
    description: '유입 펌프 유량을 제어하여 원통형 탱크의 수위(cm)를 제어합니다. 바닥 배수 밸브의 비선형 토리첼리 유출 특성을 갖습니다.',
    unit: 'cm',
    variableName: '수위 높이 (Water Level)',
    setpointDefault: 50.0,
    minSetpoint: 0.0,
    maxSetpoint: 100.0,
    outMin: 0.0,
    outMax: 100.0, // 펌프 입력 0 ~ 100%
    defaultParams: {
      kp: 2.8,
      ki: 0.45,
      kd: 1.2,
      filterN: 10,
      antiWindup: 'clamping',
      derivativeMode: 'on_error',
      kw: 1.0,
      b: 1.0,
      c: 1.0,
      outMin: 0.0,
      outMax: 100.0,
      dt: 0.02,
    },
    stepPresets: [25, 50, 75, 90],
    disturbances: [
      { id: 'valve_leak', label: '비상 배출 밸브 개방 (Drain Valve)', description: '급격한 누수 유량 외란 발생', magnitude: -20 },
      { id: 'inlet_surge', label: '외부 유입수 유입 (Inlet Surge)', description: '보조 배관 급수 유입 외란', magnitude: 20 },
    ],
  },

  temperature: {
    id: 'temperature',
    name: '정밀 온도 챔버 (Thermal Oven Chamber)',
    category: '산업 장비 / 열역학',
    description: '히터 열량을 제어하여 챔버 내부 온도(°C)를 정밀 제어합니다. 열용량과 외기 방열에 따른 1차 지연 시스템입니다.',
    unit: '°C',
    variableName: '챔버 내부 온도 (Temp)',
    setpointDefault: 75.0,
    minSetpoint: 25.0,
    maxSetpoint: 150.0,
    outMin: 0.0,
    outMax: 100.0, // 히터 전력 %
    defaultParams: {
      kp: 4.5,
      ki: 0.15,
      kd: 6.0,
      filterN: 8,
      antiWindup: 'back-calculation',
      derivativeMode: 'on_measurement',
      kw: 0.8,
      b: 1.0,
      c: 0.0,
      outMin: 0.0,
      outMax: 100.0,
      dt: 0.02,
    },
    stepPresets: [40, 60, 80, 110, 130],
    disturbances: [
      { id: 'door_open', label: '챔버 문 개방 (Door Opened)', description: '차가운 외기 유입으로 급격한 열 손실', magnitude: -25 },
      { id: 'cold_sample', label: '저온 샘플 투입 (Cold Ingot)', description: '흡열로 인한 순간 온도 강하', magnitude: -15 },
    ],
  },

  pendulum: {
    id: 'pendulum',
    name: '도립진자 카트 균형 제어 (Inverted Pendulum)',
    category: '고급 제어 / 메카트로닉스',
    description: '카트의 좌우 가속 힘을 제어하여 역진자(막대)의 수직 기립 균형(0°)을 유지합니다. 불안정한 비선형 역학 시스템입니다.',
    unit: '° (deg)',
    variableName: '기울기 각도 (Tilt Angle)',
    setpointDefault: 0.0, // 0도 (수직 기립)
    minSetpoint: -15.0,
    maxSetpoint: 15.0,
    outMin: -100.0,
    outMax: 100.0, // 모터 추력 N
    defaultParams: {
      kp: 18.0,
      ki: 1.5,
      kd: 7.5,
      filterN: 20,
      antiWindup: 'clamping',
      derivativeMode: 'on_error',
      kw: 2.0,
      b: 1.0,
      c: 1.0,
      outMin: -100.0,
      outMax: 100.0,
      dt: 0.01,
    },
    stepPresets: [0, 5, -5, 8],
    disturbances: [
      { id: 'tap_right', label: '우측 넛지 충격 (Tap Right)', description: '+5N 외력 충격', magnitude: 5 },
      { id: 'tap_left', label: '좌측 넛지 충격 (Tap Left)', description: '-5N 외력 충격', magnitude: -5 },
    ],
  },

  motor: {
    id: 'motor',
    name: 'DC 서보 모터 각도 제어 (DC Motor Position)',
    category: '모션 제어 / 액추에이터',
    description: '모터 인가 전압(V)을 제어하여 출력 축의 회전 각도(deg)를 빠르고 정확하게 위치 결정합니다.',
    unit: '° (deg)',
    variableName: '회전 각도 (Angle)',
    setpointDefault: 90.0,
    minSetpoint: 0.0,
    maxSetpoint: 360.0,
    outMin: -24.0, // -24V ~ +24V
    outMax: 24.0,
    defaultParams: {
      kp: 0.85,
      ki: 0.12,
      kd: 0.22,
      filterN: 15,
      antiWindup: 'clamping',
      derivativeMode: 'on_measurement',
      kw: 1.2,
      b: 1.0,
      c: 0.0,
      outMin: -24.0,
      outMax: 24.0,
      dt: 0.01,
    },
    stepPresets: [45, 90, 180, 270, 360],
    disturbances: [
      { id: 'load_torque', label: '역부하 토크 발생 (Load Torque)', description: '축에 가해지는 역방향 마찰 토크', magnitude: -8 },
      { id: 'inertia_bump', label: '순간 충격 외란 (Impact Bump)', description: '회전 관성 충격 외란', magnitude: 10 },
    ],
  },
};

/**
 * Execute physics step with RK4 / Euler integration
 */
export function stepPlant(
  plantId: PlantModelId,
  currentState: PlantState,
  controlOutput: number,
  disturbance: number,
  dt: number
): PlantState {
  const t = currentState.time + dt;

  switch (plantId) {
    case 'drone': {
      // states: [altitude (m), velocity (m/s)]
      let [alt, vel] = currentState.states;
      const m = 1.0; // 1kg
      const g = 9.81;
      const drag = 0.6; // damping
      // controlOutput is 0..100% thrust. At 40.875%, thrust = 9.81N (balances gravity)
      const maxThrust = 24.0; // Newtons at 100%
      const thrust = (Math.max(0, controlOutput) / 100.0) * maxThrust;
      const totalForce = thrust - m * g - drag * vel + disturbance;
      const accel = totalForce / m;

      vel += accel * dt;
      alt += vel * dt;

      // Ground limit
      if (alt < 0) {
        alt = 0;
        if (vel < 0) vel = 0;
      }
      return { pv: alt, states: [alt, vel], time: t };
    }

    case 'car': {
      // states: [speed (km/h), pos (m)]
      let [speedKmh, pos] = currentState.states;
      let speedMs = speedKmh / 3.6;
      const m = 1100; // kg
      const cDrag = 0.42; // aero drag
      const cRoll = 18.0; // rolling drag

      // Output: -50% to +100%
      let tractiveForce = 0;
      if (controlOutput >= 0) {
        tractiveForce = (controlOutput / 100.0) * 4500.0; // max 4500N engine
      } else {
        tractiveForce = (controlOutput / 50.0) * 5500.0; // max braking 5500N
      }

      const dragForce = Math.sign(speedMs) * (cRoll + cDrag * speedMs * speedMs);
      const disturbanceForce = disturbance * 80.0; // e.g. hill slope
      const netForce = tractiveForce - dragForce + disturbanceForce;
      const accel = netForce / m;

      speedMs += accel * dt;
      if (speedMs < 0) speedMs = 0; // forward cruise only
      speedKmh = speedMs * 3.6;
      pos += speedMs * dt;

      return { pv: speedKmh, states: [speedKmh, pos], time: t };
    }

    case 'tank': {
      // states: [height (cm)]
      let [h] = currentState.states;
      const A = 120.0; // Tank area cm^2
      const g = 980.0; // cm/s^2
      const aOut = 1.1; // outflow hole area cm^2
      const kPump = 0.55; // cm^3/s per % pump

      // Inflow
      const qIn = Math.max(0, controlOutput) * kPump + disturbance * 0.4;
      // Outflow Torricelli
      const qOut = h > 0 ? aOut * Math.sqrt(2 * g * Math.max(0, h)) * 0.12 : 0;

      const dh = ((qIn - qOut) / A) * dt;
      h = Math.max(0, Math.min(120, h + dh));

      return { pv: h, states: [h], time: t };
    }

    case 'temperature': {
      // states: [temperature (°C)]
      let [temp] = currentState.states;
      const ambientTemp = 25.0; // 25°C
      const heatCapacity = 18.0; // thermal capacity
      const thermalLoss = 0.18; // heat loss coefficient to ambient
      const maxHeaterPower = 40.0; // heater power at 100%

      const qIn = (Math.max(0, controlOutput) / 100.0) * maxHeaterPower + disturbance * 0.5;
      const qLoss = thermalLoss * (temp - ambientTemp);

      const dTemp = ((qIn - qLoss) / heatCapacity) * dt;
      temp = Math.max(ambientTemp - 5, Math.min(200, temp + dTemp));

      return { pv: temp, states: [temp], time: t };
    }

    case 'pendulum': {
      // states: [theta (deg), omega (deg/s), x (cart m), v (cart m/s)]
      let [thetaDeg, omegaDeg, cartX, cartV] = currentState.states;
      let theta = (thetaDeg * Math.PI) / 180.0;
      let omega = (omegaDeg * Math.PI) / 180.0;

      const M = 1.0; // cart mass
      const m = 0.2; // pole mass
      const l = 0.4; // half length
      const g = 9.81;
      const bCart = 0.2;
      const bPole = 0.005;

      const force = controlOutput + disturbance;

      // Nonlinear equations of motion for cart-pole
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const totalM = M + m;

      const tempForce = (force - bCart * cartV + m * l * omega * omega * sinT) / totalM;
      const thetaAcc = (g * sinT - cosT * tempForce - (bPole * omega) / (m * l)) / (l * (4.0 / 3.0 - (m * cosT * cosT) / totalM));
      const cartAcc = tempForce - (m * l * thetaAcc * cosT) / totalM;

      omega += thetaAcc * dt;
      theta += omega * dt;
      cartV += cartAcc * dt;
      cartX += cartV * dt;

      // Dampen if out of bounds
      thetaDeg = (theta * 180.0) / Math.PI;
      omegaDeg = (omega * 180.0) / Math.PI;

      // Fall over limit
      if (Math.abs(thetaDeg) > 60) {
        thetaDeg = Math.sign(thetaDeg) * 60;
        omegaDeg = 0;
      }

      return { pv: thetaDeg, states: [thetaDeg, omegaDeg, cartX, cartV], time: t };
    }

    case 'motor': {
      // states: [angle (deg), velocity (deg/s)]
      let [angle, vel] = currentState.states;
      const J = 0.015; // rotor inertia
      const B = 0.08; // viscous friction
      const Kt = 0.65; // torque constant (Nm/V)

      const torque = controlOutput * Kt + disturbance * 0.15;
      const accel = (torque - B * (vel * Math.PI / 180)) / J * (180 / Math.PI);

      vel += accel * dt;
      angle += vel * dt;

      return { pv: angle, states: [angle, vel], time: t };
    }
  }
}

export function getInitialPlantState(plantId: PlantModelId): PlantState {
  switch (plantId) {
    case 'drone':
      return { pv: 0, states: [0, 0], time: 0 };
    case 'car':
      return { pv: 0, states: [0, 0], time: 0 };
    case 'tank':
      return { pv: 10, states: [10], time: 0 };
    case 'temperature':
      return { pv: 25, states: [25], time: 0 };
    case 'pendulum':
      return { pv: 5.0, states: [5.0, 0, 0, 0], time: 0 }; // slight initial lean
    case 'motor':
      return { pv: 0, states: [0, 0], time: 0 };
  }
}
