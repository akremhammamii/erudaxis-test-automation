package com.e2e.erudaxis.hooks;

import com.e2e.erudaxis.config.ConfigReader;
import com.e2e.erudaxis.utils.DriverManager;
import io.cucumber.java.After;
import io.cucumber.java.AfterStep;
import io.cucumber.java.Before;
import io.cucumber.java.Scenario;
import io.qameta.allure.Allure;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Hooks pour le cycle de vie des tests Cucumber
 */
public class Hooks {

    private static final Logger logger = LoggerFactory.getLogger(Hooks.class);
    private static final ThreadLocal<Boolean> SCREENSHOT_CAPTURED =
            ThreadLocal.withInitial(() -> Boolean.FALSE);
    private static final AtomicBoolean ALLURE_BOOTSTRAPPED = new AtomicBoolean(false);

    @Before
    public void setup() {
        logger.info("Initialisation du test");
        bootstrapAllureMetadata();

        DriverManager.initDriver();
        DriverManager.getDriver().get(ConfigReader.getUrl());
        SCREENSHOT_CAPTURED.set(Boolean.FALSE);

        logger.info("Setup termine");
    }

    @AfterStep
    public void afterStep(Scenario scenario) {
        if (scenario.isFailed()) {
            try {
                WebDriver driver = DriverManager.getDriver();
                if (driver != null) {
                    captureScreenshot(scenario);
                } else {
                    logger.warn("WebDriver is null in afterStep, skipping screenshot");
                }
            } catch (Exception e) {
                logger.error("Error in afterStep: {}", e.getMessage());
            }
        }
    }

    @After
    public void tearDown(Scenario scenario) {
        try {
            if (scenario.isFailed() && !Boolean.TRUE.equals(SCREENSHOT_CAPTURED.get())) {
                logger.warn("Scenario echoue : {}", scenario.getName());
                captureScreenshot(scenario);
            } else {
                logger.info("Scenario reussi : {}", scenario.getName());
            }
        } finally {
            try {
                DriverManager.quitDriver();
            } finally {
                // ✅ FIX : Cleanup garanti du ThreadLocal même en cas d'exception
                SCREENSHOT_CAPTURED.remove();
                logger.info("Teardown termine");
            }
        }
    }

    private void captureScreenshot(Scenario scenario) {
        try {
            WebDriver driver = DriverManager.getDriver();
            if (driver == null) {
                logger.warn("WebDriver null, screenshot skipped");
                return;
            }
            if (!(driver instanceof TakesScreenshot)) {
                logger.warn("WebDriver ne supporte pas les screenshots");
                return;
            }
            byte[] screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
            String name = "screenshot-" + scenario.getName();
            Allure.addAttachment(name, "image/png", new ByteArrayInputStream(screenshot), ".png");
            attachFailureContext(scenario, driver);
            SCREENSHOT_CAPTURED.set(Boolean.TRUE);
            logger.info("Screenshot capture");
        } catch (Exception e) {
            logger.error("Erreur screenshot : {}", e.getMessage());
        }
    }

    private void attachFailureContext(Scenario scenario, WebDriver driver) {
        try {
            String currentUrl = driver.getCurrentUrl();
            Allure.addAttachment("current-url", "text/plain", currentUrl, ".txt");
        } catch (Exception e) {
            logger.warn("Failed to attach current URL: {}", e.getMessage());
        }

        try {
            String pageSource = driver.getPageSource();
            Allure.addAttachment("page-source", "text/html", pageSource, ".html");
        } catch (Exception e) {
            logger.warn("Failed to attach page source: {}", e.getMessage());
        }
    }

    private void bootstrapAllureMetadata() {
        if (!ALLURE_BOOTSTRAPPED.compareAndSet(false, true)) {
            return;
        }

        Path resultsDir = Path.of(System.getProperty("allure.results.directory", "test-output/allure-results"));
        try {
            Files.createDirectories(resultsDir);
            writeEnvironmentProperties(resultsDir);
            writeExecutorJson(resultsDir);
            writeCategoriesJson(resultsDir);
            copyHistoryIfExists(resultsDir);
            logger.info("Allure metadata initialized in {}", resultsDir);
        } catch (Exception e) {
            logger.warn("Failed to initialize Allure metadata: {}", e.getMessage());
        }
    }

