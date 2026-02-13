package com.e2e.erudaxis.utils;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public class WaitUtils {

    private final WebDriverWait wait;

    public WaitUtils() {
        wait = new WebDriverWait(
                DriverManager.getDriver(),
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

    // ⭐ NOUVELLES MÉTHODES pour gérer le pop-up

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

    /**
     * Attendre avec un timeout personnalisé
     */
    public void waitForVisibility(By locator, int timeoutSeconds) {
        WebDriverWait customWait = new WebDriverWait(
                DriverManager.getDriver(),
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
                DriverManager.getDriver(),
                Duration.ofSeconds(timeoutSeconds)
        );
        customWait.until(ExpectedConditions.urlContains(partialUrl));
    }

}