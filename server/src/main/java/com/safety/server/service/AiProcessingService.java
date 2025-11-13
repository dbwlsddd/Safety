package com.safety.server.service;

import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.stereotype.Service;

// src/main/java/com/safety/server/service/AiProcessingService.java
@Service
public interface AiProcessingService {
    /**
     * 프론트엔드에서 받은 이미지 프레임을 AI 서버로 전송하고 인식 결과를 반환합니다.
     * @param imageBytes 이미지의 바이너리 데이터 (byte 배열)
     * @return 인식된 작업자 정보
     */
    WorkerRecognitionResult processFrameForRecognition(byte[] imageBytes);
}