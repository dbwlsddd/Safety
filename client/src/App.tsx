import { Routes, Route } from 'react-router-dom';
import ModeSelection from './components/ModeSelection';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './components/Dashboard';
import MonitoringScreen from './components/MonitoringScreen';

// 🛠️ [최종 수정] 아래 3개는 중괄호 없이 가져옵니다.
import WorkerManagement from './components/WorkerManagement';
import SystemSettings from './components/SystemSettings';
import WorkerMode from '@/components/WorkerMode';

function App() {
    return (
        <Routes>
            {/* 1. 메인: 모드 선택 화면 */}
            <Route path="/" element={<ModeSelection />} />

            {/* 2. 관리자 모드 (레이아웃) */}
            <Route path="/admin" element={<AdminDashboard />}>
                {/* /admin 접속 시 기본 통계 대시보드 */}
                <Route index element={<Dashboard />} />

                {/* /admin/monitor 접속 시 실시간 관제 화면 */}
                <Route path="monitor" element={<MonitoringScreen />} />

                {/* /admin/workers 접속 시 작업자 관리 화면 */}
                <Route path="workers" element={<WorkerManagement />} />

                {/* /admin/settings 접속 시 시스템 설정 화면 */}
                <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* 3. 작업자 모드 */}
            <Route path="/worker" element={<WorkerMode />} />
        </Routes>
    );
}

export default App;