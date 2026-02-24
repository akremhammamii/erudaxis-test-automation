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

/**
 * Hooks pour le cycle de vie des tests Cucumber
 */
public class Hooks {

    private static final Logger logger = LoggerFactory.getLogger(Hooks.class);
    private static final ThreadLocal<Boolean> SCREENSHOT_CAPTURED =
            ThreadLocal.withInitial(() -> Boolean.FALSE);

    @Before
    public void setup() {
        logger.info("Initialisation du test");

        DriverManager.initDriver();
        DriverManager.getDriver().get(ConfigReader.getUrl());
        SCREENSHOT_CAPTURED.set(Boolean.FALSE);

        logger.info("Setup termine");
    }

    @AfterStep
    public void afterStep(Scenario scenario) {
        if (scenario.isFailed()) {
            captureScreenshot(scenario);
        }
    }

    @After
    public void tearDown(Scenario scenario) {
        if (scenario.isFailed() && !Boolean.TRUE.equals(SCREENSHOT_CAPTURED.get())) {
            logger.warn("Scenario echoue : {}", scenario.getName());
            captureScreenshot(scenario);
        } else {
            logger.info("Scenario reussi : {}", scenario.getName());
        }

        DriverManager.quitDriver();
        SCREENSHOT_CAPTURED.remove();
        logger.info("Teardown termine");
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
            scenario.attach(screenshot, "image/png", name);
            Allure.addAttachment(name, "image/png", new ByteArrayInputStream(screenshot), ".png");
            SCREENSHOT_CAPTURED.set(Boolean.TRUE);
            logger.info("Screenshot capture");
        } catch (Exception e) {
            logger.error("Erreur screenshot : {}", e.getMessage());
        }
    }
}
