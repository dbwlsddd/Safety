package com.safety.server.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.stereotype.Component;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class VideoWebSocketHandler extends TextWebSocketHandler {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final ConcurrentMap<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    // 생성자 주입
    public VideoWebSocketHandler(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        System.out.println("[WebSocket] 클라이언트 연결됨: " + session.getId());
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        String payload = message.getPayload();

        try {
            // 1. 수신된 JSON 데이터를 DTO로 파싱
            WorkerRecognitionResult result = objectMapper.readValue(payload, WorkerRecognitionResult.class);

            // 2. 인식이 성공했고, 작업자 정보가 있는 경우에만 처리
            if ("SUCCESS".equals(result.getStatus()) && result.getWorker() != null) {

                // 3. STOMP Topic으로 브로드캐스팅 (/topic/safety-realtime)
                // 관리자 대시보드가 이 토픽을 구독하고 있습니다.
                messagingTemplate.convertAndSend("/topic/safety-realtime", result);

                // 로그 출력 (디버깅용)
                if (result.getPpeStatus() != null) {
                    String safetyLog = result.getPpeStatus().isSafe() ? "✅ 안전" : "🚨 위반";
                    System.out.println("[실시간 감지] " + result.getWorker().getName() + " -> " + safetyLog);
                }
            }

        } catch (Exception e) {
            System.err.println("데이터 처리 중 오류 발생: " + e.getMessage());
            // 필요 시 에러 응답 전송 로직 추가 가능
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session.getId());
        System.out.println("[WebSocket] 클라이언트 연결 종료: " + session.getId());
    }
}