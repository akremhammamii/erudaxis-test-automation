package com.e2e.erudaxis.utils;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.NoSuchElementException;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.Objects;
import java.util.function.Function;
import java.util.logging.Logger;

public class WaitUtils {

    private final WebDriver driver;
    private final WebDriverWait wait;
    private static final Logger logger = Logger.getLogger(WaitUtils.class.getName());

    public WaitUtils(WebDriver driver) {
        this.driver = Objects.requireNonNull(driver, "driver must not be null");
        this.wait = new WebDriverWait(
                driver,
                Duration.ofSeconds(ConfigReader.getTimeout())
        );
    }

    public void waitForVisibility(By locator) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    public void waitForClick(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator));
    }

    public void waitForPresence(By locator) {
        wait.until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    public void waitForUrlContains(String partialUrl) {
        wait.until(ExpectedConditions.urlContains(partialUrl));
    }

    public void waitForUrlContainsOrVisibility(String partialUrl, By locator, int timeoutSeconds) {
        WebDriverWait customWait = new WebDriverWait(
                driver,
                Duration.ofSeconds(timeoutSeconds)
        );
        customWait.until(ExpectedConditions.or(
                ExpectedConditions.urlContains(partialUrl),
                ExpectedConditions.visibilityOfElementLocated(locator)
        ));
    }

    // ⭐ NOUVELLES METHODES AJOUTÉES ⭐

    /**
     * Attendre qu'un élément disparaisse
     */
    public void waitForInvisibility(By locator) {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(locator));
    }

    /**
     * Attendre qu'un élément soit présent ET visible
     */
    public void waitForVisibilityAndPresence(By locator) {
        waitForPresence(locator);
        waitForVisibility(locator);
    }

    public void waitForVisibility(By locator, int timeoutSeconds) {
        WebDriverWait customWait = new WebDriverWait(
                driver,
                Duration.ofSeconds(timeoutSeconds)
        );
        customWait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    /**
     * Attendre que l'URL change par rapport à une URL donnée
     */
    public void waitForUrlToChange(String oldUrl) {
        wait.until(driver -> !driver.getCurrentUrl().equals(oldUrl));
    }

    /**
     * Attendre que l'URL contienne un texte spécifique (avec timeout personnalisé)
     */
    public void waitForUrlContains(String partialUrl, int timeoutSeconds) {
        WebDriverWait customWait = new WebDriverWait(
                driver,
                Duration.ofSeconds(timeoutSeconds)
        );
        customWait.until(ExpectedConditions.urlContains(partialUrl));
    }

    // =================== MÉTHODES RECOMMANDÉES ===================

    public void waitForNumberOfElements(By locator, int count) {
        wait.until(ExpectedConditions.numberOfElementsToBe(locator, count));
    }

    public void waitForAttributeValue(By locator, String attribute, String value) {
        wait.until(d -> {
            try {
                String attrValue = d.findElement(locator).getAttribute(attribute);
                return value.equals(attrValue);
            } catch (Exception e) {
                return false;
            }
        });
    }

    public void waitForTextInElement(By locator, String text) {
        wait.until(ExpectedConditions.textToBePresentInElementLocated(locator, text));
    }

    public void waitForElementToBeStale(By locator) {
        try {
            WebElement el = driver.findElement(locator);
            wait.until(ExpectedConditions.stalenessOf(el));
        } catch (NoSuchElementException e) {
            // Element not found - treated as already stale
        }
    }

    public void waitForCustomCondition(Function<WebDriver, Boolean> condition, String description) {
        wait.until(condition::apply);
    }

    public void waitForElementWithRetry(By locator, int maxRetries) {
        TimeoutException lastEx = null;
        int retries = Math.max(1, maxRetries);
        long totalTimeout = Math.max(1, ConfigReader.getTimeout());
        long perTryTimeout = Math.max(1, totalTimeout / retries);

        for (int i = 0; i < retries; i++) {
            try {
                WebDriverWait retryWait = new WebDriverWait(
                        driver,
                        Duration.ofSeconds(perTryTimeout)
                );
                retryWait.until(ExpectedConditions.visibilityOfElementLocated(locator));
                return;
            } catch (TimeoutException e) {
                lastEx = e;
            }
        }
        if (lastEx != null) throw lastEx;
    }

}
