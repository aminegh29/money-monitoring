package com.moneymonitor.config;

import com.moneymonitor.domain.Role;
import com.moneymonitor.security.CustomUserDetailsService;
import com.moneymonitor.security.JwtService;
import com.moneymonitor.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Real-time channel. Clients connect to ws://localhost:8080/ws with a STOMP CONNECT frame carrying
 * "Authorization: Bearer <jwt>", then subscribe to:
 *   /user/queue/events  - their own data changes and notifications
 *   /topic/admin        - platform-wide activity (admins only)
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;
    private final AppProperties props;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(props.corsOriginPatterns().toArray(String[]::new));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null) {
                    return message;
                }
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String header = accessor.getFirstNativeHeader("Authorization");
                    if (header == null || !header.startsWith("Bearer ")) {
                        throw new MessagingException("Missing token");
                    }
                    String email = jwtService.validateAndGetEmail(header.substring(7))
                            .orElseThrow(() -> new MessagingException("Invalid token"));
                    UserPrincipal user = userDetailsService.loadUserByUsername(email);
                    if (!user.isEnabled()) {
                        throw new MessagingException("Account disabled");
                    }
                    accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    if (destination != null && destination.startsWith("/topic/admin") && !isAdmin(accessor)) {
                        throw new MessagingException("Forbidden");
                    }
                }
                return message;
            }
        });
    }

    private boolean isAdmin(StompHeaderAccessor accessor) {
        return accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth
                && auth.getPrincipal() instanceof UserPrincipal p
                && p.role() == Role.ADMIN;
    }
}
