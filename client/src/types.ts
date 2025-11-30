export type Equipment = 
  | '방독 마스크'
  | '방진 마스크'
  | '일반 마스크'
  | '페이스 쉴드'
  | '헬멧'
  | '방호복'
  | '보호경'
  | '조끼'
  | '작업화'
  | '하네스';

export type WorkerStatus = 'WORKING' | 'RESTING' | 'OFF_WORK';

export interface Worker {
  id: string;
  employeeNumber: string;
  name: string;
  team: string;
  photoUrl?: string;
}

export interface AccessLogEntry {
  id: string;
  timestamp: Date;
  workerName: string;
  activity: '출입' | '퇴근' | '검사' | '외출' | '복귀';
  status: '성공' | '실패' | '경고';
  details: string;
}

export interface SystemConfig {
  requiredEquipment: Equipment[];
  warningDelaySeconds: number;
  adminPassword?: string; // ✅ 비밀번호 필드 추가 (기존 코드에 없었다면 추가)
}
