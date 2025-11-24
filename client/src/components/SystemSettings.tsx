import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save } from 'lucide-react';

// 🔥 [수정] 선언과 동시에 export default
export default function SystemSettings() {
  return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">시스템 설정</h2>
          <p className="text-muted-foreground">카메라, 알림 및 시스템 환경설정을 구성합니다.</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>위반 사항 감지 시 알림 방식을 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>경고음 출력</Label>
                  <p className="text-sm text-muted-foreground">보호구 미착용 감지 시 경고음을 재생합니다.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>관리자 팝업 알림</Label>
                  <p className="text-sm text-muted-foreground">대시보드에 긴급 팝업을 띄웁니다.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>서버 연결 설정</CardTitle>
              <CardDescription>AI 서버 및 데이터베이스 연결 정보를 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="ai-url">AI Server URL</Label>
                <Input id="ai-url" defaultValue="wss://100.64.239.86:8080/ws-stomp" />
              </div>
              <Button className="w-full sm:w-auto">
                <Save className="mr-2 h-4 w-4" /> 설정 저장
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}