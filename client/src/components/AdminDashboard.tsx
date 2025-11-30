import { useState } from 'react';
import { Users, FileText, Settings, LogOut, LayoutDashboard, Menu } from 'lucide-react';
import WorkerManagement, { WorkerFormData } from './WorkerManagement'; // 🛠️ 타입 임포트
import { AccessLog } from './AccessLog';
import SystemSettings from './SystemSettings';
import Dashboard from './Dashboard';
import { Worker, AccessLogEntry, SystemConfig } from '../types';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Button } from './ui/button';

interface AdminDashboardProps {
  workers: Worker[];
  logs: AccessLogEntry[];
  config: SystemConfig;
  // 🛠️ 타입 수정: WorkerFormData 사용
  onAddWorker: (worker: WorkerFormData) => void;
  onUpdateWorker: (id: string, worker: WorkerFormData) => void;
  onDeleteWorker: (id: string) => void;
  onBulkUpload: (workers: any[]) => void;
  onDeleteLog: (id: string) => void;
  onSaveConfig: (config: SystemConfig) => void;
  onLogout: () => void;
}

type MenuItem = 'dashboard' | 'workers' | 'logs' | 'settings';

export default function AdminDashboard({
                                 workers,
                                 logs,
                                 config,
                                 onAddWorker,
                                 onUpdateWorker,
                                 onDeleteWorker,
                                 onBulkUpload,
                                   onBulkDelete,
                                 onDeleteLog,
                                 onSaveConfig,
                                 onLogout,
                               }: AdminDashboardProps) {
  const [selectedMenu, setSelectedMenu] = useState<MenuItem>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard' as MenuItem, label: '대시보드', icon: LayoutDashboard },
    { id: 'workers' as MenuItem, label: '작업자 관리', icon: Users },
    { id: 'logs' as MenuItem, label: '출입/검사 로그', icon: FileText },
    { id: 'settings' as MenuItem, label: '시스템 설정', icon: Settings },
  ];

  const handleMenuClick = (menuId: MenuItem) => {
    setSelectedMenu(menuId);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
      <div className="flex flex-col h-full">
        {/* 로고 영역 */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white" style={{ fontWeight: 700 }}>관리자 모드</h3>
              <p className="text-gray-400 text-xs font-medium">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedMenu === item.id;
              return (
                  <li key={item.id}>
                    <button
                        onClick={() => handleMenuClick(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                            isSelected
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  </li>
              );
            })}
          </ul>
        </nav>

        {/* 로그아웃 버튼 */}
        <div className="p-4 border-t border-slate-800">
          <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-slate-900 transition-all font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </div>
  );

  return (
      <div className="size-full flex bg-black">
        {/* 데스크톱 사이드바 */}
        <aside className="hidden lg:flex lg:w-64 bg-slate-950 border-r border-slate-800 flex-col">
          <SidebarContent />
        </aside>

        {/* 모바일 사이드바 (Sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-slate-950 border-slate-800">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-auto bg-black flex flex-col">
          {/* 모바일 헤더 */}
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-slate-900"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
              <div>
                <h3 className="text-white text-sm" style={{ fontWeight: 700 }}>관리자 모드</h3>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {selectedMenu === 'dashboard' && (
                <Dashboard logs={logs} />
            )}
            {selectedMenu === 'workers' && (
                <WorkerManagement
                    workers={workers}
                    onAddWorker={onAddWorker}
                    onUpdateWorker={onUpdateWorker}
                    onDeleteWorker={onDeleteWorker}
                    onBulkUpload={onBulkUpload}
                    onBulkDelete={onBulkDelete}
                />
            )}
            {selectedMenu === 'logs' && (
                <AccessLog logs={logs} onDeleteLog={onDeleteLog} />
            )}
            {selectedMenu === 'settings' && (
                <SystemSettings config={config} onSaveConfig={onSaveConfig} />
            )}
          </div>
        </main>
      </div>
  );
}