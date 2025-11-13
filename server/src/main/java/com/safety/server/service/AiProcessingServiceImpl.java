package com.safety.server.service;

import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class AiProcessingServiceImpl implements AiProcessingService {

    // application.properties에서 AI 서버 주소를 읽어옵니다. (설정 필요)
    @Value("${ai.server.url:http://localhost:8000}")
    private String aiServerBaseUrl;

    private final RestTemplate restTemplate;

    // 생성자에서 RestTemplate을 초기화합니다.
    public AiProcessingServiceImpl() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public WorkerRecognitionResult processFrameForRecognition(byte[] imageBytes) {

        // 1. byte[] -> Base64 String 변환
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        // 2. 요청 본문(Request Body) 생성 (Python의 ImageInput 모델과 일치)
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("image_base64", base64Image);

        // 3. HTTP 헤더 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // 4. HttpEntity 생성 (헤더 + 본문)
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

        // 5. AI 서버 엔드포인트 호출
        String url = aiServerBaseUrl + "/recognize_worker";

        try {
            // 응답은 Python에서 보낸 JSON 문자열을 Map으로 받습니다.
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response == null || !response.containsKey("status")) {
                throw new RuntimeException("AI 서버로부터 유효하지 않은 응답을 받았습니다.");
            }

            String status = (String) response.get("status");

            if ("SUCCESS".equals(status)) {
                // 인식 성공
                Map<String, String> workerData = (Map<String, String>) response.get("worker");
                return new WorkerRecognitionResult(
                        true,
                        workerData.get("id"),
                        workerData.get("name")
                );
            } else {
                // 인식 실패 (FAILURE 또는 ERROR)
                String message = (String) response.getOrDefault("message", "인식 실패");
                System.out.println("AI 서버 인식 실패: " + message);
                return new WorkerRecognitionResult(false, null, null);
            }

        } catch (Exception e) {
            // 통신 오류, 타임아웃 등
            System.err.println("AI 서버 통신 중 오류 발생: " + e.getMessage());
            // 프론트엔드에게 즉시 오류를 알릴 수 있도록 여기서 RuntimeException을 던집니다.
            throw new RuntimeException("AI 서버와 통신 중 문제가 발생했습니다. (" + e.getMessage() + ")");
        }
    }
}