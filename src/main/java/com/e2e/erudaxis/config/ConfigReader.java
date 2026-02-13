package com.e2e.erudaxis.config;

import java.io.InputStream;
import java.util.Properties;

public class ConfigReader {

    private static final Properties properties = new Properties();

    static {
        try {
            InputStream input = ConfigReader.class
                    .getClassLoader()
                    .getResourceAsStream("config.properties");

            if (input == null) {
                throw new RuntimeException("config.properties not found");
            }

            properties.load(input);

        } catch (Exception e) {
            throw new RuntimeException("Failed to load config file", e);
        }
    }

    public static String get(String key) {
        String value = properties.getProperty(key);
        if (value == null) {
            throw new RuntimeException("Key not found: " + key);
        }
        return value;
    }

    public static String getBrowser() {
        return get("browser");
    }

    public static String getUrl() {
        return get("base.url");
    }

    public static int getTimeout() {
        return Integer.parseInt(get("timeout.seconds"));
    }

    public static boolean isHeadless() {
        return Boolean.parseBoolean(get("headless"));
    }

    public static String getValidEmail(){
        return get("login.email");
    }
    public static String getTestDepartment() {return get("test.department");}
    public static String getValidPassword(){
        return get("login.password");
    }



}
