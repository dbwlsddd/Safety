package com.safety.server.service;

import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AiProcessingService {
    // 기존 메서드 (영상 스트림 처리용)
    WorkerRecognitionResult processFrameForRecognition(byte[] imageBytes);

    // 🛠️ [신규] 이미지 파일을 보내 얼굴 벡터를 추출하는 메서드
    List<Double> extractFaceVector(MultipartFile file);
}