    private void writeEnvironmentProperties(Path resultsDir) throws IOException {
        Path environmentFile = resultsDir.resolve("environment.properties");
        String content =
                "baseUrl=" + ConfigReader.getUrl() + System.lineSeparator() +
                "browser=" + ConfigReader.getBrowser() + System.lineSeparator() +
                "headless=" + ConfigReader.isHeadless() + System.lineSeparator() +
                "timeoutSeconds=" + ConfigReader.getTimeout() + System.lineSeparator() +
                "os.name=" + System.getProperty("os.name") + System.lineSeparator() +
                "os.version=" + System.getProperty("os.version") + System.lineSeparator() +
                "java.version=" + System.getProperty("java.version") + System.lineSeparator();
        Files.writeString(environmentFile, content, StandardCharsets.UTF_8);
    }

    private void writeExecutorJson(Path resultsDir) throws IOException {
        Path executorFile = resultsDir.resolve("executor.json");
        String buildName = System.getenv().getOrDefault("BUILD_NAME", "Local Maven Run");
        String buildUrl = System.getenv().getOrDefault("BUILD_URL", "");
        String reportUrl = System.getenv().getOrDefault("REPORT_URL", "");
        String json = "{\n" +
                "  \"name\": \"Maven Surefire\",\n" +
                "  \"type\": \"local\",\n" +
                "  \"buildName\": \"" + escapeJson(buildName) + "\",\n" +
                "  \"buildUrl\": \"" + escapeJson(buildUrl) + "\",\n" +
                "  \"reportUrl\": \"" + escapeJson(reportUrl) + "\",\n" +
                "  \"buildOrder\": 1\n" +
                "}\n";
        Files.writeString(executorFile, json, StandardCharsets.UTF_8);
    }

    private void writeCategoriesJson(Path resultsDir) throws IOException {
        Path categoriesFile = resultsDir.resolve("categories.json");
        String json = "[\n" +
                "  {\n" +
                "    \"name\": \"AssertionError\",\n" +
                "    \"matchedStatuses\": [\"failed\"],\n" +
                "    \"traceRegex\": \".*(AssertionFailedError|AssertionError).*\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"name\": \"TimeoutException\",\n" +
                "    \"matchedStatuses\": [\"broken\", \"failed\"],\n" +
                "    \"traceRegex\": \".*TimeoutException.*\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"name\": \"ElementNotInteractable\",\n" +
                "    \"matchedStatuses\": [\"broken\", \"failed\"],\n" +
                "    \"traceRegex\": \".*ElementNotInteractableException.*\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"name\": \"Click Intercepted\",\n" +
                "    \"matchedStatuses\": [\"broken\", \"failed\"],\n" +
                "    \"traceRegex\": \".*ElementClickInterceptedException.*\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"name\": \"Stale Element\",\n" +
                "    \"matchedStatuses\": [\"broken\", \"failed\"],\n" +
                "    \"traceRegex\": \".*StaleElementReferenceException.*\"\n" +
                "  },\n" +
                "  {\n" +
                "    \"name\": \"API 500 errors\",\n" +
                "    \"matchedStatuses\": [\"broken\", \"failed\"],\n" +
                "    \"messageRegex\": \".*(500|Internal Server Error|HTTP 500).*\"\n" +
                "  }\n" +
                "]\n";
        Files.writeString(categoriesFile, json, StandardCharsets.UTF_8);
    }

    private void copyHistoryIfExists(Path resultsDir) throws IOException {
        Path sourceHistory = Path.of("allure-report", "history");
        if (!Files.exists(sourceHistory)) {
            return;
        }
        Path targetHistory = resultsDir.resolve("history");
        Files.createDirectories(targetHistory);
        Files.walk(sourceHistory)
                .filter(Files::isRegularFile)
                .forEach(source -> {
                    try {
                        Path relative = sourceHistory.relativize(source);
                        Path target = targetHistory.resolve(relative);
                        Files.createDirectories(target.getParent());
                        Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
                    } catch (IOException e) {
                        logger.warn("Failed to copy history file {}: {}", source, e.getMessage());
                    }
                });
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        // ✅ FIX : Échapper tous les caractères JSON spéciaux
        return value
                .replace("\\", "\\\\")  // Backslash first (important!)
                .replace("\"", "\\\"")  // Double quote
                .replace("/", "\\/")    // Forward slash (JSON specification)
                .replace("\b", "\\b")   // Backspace
                .replace("\f", "\\f")   // Form feed
                .replace("\n", "\\n")   // Newline
                .replace("\r", "\\r")   // Carriage return
                .replace("\t", "\\t");  // Tab
    }
}
