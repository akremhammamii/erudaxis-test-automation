package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.utils.DriverManager;
import com.e2e.erudaxis.utils.WaitUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.TimeoutException;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * BasePage : Classe parente pour tous les Page Objects
 * Fournit les méthodes communes pour interagir avec les éléments
 */
public class BasePage {

    private static final Logger logger = LoggerFactory.getLogger(BasePage.class);
    private WebDriver driver;
    private WaitUtils wait;

    public BasePage() {}

    protected WebDriver getDriver() {
        WebDriver current = DriverManager.getDriver();
        if (current == null) {
            throw new IllegalStateException(
                    "WebDriver not initialized. Ensure Hooks @Before runs before using page objects."
            );
        }
        if (driver != current) {
            driver = current;
            wait = null;
        }
        return current;
    }

    protected WaitUtils getWait() {
        WebDriver current = getDriver();
        if (wait == null) {
            wait = new WaitUtils(current);
        }
        return wait;
    }

    /**
     * Clique sur un élément après l'attendre.
     */
    public void click(By locator) {
        try {
            logger.debug("Clicking element: {}", locator);
            getWait().waitForClick(locator);
            getDriver().findElement(locator).click();
        } catch (TimeoutException e) {
            logger.error("Element not clickable after timeout: {}", locator, e);
            throw new RuntimeException("Element non cliquable apres timeout : " + e.getMessage(), e);
        }
    }

    /**
     * Saisit du texte dans un élément après l'attendre.
     */
    public void type(By locator, String text) {
        try {
            int length = text == null ? 0 : text.length();
            logger.debug("Typing into element: {} (length={})", locator, length);
            getWait().waitForVisibility(locator);
            WebElement element = getDriver().findElement(locator);
            element.clear();
            element.sendKeys(text);
        } catch (TimeoutException e) {
            logger.error("Element not visible after timeout for type: {}", locator, e);
            throw new RuntimeException("Element non visible apres timeout : " + e.getMessage(), e);
        }
    }

    /**
     * Vérifie si un élément est activé (enabled).
     */
    public boolean isEnabled(By locator) {
        try {
            getWait().waitForPresence(locator);
            return getDriver().findElement(locator).isEnabled();
        } catch (Exception e) {
            logger.debug("isEnabled check failed for locator: {} — {}", locator, e.getMessage());
            return false;
        }
    }

    /**
     * Récupère le texte d'un élément après l'attendre.
     */
    public String getText(By locator) {
        try {
            logger.debug("Getting text from element: {}", locator);
            getWait().waitForVisibility(locator);
            return getDriver().findElement(locator).getText();
        } catch (TimeoutException e) {
            logger.error("Element not visible after timeout for getText: {}", locator, e);
            throw new RuntimeException("Element non visible pour getText() : " + e.getMessage(), e);
        }
    }

    /**
     * Vérifie si un élément est affiché sans lever d'exception.
     */
    public boolean isDisplayed(By locator) {
        try {
            getWait().waitForVisibility(locator);
            return getDriver().findElement(locator).isDisplayed();
        } catch (Exception e) {
            logger.debug("isDisplayed check failed for locator: {} — {}", locator, e.getMessage());
            return false;
        }
    }

    /**
     * Fast display check with no explicit wait.
     */
    protected boolean isDisplayedNow(By locator) {
        try {
            for (WebElement element : getDriver().findElements(locator)) {
                if (element.isDisplayed()) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    protected void waitForUrlContains(String partialUrl) {
        getWait().waitForUrlContains(partialUrl);
    }

    /**
     * Navigue vers une URL.
     */
    public void navigateTo(String url) {
        logger.info("Navigating to URL: {}", url);
        getDriver().get(url);
    }

    /**
     * Retourne le titre de la page.
     */
    public String getTitle() {
        return getDriver().getTitle();
    }

    /**
     * Obtenir l'URL actuelle
     */
    protected String getCurrentUrl() {
        return getDriver().getCurrentUrl();
    }

    // ========== JAVASCRIPT EXECUTOR METHODS ==========

    /**
     * Exécute un script JavaScript dans le contexte du navigateur.
     *
     * @param script Le code JavaScript à exécuter
     * @param args   Arguments à passer au script
     * @return Le résultat du script
     */
    protected Object executeScript(String script, Object... args) {
        try {
            logger.debug("Executing JavaScript script");
            JavascriptExecutor js = (JavascriptExecutor) getDriver();
            Object result = js.executeScript(script, args);
            logger.debug("Script executed successfully");
            return result;
        } catch (Exception e) {
            logger.error("Failed to execute JavaScript: {}", e.getMessage());
            throw new RuntimeException("JavaScript execution failed", e);
        }
    }

    /**
     * Scroll jusqu'à un élément en le centrant dans la viewport.
     * Utile pour les éléments en bas de page ou masqués.
     *
     * @param locator Le locateur de l'élément à scroller vers
     */
    protected void scrollToElement(By locator) {
        try {
            logger.debug("Scrolling to element: {}", locator);
            getWait().waitForPresence(locator);
            WebElement element = getDriver().findElement(locator);
            executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
            logger.debug("Scrolled to element successfully");
        } catch (Exception e) {
            logger.warn("Failed to scroll to element: {}", e.getMessage());
        }
    }

    /**
     * Déclenche un événement JavaScript pour les frameworks React/Angular.
     * Nécessaire car sendKeys() ne déclenche pas toujours les événements attendus.
     *
     * @param locator     Le locateur de l'élément
     * @param eventType   Le type d'événement (ex: 'input', 'change', 'focus')
     */
    protected void triggerEvent(By locator, String eventType) {
        try {
            logger.debug("Triggering '{}' event for element: {}", eventType, locator);
            getWait().waitForPresence(locator);
            WebElement element = getDriver().findElement(locator);
            String script = String.format(
                "arguments[0].dispatchEvent(new Event('%s', { bubbles: true, cancelable: true }));",
                eventType
            );
            executeScript(script, element);
            logger.debug("Event '{}' triggered successfully", eventType);
        } catch (Exception e) {
            logger.warn("Failed to trigger event: {}", e.getMessage());
        }
    }

    /**
     * Récupère la valeur d'un attribut d'un élément.
     *
     * @param locator         Le locateur de l'élément
     * @param attributeName   Le nom de l'attribut
     * @return La valeur de l'attribut, ou null si absent
     */
    protected String getAttribute(By locator, String attributeName) {
        try {
            getWait().waitForPresence(locator);
            String value = getDriver().findElement(locator).getAttribute(attributeName);
            logger.debug("Attribute '{}' = '{}'", attributeName, value);
            return value;
        } catch (TimeoutException e) {
            logger.warn("Element not found for getAttribute: {}", locator);
            return null;
        }
    }
}
