import { useState, useEffect } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { Worker, AccessLogEntry } from './types';

// API URL 설정
const API_BASE_URL = "https://100.64.239.86:8080/api";

function App() {
  const [mode, setMode] = useState<'selection' | 'admin' | 'worker'>('selection');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  const [checkedInWorkerIds, setCheckedInWorkerIds] = useState<Set<string>>(new Set());
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>(['헬멧', '안전조끼']);

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
      } else {
        console.error("작업자 목록 로드 실패");
      }
    } catch (error) {
      console.error("API 통신 오류:", error);
    }
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
        alert("일괄 등록이 완료되었습니다.");
        fetchWorkers();
      } else {
        const errorText = await response.text();
        alert("등록 실패: " + errorText);
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const handleAddWorker = (worker: Omit<Worker, 'id'>) => {
    const newWorker = { ...worker, id: Date.now().toString() };
    setWorkers([...workers, newWorker]);
  };

  const handleUpdateWorker = (id: string, updatedWorker: Omit<Worker, 'id'>) => {
    setWorkers(workers.map(w => w.id === id ? { ...w, ...updatedWorker } : w));
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  const handleCheckIn = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      const newLog: AccessLogEntry = {
        id: Date.now().toString(),
        workerId: worker.id,
        workerName: worker.name,
        timestamp: new Date().toISOString(),
        activity: '출입',
        status: '성공',
        details: '안전 장비 착용 확인됨'
      };
      setAccessLogs([newLog, ...accessLogs]);
      setCheckedInWorkerIds(prev => new Set(prev).add(workerId));
    }
  };

  const handleCheckOut = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      const newLog: AccessLogEntry = {
        id: Date.now().toString(),
        workerId: worker.id,
        workerName: worker.name,
        timestamp: new Date().toISOString(),
        activity: '퇴근',
        status: '성공',
        details: '퇴근 처리 완료'
      };
      setAccessLogs([newLog, ...accessLogs]);
      setCheckedInWorkerIds(prev => {
        const next = new Set(prev);
        next.delete(workerId);
        return next;
      });
    }
  };

  const handleDeleteLog = (id: string) => {
    setAccessLogs(accessLogs.filter(log => log.id !== id));
  };

  return (
      <>
        {mode === 'selection' && (
            <ModeSelection
                // 🛠️ [수정됨] 기존 onSelectAdmin -> onSelectMode 로 변경
                onSelectMode={() => setMode('admin')}
                onSelectWorker={() => setMode('worker')}
            />
        )}

        {mode === 'admin' && (
            <AdminDashboard
                workers={workers}
                accessLogs={accessLogs}
                onBack={() => setMode('selection')}
                onAddWorker={handleAddWorker}
                onUpdateWorker={handleUpdateWorker}
                onDeleteWorker={handleDeleteWorker}
                onBulkUpload={handleBulkUpload}
                onDeleteLog={handleDeleteLog}
                requiredEquipment={requiredEquipment}
                onUpdateRequiredEquipment={setRequiredEquipment}
            />
        )}

        {mode === 'worker' && (
            <WorkerMode
                workers={workers}
                requiredEquipment={requiredEquipment}
                checkedInWorkerIds={checkedInWorkerIds}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onBack={() => setMode('selection')}
            />
        )}
      </>
  );
}

export default App;