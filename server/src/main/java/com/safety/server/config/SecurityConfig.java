package com.safety.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CSRF 보호 비활성화 (WebSocket은 CSRF 토큰을 사용하기 어려움)
                .csrf(csrf -> csrf.disable())

                // 2. 세션 관리를 STATELESS로 설정 (REST API + WebSocket에 적합)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 3. 인가(Authorization) 규칙 설정
                .authorizeHttpRequests(authorize ->
                        authorize
                                // 4. [가장 중요] React가 접속할 /ws/video 엔드포인트는 인증 없이 허용
                                .requestMatchers("/ws/video/**", "/api/**").permitAll()

                                // 5. 그 외 모든 요청은 일단 인증을 요구하도록 설정 (선택 사항)
                                //.anyRequest().authenticated()
                                .anyRequest().permitAll()
                );

        return http.build();
    }
}