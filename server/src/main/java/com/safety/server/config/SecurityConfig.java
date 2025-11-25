package com.safety.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS 설정 적용 (가장 먼저 실행되어야 함)
                // 이 설정이 없으면 POST/PUT/DELETE 시 발생하는 예비 요청(OPTIONS)이 Spring Security 필터에서 막힐 수 있음
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 보호 비활성화
                .csrf(csrf -> csrf.disable())

                // 3. 세션 관리를 STATELESS로 설정
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 4. 인가(Authorization) 규칙 설정
                .authorizeHttpRequests(authorize ->
                        authorize
                                // React가 접속할 API 및 WebSocket 엔드포인트 전면 허용
                                .requestMatchers("/ws/video/**", "/api/**").permitAll()
                                // 개발 편의를 위해 모든 요청 허용 (운영 시에는 authenticated() 권장)
                                .anyRequest().permitAll()
                );

        return http.build();
    }

    // 🛠️ [핵심] CORS 허용 설정 Bean 추가
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 1. 허용할 오리진 (React 주소. 개발 중에는 모든 주소 허용 패턴 사용)
        config.setAllowedOriginPatterns(List.of("*"));

        // 2. 허용할 HTTP 메서드 (GET, POST, PUT, DELETE, OPTIONS 모두 허용)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // 3. 허용할 헤더 (모든 헤더 허용)
        config.setAllowedHeaders(List.of("*"));

        // 4. 자격 증명(쿠키 등) 허용 여부
        config.setAllowCredentials(true);

        // 위 설정을 모든 경로(/**)에 적용
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}