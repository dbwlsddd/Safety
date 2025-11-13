import { useState } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { InspectionScreen } from './components/InspectionScreen';
import { Worker, AccessLogEntry, SystemConfig } from './types';

export type Screen = 'mode-selection' | 'admin' | 'worker' | 'inspection';

// 초기 더미 데이터
const initialWorkers: Worker[] = [
  { id: '1', employeeNumber: 'EMP001', name: '홍길동', team: '생산1팀' },
  { id: '2', employeeNumber: 'EMP002', name: '김철수', team: '생산2팀' },
  { id: '3', employeeNumber: 'EMP003', name: '이영희', team: '품질팀' },
  { id: '4', employeeNumber: 'EMP004', name: '박지성', team: '안전팀' },
  { id: '5', employeeNumber: 'EMP005', name: '최현우', team: '생산1팀' },
];

const initialLogs: AccessLogEntry[] = [
  {
    id: '1',
    timestamp: new Date('2024-10-14T08:30:00'),
    workerName: '홍길동',
    activity: '출입',
    status: '성공',
    details: '모든 보호구 착용 확인',
  },
  {
    id: '2',
    timestamp: new Date('2024-10-14T09:15:00'),
    workerName: '김철수',
    activity: '검사',
    status: '경고',
    details: '안전모 미착용 경고',
  },
  {
    id: '3',
    timestamp: new Date('2024-10-14T17:45:00'),
    workerName: '이영희',
    activity: '퇴근',
    status: '성공',
    details: '정상 퇴근 처리',
  },
];

const initialConfig: SystemConfig = {
  requiredEquipment: ['헬멧', '보호경', '작업화'],
  warningDelaySeconds: 10,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode-selection');
  const [workers, setWorkers] = useState<Worker[]>(initialWorkers);
  const [logs, setLogs] = useState<AccessLogEntry[]>(initialLogs);
  const [config, setConfig] = useState<SystemConfig>(initialConfig);
  const [inspectionPassed, setInspectionPassed] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState<string | null>(null);

  // 작업자 관리
  const handleAddWorker = (worker: Omit<Worker, 'id'>) => {
    const newWorker: Worker = {
      ...worker,
      id: Date.now().toString(),
    };
    setWorkers([...workers, newWorker]);
  };

  const handleUpdateWorker = (id: string, worker: Omit<Worker, 'id'>) => {
    setWorkers(workers.map(w => (w.id === id ? { ...worker, id } : w)));
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  const handleBulkUpload = (newWorkers: Omit<Worker, 'id'>[]) => {
    const workersWithIds = newWorkers.map(w => ({
      ...w,
      id: Date.now().toString() + Math.random(),
    }));
    setWorkers([...workers, ...workersWithIds]);
  };

  // 로그 관리
  const handleDeleteLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const addLog = (log: Omit<AccessLogEntry, 'id' | 'timestamp'>) => {
    const newLog: AccessLogEntry = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setLogs([newLog, ...logs]);
  };

  // 설정 관리
  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
  };

  // 화면 전환
  const handleSelectMode = (mode: 'admin' | 'worker') => {
    if (mode === 'admin') {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('worker');
      setInspectionPassed(false);
    }
  };

  const handleLogout = () => {
    setCurrentScreen('mode-selection');
  };

  const handleStartInspection = (workerId: string) => {
    setCurrentWorkerId(workerId);
    setCurrentScreen('inspection');
  };

  const handleInspectionPass = () => {
    setInspectionPassed(true);
    const worker = workers.find(w => w.id === currentWorkerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '검사',
        status: '성공',
        details: '모든 필수 보호구 착용 확인',
      });
    }
    setCurrentScreen('worker');
  };

  const handleInspectionFail = () => {
    const worker = workers.find(w => w.id === currentWorkerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '검사',
        status: '실패',
        details: '필수 보호구 미착용',
      });
    }
    setCurrentScreen('worker');
  };

  const handleCheckIn = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '출입',
        status: '성공',
        details: '현장 출입 기록',
      });
    }
  };

  const handleCheckOut = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '퇴근',
        status: '성공',
        details: '정상 퇴근 처리',
      });
    }
    setInspectionPassed(false);
  };

  return (
    <div className="size-full safe-area-padding-top">
      {currentScreen === 'mode-selection' && (
        <ModeSelection onSelectMode={handleSelectMode} />
      )}
      {currentScreen === 'admin' && (
        <AdminDashboard
          workers={workers}
          logs={logs}
          config={config}
          onAddWorker={handleAddWorker}
          onUpdateWorker={handleUpdateWorker}
          onDeleteWorker={handleDeleteWorker}
          onBulkUpload={handleBulkUpload}
          onDeleteLog={handleDeleteLog}
          onSaveConfig={handleSaveConfig}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'worker' && (
        <WorkerMode
          workers={workers}
          inspectionPassed={inspectionPassed}
          onStartInspection={handleStartInspection}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          onBack={handleLogout}
        />
      )}
      {currentScreen === 'inspection' && (
        <InspectionScreen
          requiredEquipment={config.requiredEquipment}
          warningDelaySeconds={config.warningDelaySeconds}
          onBack={() => setCurrentScreen('worker')}
          onPass={handleInspectionPass}
          onFail={handleInspectionFail}
        />
      )}
    </div>
  );
}
