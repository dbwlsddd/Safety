package com.safety.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS 설정을 가장 먼저 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 비활성화
                .csrf(csrf -> csrf.disable())

                // 3. 세션 STATELESS 설정
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 4. 인가 설정
                .authorizeHttpRequests(authorize ->
                        authorize
                                // ⚠️ Preflight 요청(OPTIONS)은 인증 없이 무조건 허용해야 함 (중요)
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                // API 및 소켓 경로 허용
                                .requestMatchers("/ws/video/**", "/api/**").permitAll()
                                .anyRequest().permitAll()
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 🛠️ [수정] 와일드카드(*) 대신 프론트엔드 IP를 명시적으로 허용
        // 리액트가 실행되는 주소(포트 3000)를 정확히 적어주세요.
        config.setAllowedOrigins(List.of(
                "https://100.64.239.86:3000",
                "http://100.64.239.86:3000",
                "http://localhost:3000",
                "https://localhost:3000"
        ));

        // 허용할 메서드
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // 허용할 헤더
        config.setAllowedHeaders(Arrays.asList("*"));

        // 자격 증명 허용 (쿠키, 인증헤더 등)
        config.setAllowCredentials(true);

        // 브라우저가 Preflight 응답을 캐싱할 시간 (초) - 불필요한 예비 요청 줄임
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}