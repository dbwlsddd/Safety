import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Shield, UserCog, User } from 'lucide-react';

const ModeSelection = () => {
  const navigate = useNavigate();

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-4 rounded-full">
                <Shield className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">스마트 안전 관리 시스템</h1>
            <p className="text-slate-400">접속하실 모드를 선택해주세요.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 관리자 모드 버튼 */}
            <Card
                className="group cursor-pointer hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 bg-white/5 border-white/10 backdrop-blur"
                onClick={() => navigate('/admin')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-blue-100 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                  <UserCog className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">관리자 모드</h2>
                <p className="text-slate-400">
                  실시간 모니터링, 작업자 관리,<br/>통계 대시보드를 확인합니다.
                </p>
              </CardContent>
            </Card>

            {/* 작업자 모드 버튼 */}
            <Card
                className="group cursor-pointer hover:border-green-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 bg-white/5 border-white/10 backdrop-blur"
                onClick={() => navigate('/worker')} // 작업자 모드 경로 (확인 필요)
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="bg-green-100 p-4 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                  <User className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">작업자 모드</h2>
                <p className="text-slate-400">
                  안전 장비 착용 검사 및<br/>출입 인증을 진행합니다.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center text-slate-500 text-sm">
            © 2024 Smart Safety Management System. All rights reserved.
          </div>
        </div>
      </div>
  );
};

export default ModeSelection;