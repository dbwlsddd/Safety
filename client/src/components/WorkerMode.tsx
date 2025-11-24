import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, ArrowLeft, RefreshCw } from 'lucide-react';
import MonitoringScreen from './MonitoringScreen'; // 🔥 [구조] MonitoringScreen 사용
import { RecognitionResult } from '../types';

const WEBSOCKET_URL = "wss://100.64.239.86:9000/ws/face";
const FRAME_SEND_INTERVAL_MS = 500;

// 🔥 [수정] 선언과 동시에 export default
export default function WorkerMode() {
  const navigate = useNavigate();

  const [workerState, setWorkerState] = useState<RecognitionResult | null>(null);
  const [isCamReady, setIsCamReady] = useState(false);
  const [wsStatus, setWsStatus] = useState("서버 연결 대기 중...");

  const webcamRef = useRef<Webcam>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 카메라 시작
  useEffect(() => {
    const startCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setIsCamReady(true);
      } catch (e) {
        setWsStatus("카메라 접근 불가");
      }
    };
    startCamera();
  }, []);

  // 웹소켓 통신
  useEffect(() => {
    if (!isCamReady) return;

    const ws = new WebSocket(WEBSOCKET_URL);
    websocketRef.current = ws;

    ws.onopen = () => {
      setWsStatus("AI 분석 중");
      intervalRef.current = setInterval(() => {
        if (webcamRef.current && ws.readyState === WebSocket.OPEN) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) ws.send(JSON.stringify({ image: imageSrc }));
        }
      }, FRAME_SEND_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'SUCCESS' || data.ppe_status) {
          setWorkerState(data);
        }
      } catch (e) { console.error(e); }
    };

    ws.onclose = () => setWsStatus("서버 연결 끊김");
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      ws.close();
    };
  }, [isCamReady]);

  const handleCheckIn = () => {
    alert(`${workerState?.worker?.name}님 출입 승인`);
    navigate('/');
  };

  const handleReset = () => setWorkerState(null);

  return (
      <div className="h-screen w-screen bg-slate-100 dark:bg-black p-4 sm:p-6 flex flex-col">
        <div className="flex justify-between mb-4">
          <Button onClick={() => navigate('/')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2"/> 메인 화면
          </Button>
        </div>

        <div className="flex-1 min-h-0">
          {/* 🔥 [구조] MonitoringScreen에 데이터와 UI 주입 */}
          <MonitoringScreen
              state={workerState}
              statusMessage={wsStatus}
              videoSlot={
                isCamReady ? (
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        className="w-full h-full object-cover"
                        mirrored={true}
                        screenshotFormat="image/jpeg"
                    />
                ) : (
                    <div className="text-white flex items-center justify-center h-full">카메라 로딩 중...</div>
                )
              }
          >
            <div className="flex gap-3 w-full">
              <Button onClick={handleReset} variant="secondary" className="flex-1 h-14">
                <RefreshCw className="mr-2 h-5 w-5" /> 다시 인식
              </Button>
              <Button
                  onClick={handleCheckIn}
                  className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700"
                  disabled={!workerState?.ppe_status?.is_safe}
              >
                <LogIn className="mr-2 h-5 w-5" /> 출입 승인
              </Button>
            </div>
          </MonitoringScreen>
        </div>
      </div>
  );
}