// server/src/main/java/com/safety/server/config/WebMvcConfig.java

package com.safety.server.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 웹 브라우저에서 /images/파일명.jpg 로 접근하면
        // 실제 서버의 ../images/ 폴더에서 파일을 찾아서 보여줌
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:../images/");
    }
}