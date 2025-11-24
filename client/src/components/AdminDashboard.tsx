import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Cctv, Users, Settings, LogOut, Shield, ClipboardList } from 'lucide-react';
import { Button } from "@/components/ui/button";

// 🔥 [수정] 선언과 동시에 export default
export default function AdminDashboard() {
  const navigate = useNavigate();

  const navItems = [
    { name: '대시보드', path: '/admin', icon: LayoutDashboard, end: true },
    { name: '실시간 관제', path: '/admin/monitor', icon: Cctv },
    { name: '이력 조회', path: '/admin/logs', icon: ClipboardList },
    { name: '작업자 관리', path: '/admin/workers', icon: Users },
    { name: '시스템 설정', path: '/admin/settings', icon: Settings },
  ];

  return (
      <div className="flex h-screen bg-slate-50">
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <Shield className="fill-blue-600 text-white w-8 h-8" />
              Safety Admin
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                            isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                        }`
                    }
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </NavLink>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-100">
            <Button variant="ghost" className="w-full justify-start text-red-500" onClick={() => navigate('/')}>
              <LogOut className="w-5 h-5 mr-2" /> 모드 종료
            </Button>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
  );
}