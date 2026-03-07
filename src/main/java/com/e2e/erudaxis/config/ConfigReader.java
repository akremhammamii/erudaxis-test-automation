package com.e2e.erudaxis.config;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

public class ConfigReader {

    private static final Properties properties = new Properties();
    private static final Map<String, String> dotenv = loadDotEnv();

    static {
        try {
            loadPropertiesFromClasspath("config.properties");
            if (properties.isEmpty()) {
                loadPropertiesFromClasspath("config.properties.example");
            }
            if (properties.isEmpty()) {
                throw new RuntimeException("Neither config.properties nor config.properties.example was found");
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to load config file", e);
        }
    }

    public static String get(String key) {
        String systemValue = System.getProperty(key);
        if (systemValue != null && !systemValue.isEmpty()) {
            return systemValue;
        }

        String envKey = key.toUpperCase().replace(".", "_");
        String envValue = System.getenv(envKey);

        if (envValue != null && !envValue.isEmpty()) {
            return envValue;
        }
        String dotEnvValue = dotenv.get(envKey);
        if (dotEnvValue != null && !dotEnvValue.isEmpty()) {
            return dotEnvValue;
        }

        String value = properties.getProperty(key);
        if (value == null) {
            throw new RuntimeException("Key not found: " + key);
        }
        return resolvePlaceholders(value);
    }

    public static String getBrowser() { return get("browser"); }
    public static String getUrl() { return get("base.url"); }
    public static int getTimeout() { return Integer.parseInt(get("timeout.seconds")); }
    public static int getDashboardTimeout() { return Integer.parseInt(get("dashboard.timeout.seconds")); }
    public static boolean isHeadless() { return Boolean.parseBoolean(get("headless")); }
    public static String getValidEmail() { return get("login.email"); }
    public static String getValidDepartment() { return get("login.department"); }
    public static String getValidPassword() { return get("login.password"); }

    private static String resolvePlaceholders(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.startsWith("${") && trimmed.endsWith("}") && trimmed.length() > 3) {
            String varName = trimmed.substring(2, trimmed.length() - 1);
            String envValue = System.getenv(varName);
            if (envValue != null && !envValue.isEmpty()) {
                return envValue;
            }
            String dotEnvValue = dotenv.get(varName);
            if (dotEnvValue != null && !dotEnvValue.isEmpty()) {
                return dotEnvValue;
            }
            throw new RuntimeException("Missing environment variable: " + varName);
        }
        return value;
    }

    private static Map<String, String> loadDotEnv() {
        Map<String, String> values = new HashMap<>();
        loadDotEnvFile(Path.of(".env"), values);
        loadDotEnvFile(Path.of("src", "test", "resources", ".env"), values);
        return Collections.unmodifiableMap(values);
    }

    private static void loadDotEnvFile(Path path, Map<String, String> values) {
        if (!Files.exists(path)) {
            return;
        }
        try {
            for (String rawLine : Files.readAllLines(path, StandardCharsets.UTF_8)) {
                String line = rawLine.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int idx = line.indexOf('=');
                if (idx <= 0) {
                    continue;
                }
                String key = line.substring(0, idx).trim();
                String val = line.substring(idx + 1).trim();
                if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.substring(1, val.length() - 1);
                }
                if (!key.isEmpty()) {
                    values.putIfAbsent(key, val);
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to load .env file: " + path, e);
        }
    }

    private static void loadPropertiesFromClasspath(String fileName) throws IOException {
        try (InputStream input = ConfigReader.class
                .getClassLoader()
                .getResourceAsStream(fileName)) {
            if (input != null) {
                properties.load(input);
            }
        }
    }
}
