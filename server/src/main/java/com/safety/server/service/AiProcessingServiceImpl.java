package com.safety.server.service;

import com.safety.server.dto.WorkerDto;
import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiProcessingServiceImpl implements AiProcessingService {

    @Value("${ai.server.url:http://localhost:9000}")
    private String aiServerBaseUrl;

    private final RestTemplate restTemplate;

    public AiProcessingServiceImpl() {
        this.restTemplate = new RestTemplate();
    }

    // ... [기존 processFrameForRecognition 메서드는 그대로 유지] ...
    @Override
    public WorkerRecognitionResult processFrameForRecognition(byte[] imageBytes) {
        // (기존 코드 생략 - 위에서 그대로 유지한다고 가정)
        return new WorkerRecognitionResult();
    }

    // 🛠️ [신규] Python 서버로 파일 전송 및 벡터 추출
    @Override
    public List<Double> extractFaceVector(MultipartFile file) {
        String url = aiServerBaseUrl + "/vectorize";

        try {
            // 1. Multipart 요청 구성
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // MultipartFile을 ByteArrayResource로 변환하여 전송
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            body.add("file", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // 2. Python 서버 호출
            Map response = restTemplate.postForObject(url, requestEntity, Map.class);

            // 3. 응답 처리
            if (response != null && "SUCCESS".equals(response.get("status"))) {
                // 벡터 리스트 반환
                return (List<Double>) response.get("vector");
            } else {
                String msg = response != null ? (String) response.get("message") : "Unknown Error";
                throw new RuntimeException("AI 서버 벡터 추출 실패: " + msg);
            }

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("AI 서버 통신 오류: " + e.getMessage());
        }
    }
}