package com.safety.server.service;

import com.safety.server.dto.WorkerRecognitionResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import javax.net.ssl.*;
        import java.io.IOException;
import java.net.HttpURLConnection;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Map;

@Service
public class AiProcessingServiceImpl implements AiProcessingService {

    // 🛠️ [수정] 기본 주소를 https로 변경
    @Value("${ai.server.url:https://localhost:9000}")
    private String aiServerBaseUrl;

    private final RestTemplate restTemplate;

    public AiProcessingServiceImpl() {
        // 🛠️ [수정] 보안 검증을 무시하는 커스텀 RestTemplate 생성
        this.restTemplate = createSslIgnoringRestTemplate();
    }

    // 🔐 [핵심] 모든 인증서를 신뢰하는 RestTemplate 생성 메서드
    private RestTemplate createSslIgnoringRestTemplate() {
        try {
            // 1. 모든 인증서를 믿는 TrustManager 생성
            TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() { return null; }
                        public void checkClientTrusted(X509Certificate[] certs, String authType) {}
                        public void checkServerTrusted(X509Certificate[] certs, String authType) {}
                    }
            };

            // 2. SSL 컨텍스트 초기화
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());

            // 3. 요청 팩토리에 커스텀 SSL 소켓 팩토리와 호스트네임 검증기(무조건 통과) 설정
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
                @Override
                protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws IOException {
                    if (connection instanceof HttpsURLConnection) {
                        ((HttpsURLConnection) connection).setSSLSocketFactory(sc.getSocketFactory());
                        ((HttpsURLConnection) connection).setHostnameVerifier((hostname, session) -> true);
                    }
                    super.prepareConnection(connection, httpMethod);
                }
            };

            return new RestTemplate(factory);
        } catch (Exception e) {
            throw new RuntimeException("SSL 우회 RestTemplate 생성 실패", e);
        }
    }

    @Override
    public WorkerRecognitionResult processFrameForRecognition(byte[] imageBytes) {
        // (기존 코드 유지 - 생략)
        return new WorkerRecognitionResult();
    }

    @Override
    public List<Double> extractFaceVector(MultipartFile file) {
        String url = aiServerBaseUrl + "/vectorize";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            body.add("file", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // HTTPS 요청 전송 (위에서 만든 보안 무시 RestTemplate 사용)
            Map response = restTemplate.postForObject(url, requestEntity, Map.class);

            if (response != null && "SUCCESS".equals(response.get("status"))) {
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