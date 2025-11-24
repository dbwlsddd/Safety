import { useState, useEffect } from 'react';
import { ModeSelection } from './components/ModeSelection';
import { AdminDashboard } from './components/AdminDashboard';
import { WorkerMode } from './components/WorkerMode';
import { Worker, AccessLogEntry } from './types';

// 🛠️ API URL 설정 (Spring Boot 서버 주소)
const API_BASE_URL = "https://100.64.239.86:8080/api";

function App() {
  const [mode, setMode] = useState<'selection' | 'admin' | 'worker'>('selection');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);

  // 작업자 모드용 상태
  const [checkedInWorkerIds, setCheckedInWorkerIds] = useState<Set<string>>(new Set());
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>(['헬멧', '안전조끼']);

  // 🛠️ [신규] 앱 시작 시 서버에서 작업자 목록 가져오기
  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workers`);
      if (response.ok) {
        const data = await response.json();
        // Backend(department) -> Frontend(team) 매핑
        const mappedWorkers: Worker[] = data.map((w: any) => ({
          id: String(w.id), // 숫자를 문자로 변환
          name: w.name,
          employeeNumber: w.employeeNumber,
          team: w.department || w.team || '미지정', // department를 team으로 매핑
          // photoUrl: w.imagePath // 필요 시 추가
        }));
        setWorkers(mappedWorkers);
      } else {
        console.error("작업자 목록 로드 실패");
      }
    } catch (error) {
      console.error("API 통신 오류:", error);
    }
  };

  // 🛠️ [수정] 일괄 등록 (실제 서버 전송)
  const handleBulkUpload = async (newWorkers: any[]) => {
    // newWorkers 구조: [{ name, employeeNumber, team, photoFile: File }, ...]

    const formData = new FormData();
    const dtos = [];

    // 1. DTO 생성 및 파일 추가
    for (const w of newWorkers) {
      // JSON으로 보낼 데이터 (파일 객체 제외)
      dtos.push({
        name: w.name,
        employeeNumber: w.employeeNumber,
        team: w.team,
        mappedFileName: w.photoFile ? w.photoFile.name : null // 파일명으로 매칭
      });

      // 파일 추가 (files라는 이름으로 리스트 전송)
      if (w.photoFile) {
        formData.append("files", w.photoFile);
      }
    }

    // 2. JSON 데이터 추가
    formData.append("data", JSON.stringify(dtos));

    try {
      // 3. 서버 전송
      const response = await fetch(`${API_BASE_URL}/workers/bulk`, {
        method: "POST",
        body: formData, // Content-Type은 브라우저가 자동으로 설정 (multipart/form-data)
      });

      if (response.ok) {
        alert("일괄 등록이 완료되었습니다.");
        fetchWorkers(); // 목록 새로고침
      } else {
        const errorText = await response.text();
        alert("등록 실패: " + errorText);
      }
    } catch (error) {
      console.error("업로드 오류:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  // 개별 추가 (필요 시 구현, 여기서는 로컬 상태만 업데이트하거나 API 추가 필요)
  const handleAddWorker = (worker: Omit<Worker, 'id'>) => {
    // 실제 구현 시: POST /api/workers 호출 후 fetchWorkers()
    const newWorker = { ...worker, id: Date.now().toString() };
    setWorkers([...workers, newWorker]);
  };

  const handleUpdateWorker = (id: string, updatedWorker: Omit<Worker, 'id'>) => {
    setWorkers(workers.map(w => w.id === id ? { ...w, ...updatedWorker } : w));
  };

  const handleDeleteWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  // 출입 로그 처리 (임시 로컬 상태)
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
                onSelectAdmin={() => setMode('admin')}
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
                onBulkUpload={handleBulkUpload} // 🛠️ 여기서 연결됨
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