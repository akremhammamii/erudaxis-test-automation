package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.utils.DriverManager;
import com.e2e.erudaxis.utils.WaitUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

/**
 * BasePage : Classe parente pour tous les Page Objects
 * Fournit les méthodes communes pour interagir avec les éléments
 */
public class BasePage {

    protected WebDriver driver;
    protected WaitUtils wait;

    public BasePage() {
        driver = DriverManager.getDriver();
        wait = new WaitUtils();
    }

    /**
     * Clique sur un élément après l'attendre.
     */
    public void click(By locator) {
        try {
            wait.waitForClick(locator);
            driver.findElement(locator).click();
        } catch (TimeoutException e) {
            throw new RuntimeException("Element non cliquable apres timeout : " + e.getMessage(), e);
        }
    }

    /**
     * Saisit du texte dans un élément après l'attendre.
     */
    public void type(By locator, String text) {
        try {
            wait.waitForVisibility(locator);
            WebElement element = driver.findElement(locator);
            element.clear();
            element.sendKeys(text);
        } catch (TimeoutException e) {
            throw new RuntimeException("Element non visible apres timeout : " + e.getMessage(), e);
        }
    }

    /**
     * Vérifie si un élément est activé (enabled).
     */
    public boolean isEnabled(By locator) {
        try {
            wait.waitForPresence(locator);
            return driver.findElement(locator).isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Récupère le texte d'un élément après l'attendre.
     */
    public String getText(By locator) {
        try {
            wait.waitForVisibility(locator);
            return driver.findElement(locator).getText();
        } catch (TimeoutException e) {
            throw new RuntimeException("Element non visible pour getText() : " + e.getMessage(), e);
        }
    }

    /**
     * Vérifie si un élément est affiché sans lever d'exception.
     */
    public boolean isDisplayed(By locator) {
        try {
            wait.waitForVisibility(locator);
            return driver.findElement(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected void waitForUrlContains(String partialUrl) {
        wait.waitForUrlContains(partialUrl);
    }

    /**
     * Navigue vers une URL.
     */
    public void navigateTo(String url) {
        driver.get(url);
    }

    /**
     * Retourne le titre de la page.
     */
    public String getTitle() {
        return driver.getTitle();
    }

    /**
     * Obtenir l'URL actuelle
     */
    protected String getCurrentUrl() {
        return driver.getCurrentUrl();
    }

    /**
     * Vérifier si un élément existe dans le DOM (sans attendre)
     */
    protected boolean isElementPresent(By locator) {
        try {
            driver.findElement(locator);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Attendre qu'un élément disparaisse
     */
    protected void waitForInvisibility(By locator) {
        wait.waitForInvisibility(locator);
    }

    /**
     * Attendre avec log d'erreur personnalisé
     */
    protected void clickWithLog(By locator, String elementName) {
        try {
            wait.waitForClick(locator);
            driver.findElement(locator).click();
            System.out.println("✅ Clicked on: " + elementName);
        } catch (TimeoutException e) {
            System.err.println("❌ Failed to click on: " + elementName);
            throw new RuntimeException("Element non cliquable: " + elementName, e);
        }
    }
}