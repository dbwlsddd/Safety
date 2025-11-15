package com.safety.server.service;

// ❗️ DTO 임포트 추가
import com.safety.server.dto.WorkerDto;
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
            String message = (String) response.getOrDefault("message", "");

            // ❗️ [수정된 부분]
            // 새로운 WorkerRecognitionResult DTO 객체 생성
            WorkerRecognitionResult resultDto = new WorkerRecognitionResult();
            resultDto.setStatus(status);
            resultDto.setMessage(message);

            if ("SUCCESS".equals(status)) {
                // 인식 성공 시, 중첩된 worker Map을 WorkerDto로 변환
                Map<String, Object> workerData = (Map<String, Object>) response.get("worker");

                if (workerData != null) {
                    WorkerDto workerDto = new WorkerDto();
                    // ❗️ String.valueOf()를 사용하여 AI 서버가 id를 int로 보내도 안전하게 String으로 변환
                    workerDto.setId(String.valueOf(workerData.get("id")));
                    workerDto.setName((String) workerData.get("name"));
                    workerDto.setTeam((String) workerData.get("team"));
                    // ❗️ AI 서버가 employeeNumber를 보내준다고 가정 (DB 스키마 기반)
                    //    (만약 Python이 worker_id를 employeeNumber로 보내기로 했다면 이 코드가 맞습니다)
                    workerDto.setEmployeeNumber(String.valueOf(workerData.get("employeeNumber")));

                    resultDto.setWorker(workerDto);
                } else {
                    // SUCCESS인데 worker 객체가 없는 비정상 상황
                    resultDto.setStatus("FAILURE");
                    resultDto.setMessage("인식 성공 응답을 받았으나, 작업자 정보가 누락되었습니다.");
                }
            }

            // 완성된 DTO 반환 (SUCCESS, FAILURE, ERROR 공통)
            return resultDto;

        } catch (Exception e) {
            // 통신 오류, 타임아웃 등
            System.err.println("AI 서버 통신 중 오류 발생: " + e.getMessage());
            // ❗️ [수정된 부분]
            // 예외를 던지는 대신, VideoWebSocketHandler가 처리할 수 있도록
            // ERROR 상태를 가진 DTO를 반환합니다. (연결 끊김 방지)
            // -> (정정) 핸들러가 catch하고 있으므로 예외를 던지는 것이 맞습니다. (이전 코드 유지)
            throw new RuntimeException("AI 서버와 통신 중 문제가 발생했습니다. (" + e.getMessage() + ")");
        }
    }
}