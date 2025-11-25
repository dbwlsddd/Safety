import { useState, useEffect } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { InspectionScreen } from './components/InspectionScreen';
import { Worker, AccessLogEntry, SystemConfig } from './types';
import { WorkerFormData } from './components/WorkerManagement'; // 🛠️ 타입 추가

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
          photoPath: w.imagePath, // 필요시 타입 확장에 추가
        }));
        setWorkers(mappedWorkers);
      }
    } catch (error) {
      console.error("서버 연결 실패 (무시 가능):", error);
    }
  };

  // 🛠️ [수정됨] FormData를 이용한 개별 등록 구현
  const handleAddWorker = async (workerData: WorkerFormData) => {
    const formData = new FormData();
    formData.append("employeeNumber", workerData.employeeNumber);
    formData.append("name", workerData.name);
    formData.append("team", workerData.team);

    if (workerData.photoFile) {
      formData.append("photoFile", workerData.photoFile);
    } else {
      alert("사진은 필수입니다.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/workers`, {
        method: "POST",
        body: formData, // Content-Type 헤더는 fetch가 자동 설정 (multipart/form-data)
      });

      if (response.ok) {
        alert("작업자가 등록되었습니다.");
        fetchWorkers(); // 목록 새로고침
      } else {
        const errorText = await response.text();
        alert(`등록 실패: ${errorText}`);
      }
    } catch (error) {
      console.error("등록 오류:", error);
      alert("서버 통신 오류 발생");
    }
  };

  // 🛠️ [수정됨] FormData를 이용한 개별 수정 구현
  const handleUpdateWorker = async (id: string, workerData: WorkerFormData) => {
    const formData = new FormData();
    formData.append("employeeNumber", workerData.employeeNumber);
    formData.append("name", workerData.name);
    formData.append("team", workerData.team);

    // 파일이 있는 경우에만 추가 (파일 없으면 백엔드에서 기존 사진 유지)
    if (workerData.photoFile) {
      formData.append("photoFile", workerData.photoFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/workers/${id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        alert("작업자 정보가 수정되었습니다.");
        fetchWorkers();
      } else {
        const errorText = await response.text();
        alert(`수정 실패: ${errorText}`);
      }
    } catch (error) {
      console.error("수정 오류:", error);
      alert("서버 통신 오류 발생");
    }
  };

  // 🛠️ [수정됨] 서버 API 호출로 삭제 구현
  const handleDeleteWorker = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/workers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("삭제되었습니다.");
        fetchWorkers();
      } else {
        alert("삭제 실패");
      }
    } catch (error) {
      console.error("삭제 오류:", error);
      alert("서버 통신 오류");
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