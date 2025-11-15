// server/src/main/java/com/safety/server/handler/VideoWebSocketHandler.java

package com.safety.server.handler;

// ... (기존 import)
import java.io.IOException; // ❗️ 이 import는 여전히 필요합니다.
import java.nio.ByteBuffer;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safety.server.dto.WorkerRecognitionResult;
import com.safety.server.service.AiProcessingService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class VideoWebSocketHandler extends AbstractWebSocketHandler {

    @Autowired
    private AiProcessingService aiProcessingService;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("프론트엔드 연결 성공: {}", session.getId());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        // ❗️ try 블록은 그대로 둡니다.
        try {
            ByteBuffer byteBuffer = message.getPayload();
            byte[] frameData = new byte[byteBuffer.remaining()];
            byteBuffer.get(frameData);

            if (frameData.length == 0) {
                log.warn("빈 프레임 수신: {}", session.getId());
                return;
            }

            // AI 서비스 호출
            WorkerRecognitionResult result = aiProcessingService.processFrameForRecognition(frameData);

            // 성공 응답 전송
            Map<String, Object> response = new HashMap<>();
            if (result != null && "SUCCESS".equals(result.getStatus())) {
                response.put("status", "SUCCESS");
                response.put("message", result.getMessage());
                response.put("worker", result.getWorker());
            } else {
                response.put("status", "FAILURE");
                response.put("message", result != null ? result.getMessage() : "인식된 작업자 없음");
            }
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));

        } catch (Exception e) { // ❗️ (1차 오류) AI 서비스 오류(RuntimeException)가 여기서 잡힙니다.
            log.error("AI 서버 통신 및 처리 오류: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", "AI 서버 통신 및 처리 오류: " + e.getMessage());

            // ❗️ [수정된 부분]
            // 클라이언트에게 오류 응답을 보내는 과정에서도 예외가 발생할 수 있으므로,
            // IOException만 잡는 대신 모든 Exception을 잡도록 변경합니다.
            try {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(errorResponse)));
            } catch (Exception innerException) { // ❗️ IOException -> Exception
                log.error("AI 서버 오류 응답 전송 실패 (이것이 연결 끊김의 원인이었을 수 있음): {}", innerException.getMessage());
                // 이 예외는 다시 던지지 않습니다. (연결 유지를 위해)
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("웹소켓 전송 오류 발생: {} - {}", session.getId(), exception.getMessage());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("프론트엔드 연결 끊김: {} (Code: {}, Reason: {})", session.getId(), status.getCode(), status.getReason());
    }
}