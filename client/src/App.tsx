import { useState, useEffect } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { InspectionScreen } from './components/InspectionScreen';
import { Worker, AccessLogEntry, SystemConfig } from './types';

type Screen = 'mode-selection' | 'admin' | 'worker' | 'inspection';

// API 주소 확인
const API_BASE_URL = "https://100.64.239.86:8443/api";

// 기본 설정값
const defaultConfig: SystemConfig = {
  requiredEquipment: ['헬멧', '조끼'],
  warningDelaySeconds: 10,
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode-selection');

  // 🛠️ [수정됨] 더미 데이터 제거하고 빈 배열([])로 초기화 -> Dashboard 오류 해결 핵심
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);

  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [inspectionPassed, setInspectionPassed] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState<string | null>(null);
  const [checkedInWorkerIds, setCheckedInWorkerIds] = useState<Set<string>>(new Set());

  // 앱 시작 시 서버에서 데이터 가져오기
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workers`);
      if (response.ok) {
        const data = await response.json();
        const mappedWorkers: Worker[] = data.map((w: any) => ({
          id: String(w.id),
          name: w.name,
          employeeNumber: w.employeeNumber,
          team: w.department || w.team || '미지정',
        }));
        setWorkers(mappedWorkers);
      }
    } catch (error) {
      console.error("서버 연결 실패 (무시 가능):", error);
    }
  };

  const handleAddWorker = (worker: Omit<Worker, 'id'>) => {
    const newWorker: Worker = { ...worker, id: Date.now().toString() };
    setWorkers([...workers, newWorker]);
  };

  const handleUpdateWorker = (id: string, updatedWorker: Omit<Worker, 'id'>) => {
    setWorkers(workers.map(w => (w.id === id ? { ...updatedWorker, id } : w)));
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  const handleBulkUpload = async (newWorkers: any[]) => {
    const formData = new FormData();
    const dtos = [];

    for (const w of newWorkers) {
      dtos.push({
        name: w.name,
        employeeNumber: w.employeeNumber,
        team: w.team,
        mappedFileName: w.photoFile ? w.photoFile.name : null
      });
      if (w.photoFile) {
        formData.append("files", w.photoFile);
      }
    }
    formData.append("data", JSON.stringify(dtos));

    try {
      const response = await fetch(`${API_BASE_URL}/workers/bulk`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        alert("일괄 등록 완료");
        fetchWorkers();
      } else {
        alert("등록 실패");
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("통신 오류");
    }
  };

  const handleDeleteLog = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const addLog = (log: Omit<AccessLogEntry, 'id' | 'timestamp'>) => {
    const newLog: AccessLogEntry = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setLogs(prevLogs => [newLog, ...prevLogs]);
  };

  const handleSaveConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
  };

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

  const handleInspectionPass = () => {
    setInspectionPassed(true);
    const worker = workers.find(w => w.id === currentWorkerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '검사',
        status: '성공',
        details: '보호구 착용 확인',
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
        details: '보호구 미착용',
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
        details: '입장',
      });
      setCheckedInWorkerIds(prev => new Set(prev).add(workerId));
    }
  };

  const handleCheckOut = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      addLog({
        workerName: worker.name,
        activity: '퇴근',
        status: '성공',
        details: '퇴근',
      });
      const newSet = new Set(checkedInWorkerIds);
      newSet.delete(workerId);
      setCheckedInWorkerIds(newSet);
    }
    setInspectionPassed(false);
  };

  return (
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