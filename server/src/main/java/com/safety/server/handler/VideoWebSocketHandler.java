package com.safety.server.handler;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import java.io.IOException;

@Component
public class VideoWebSocketHandler extends AbstractWebSocketHandler {

    // TODO: 여기에 욜로(YOLO) AI 서버로 연결할 소켓 클라이언트 로직 추가

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // 프론트엔드(React)에서 웹소켓 연결을 시도하면 이 함수가 실행됩니다.
        System.out.println("프론트엔드 연결 성공 (세션 ID: " + session.getId() + ")");
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws IOException {
        // 프론트에서 10프레임마다 캡처해서 보낸 '이미지 프레임' (바이너리 데이터)이 여기로 들어옵니다.
        System.out.println(message.getPayloadLength() + " 바이트의 이미지 프레임 수신됨.");

        // [핵심 로직]
        // TODO: 이 'message.getPayload()'를 욜로(YOLO) AI 서버로 전송(중계)하는
        // 별도의 소켓 클라이언트 코드가 여기에 구현되어야 합니다.
        // (카톡 태스크 3번: "스프링부는 받은 이미지를 소켓으로 올11n한테 보내기")
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        System.out.println("프론트엔드 연결 끊김 (세션 ID: " + session.getId() + ")");
    }
}