package com.moneymonitor.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moneymonitor.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Minimal client for any OpenAI-compatible chat completions API. All the free options speak this format:
 * Groq, Google Gemini (OpenAI compatibility endpoint), OpenRouter free models and a local Ollama.
 */
@Slf4j
@Component
public class AiClient {

    public record Message(String role, String content) {}

    private record ProviderDefaults(String baseUrl, String model, boolean needsKey) {}

    private static final Map<String, ProviderDefaults> DEFAULTS = Map.of(
            "groq", new ProviderDefaults("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", true),
            "gemini", new ProviderDefaults("https://generativelanguage.googleapis.com/v1beta/openai", "gemini-2.5-flash", true),
            "openrouter", new ProviderDefaults("https://openrouter.ai/api/v1", "meta-llama/llama-3.3-70b-instruct:free", true),
            "ollama", new ProviderDefaults("http://localhost:11434/v1", "llama3.2", false));

    private final String provider;
    private final String model;
    private final boolean configured;
    private final RestClient restClient;
    private final ObjectMapper mapper;

    public AiClient(AppProperties props, ObjectMapper mapper) {
        this.mapper = mapper;
        AppProperties.Ai cfg = props.ai();
        this.provider = cfg.provider() == null ? "none" : cfg.provider().trim().toLowerCase(Locale.ROOT);
        ProviderDefaults d = DEFAULTS.get(provider);
        String baseUrl = notBlank(cfg.baseUrl()) ? cfg.baseUrl() : d == null ? null : d.baseUrl();
        this.model = notBlank(cfg.model()) ? cfg.model() : d == null ? null : d.model();
        boolean keyOk = notBlank(cfg.apiKey()) || (d != null && !d.needsKey());
        this.configured = !"none".equals(provider) && baseUrl != null && model != null && keyOk;

        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).version(HttpClient.Version.HTTP_1_1).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(Duration.ofSeconds(Math.max(cfg.timeoutSeconds(), 10)));
        RestClient.Builder builder = RestClient.builder().requestFactory(factory);
        if (baseUrl != null) builder.baseUrl(baseUrl);
        if (notBlank(cfg.apiKey())) builder.defaultHeader("Authorization", "Bearer " + cfg.apiKey().trim());
        this.restClient = builder.build();

        if (configured) {
            log.info("AI advisor enabled: provider={}, model={}", provider, model);
        } else {
            log.warn("AI provider not configured (provider={}). Using the built-in rule-based advisor. "
                    + "Set AI_PROVIDER and AI_API_KEY to enable a free LLM (see README).", provider);
        }
    }

    public boolean isConfigured() {
        return configured;
    }

    public String provider() {
        return provider;
    }

    public String model() {
        return model;
    }

    public String sourceLabel() {
        return provider + ":" + model;
    }

    /** Returns the model's reply, or empty if the call failed (callers then fall back to rules). */
    public Optional<String> chat(List<Message> messages, double temperature) {
        if (!configured) {
            return Optional.empty();
        }
        try {
            // Serialized up front so the request has a Content-Length (some providers reject chunked bodies).
            String body = mapper.writeValueAsString(Map.of("model", model, "messages", messages, "temperature", temperature));
            byte[] raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body.getBytes(StandardCharsets.UTF_8))
                    .retrieve()
                    .body(byte[].class);
            JsonNode response = raw == null ? null : mapper.readTree(raw);
            String content = response == null ? null : response.path("choices").path(0).path("message").path("content").asText(null);
            return Optional.ofNullable(content).map(String::trim).filter(s -> !s.isEmpty()).map(AiClient::stripThinking);
        } catch (Exception e) {
            log.warn("AI call to {} failed: {}", provider, e.getMessage());
            return Optional.empty();
        }
    }

    /** Some local reasoning models (e.g. deepseek-r1 on Ollama) prefix their answer with <think>...</think>. */
    private static String stripThinking(String text) {
        return text.replaceAll("(?s)<think>.*?</think>", "").trim();
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
