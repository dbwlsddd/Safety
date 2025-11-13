package com.safety.server.config;

import com.safety.server.handler.VideoWebSocketHandler; // 2단계에서 만든 핸들러
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket // 스프링부트의 웹소켓 기능을 활성화합니다.
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private VideoWebSocketHandler videoWebSocketHandler; // 2단계에서 만든 핸들러를 주입받음

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // 프론트엔드(React)가 접속할 엔드포인트(주소)를 '/ws/video'로 설정합니다.
        registry.addHandler(videoWebSocketHandler, "/ws/video")
                .setAllowedOrigins("*"); // TODO: 나중에는 "*" 대신 프론트엔드 주소만 허용
    }
}