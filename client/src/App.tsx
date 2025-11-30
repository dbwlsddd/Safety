import { useState, useEffect } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { Worker, AccessLogEntry, SystemConfig, WorkerStatus } from './types';
import { WorkerFormData } from './components/WorkerManagement';

type Screen = 'mode-selection' | 'admin' | 'worker';

// 🛠️ [중요] API 주소 및 서버 주소 설정
const API_BASE_URL = "https://100.64.239.86:8443/api";
const SERVER_URL = "https://100.64.239.86:8443";

// 기본 설정값
const defaultConfig: SystemConfig = {
  requiredEquipment: [],
  warningDelaySeconds: 10,
  adminPassword: '',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('mode-selection');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);

  // 🛠️ 작업자 ID별 상태 관리 (Working/Resting/Off)
  const [workerStatusMap, setWorkerStatusMap] = useState<Record<string, WorkerStatus>>({});

  // 앱 시작 시 서버에서 데이터 가져오기
  useEffect(() => {
    fetchWorkers();
    fetchConfig();
  }, []);

  // 🛠️ [추가] 시스템 설정 가져오기 및 파싱 로직
  const fetchConfig = async () => {
    try {
      // API 엔드포인트는 백엔드 구현에 따라 '/config' 또는 '/system-config' 등으로 수정하세요.
      const response = await fetch(`${API_BASE_URL}/workers/equipment`);

      if (response.ok) {
        const data = await response.json();

        // 🔥 [핵심] 서버 데이터가 "A,B,C" 형태의 문자열일 경우 배열로 변환
        let parsedEquipment = defaultConfig.requiredEquipment;

        if (data.requiredEquipment && typeof data.requiredEquipment === 'string') {
          parsedEquipment = data.requiredEquipment
              .split(',')                 // 쉼표로 자르기
              .map((item: string) => item.trim()) // 앞뒤 공백 제거
              .filter((item: string) => item !== ''); // 빈 문자열 제거
        }

        setConfig(prev => ({
          ...prev, // 기존의 adminPassword, warningDelaySeconds 유지
          requiredEquipment: parsedEquipment
        }));
      }
    } catch (error) {
      console.error("설정 로드 실패 (기본값 사용):", error);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workers`);
      if (response.ok) {
        const data = await response.json();
        const mappedWorkers: Worker[] = data.map((w: any) => {
          let photoUrl = null;
          if (w.imagePath) {
            const cleanPath = w.imagePath.replace("../images/", "images/");
            photoUrl = `${SERVER_URL}/${cleanPath}`;
          }
          return {
            id: String(w.id),
            name: w.name,
            employeeNumber: w.employeeNumber,
            team: w.department || w.team || '미지정',
            photoUrl: photoUrl,
          };
        });
        setWorkers(mappedWorkers);
      }
    } catch (error) {
      console.error("서버 연결 실패 (무시 가능):", error);
    }
  };

  // 🛠️ 작업자 추가
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
        body: formData,
      });
      if (response.ok) {
        alert("작업자가 등록되었습니다.");
        fetchWorkers();
      } else {
        const errorText = await response.text();
        alert(`등록 실패: ${errorText}`);
      }
    } catch (error) {
      console.error("등록 오류:", error);
      alert("서버 통신 오류 발생");
    }
  };

  // 🛠️ 작업자 수정
  const handleUpdateWorker = async (id: string, workerData: WorkerFormData) => {
    const formData = new FormData();
    formData.append("employeeNumber", workerData.employeeNumber);
    formData.append("name", workerData.name);
    formData.append("team", workerData.team);
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

  // 🛠️ 작업자 삭제
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

  // 🛠️ 일괄 등록
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
        await fetchWorkers();
      } else {
        alert("등록 실패");
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("통신 오류");
    }
  };

  // 🛠️ 일괄 삭제
  const handleBulkDelete = async (ids: string[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/workers/batch-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
      });
      if (response.ok) {
        await fetchWorkers();
        alert("선택한 작업자가 삭제되었습니다.");
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("일괄 삭제 에러:", error);
      alert("서버 통신 오류가 발생했습니다.");
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
    setCurrentScreen(mode);
  };

  const handleLogout = () => {
    setCurrentScreen('mode-selection');
  };

  // ============================================================
  // ✅ 상태 기반 워크플로우 핸들러
  // ============================================================

  // 1. 출근 (OFF -> WORKING)
  const handleCheckIn = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      setWorkerStatusMap(prev => ({ ...prev, [workerId]: 'WORKING' }));
      addLog({
        workerName: worker.name,
        activity: '출입',
        status: '성공',
        details: '작업장 입장 (근무 시작)'
      });
    }
  };

  // 2. 퇴근 (WORKING -> OFF)
  const handleCheckOut = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      setWorkerStatusMap(prev => {
        const newMap = { ...prev };
        delete newMap[workerId];
        return newMap;
      });
      addLog({
        workerName: worker.name,
        activity: '퇴근',
        status: '성공',
        details: '작업 종료'
      });
    }
  };

  // 3. 외출/휴식 (WORKING -> RESTING)
  const handleRest = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      setWorkerStatusMap(prev => ({ ...prev, [workerId]: 'RESTING' }));
      addLog({
        workerName: worker.name,
        activity: '외출',
        status: '성공',
        details: '잠시 외출/휴식'
      });
    }
  };

  // 4. 복귀 (RESTING -> WORKING)
  const handleReturn = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      setWorkerStatusMap(prev => ({ ...prev, [workerId]: 'WORKING' }));
      addLog({
        workerName: worker.name,
        activity: '복귀',
        status: '성공',
        details: '휴식 후 복귀'
      });
    }
  };

  return (
      <div className="size-full">
        {currentScreen === 'mode-selection' && (
            <ModeSelection
                onSelectMode={handleSelectMode}
            />
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
                onBulkDelete={handleBulkDelete}
                onDeleteLog={handleDeleteLog}
                onSaveConfig={handleSaveConfig}
                onLogout={handleLogout}
            />
        )}
        {currentScreen === 'worker' && (
            <WorkerMode
                workers={workers}
                requiredEquipment={config.requiredEquipment}
                workerStatusMap={workerStatusMap}
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
                onRest={handleRest}
                onReturn={handleReturn}
                onBack={handleLogout}
            />
        )}
      </div>
  );
}