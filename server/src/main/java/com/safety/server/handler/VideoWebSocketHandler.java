package com.safety.server.handler;

import com.safety.server.service.AiProcessingService;
import com.safety.server.dto.WorkerRecognitionResult; // AI 서비스의 응답 DTO를 가정
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import org.springframework.web.socket.TextMessage;
import java.io.IOException;

// 이 핸들러는 AiProcessingService를 통해 AI 서버와 통신합니다.
@Component
public class VideoWebSocketHandler extends AbstractWebSocketHandler {

    private final AiProcessingService aiProcessingService;

    // 생성자 주입 (AI 서버 통신 서비스를 주입받습니다)
    @Autowired
    public VideoWebSocketHandler(AiProcessingService aiProcessingService) {
        this.aiProcessingService = aiProcessingService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("프론트엔드 연결 성공 (세션 ID: " + session.getId() + ")");
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws IOException {
        // 프론트에서 10프레임마다 캡처해서 보낸 '이미지 프레임' (바이너리 데이터)이 여기로 들어옵니다.
        int payloadLength = message.getPayloadLength();
        System.out.println(payloadLength + " 바이트의 이미지 프레임 수신됨.");

        // 웹소켓 세션이 열려있는지 다시 한번 확인
        if (!session.isOpen()) {
            System.out.println("세션이 닫혀있어 프레임을 처리할 수 없습니다.");
            return;
        }

        // [핵심 로직]
        try {
            // 1. AiProcessingService를 사용하여 이미지 프레임을 AI 서버로 전송하고 결과를 받습니다.
            // (이 서비스 내부에서 바이너리 -> Base64 인코딩 및 HTTP 통신이 이루어집니다.)
            WorkerRecognitionResult result = aiProcessingService.processFrameForRecognition(
                    message.getPayload().array() // ByteBuffer를 byte[] 배열로 변환
            );

            // 2. AI 서버 응답을 프론트엔드가 기대하는 JSON 형식으로 변환하여 전송합니다.
            String jsonResponse;

            if (result.isRecognized()) {
                // 인식 성공 시 (WorkerMode.tsx의 기대 형식: SUCCESS)
                jsonResponse = String.format(
                        "{\"status\": \"SUCCESS\", \"worker\": {\"id\": \"%s\", \"name\": \"%s\"}}",
                        result.getId(), result.getName()
                );
            } else {
                // 인식 실패 시
                jsonResponse = "{\"status\": \"FAILURE\", \"message\": \"인식된 작업자가 없습니다.\"}";
            }

            // 프론트엔드로 응답 전송
            session.sendMessage(new TextMessage(jsonResponse));

        } catch (Exception e) {
            System.err.println("AI 서버 통신 및 처리 오류: " + e.getMessage());
            // 프론트엔드에 오류 메시지 전송
            String errorResponse = String.format(
                    "{\"status\":\"ERROR\", \"message\":\"AI 서버 처리 오류: %s\"}",
                    e.getMessage().replaceAll("\"", "'") // JSON 문자열 내의 따옴표 충돌 방지
            );
            session.sendMessage(new TextMessage(errorResponse));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        System.out.println("프론트엔드 연결 끊김 (세션 ID: " + session.getId() + ")");
    }
}