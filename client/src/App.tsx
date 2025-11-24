import { useState } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { InspectionScreen } from './components/InspectionScreen';
import { Worker, AccessLogEntry, SystemConfig } from './types';

// NOTE: AI 코드 기준으로 export를 제거했습니다.
type Screen = 'mode-selection' | 'admin' | 'worker' | 'inspection';

// 초기 더미 데이터 (변경 없음)
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
  // ✨ AI 코드를 반영하여 작업자 출입 상태를 관리하는 Set 추가
  const [checkedInWorkerIds, setCheckedInWorkerIds] = useState<Set<string>>(new Set());

  // 작업자 관리 (변경 없음)
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

  // 로그 관리 (변경 없음)
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

  // 설정 관리 (변경 없음)
  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
  };

  // 화면 전환 (handleSelectMode, handleLogout, handleStartInspection, handleInspectionPass, handleInspectionFail은 로직 변경 없음)
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

  // ✨ handleCheckIn 로직에 checkedInWorkerIds 추가
  const handleCheckIn = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '출입',
        status: '성공',
        details: '현장 출입 기록',
      });
      // 작업자 ID를 Set에 추가
      setCheckedInWorkerIds(prev => new Set(prev).add(workerId));
    }
  };

  // ✨ handleCheckOut 로직에 checkedInWorkerIds 제거 로직 추가
  const handleCheckOut = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '퇴근',
        status: '성공',
        details: '정상 퇴근 처리',
      });
      // 작업자 ID를 Set에서 제거
      const newSet = new Set(checkedInWorkerIds);
      newSet.delete(workerId);
      setCheckedInWorkerIds(newSet);
    }
    setInspectionPassed(false);
  };

  return (
      // ✨ 클래스 이름 변경
      <div className="size-full">
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
            // ✨ WorkerMode props 변경: inspectionPassed, onStartInspection 제거, requiredEquipment, checkedInWorkerIds 추가
            <WorkerMode
                workers={workers}
                requiredEquipment={config.requiredEquipment}
                checkedInWorkerIds={checkedInWorkerIds}
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