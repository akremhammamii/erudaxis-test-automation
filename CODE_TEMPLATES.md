# 📝 TEMPLATES DE CODE - Fixes Recommandées

Ce document contient les templates de code prêts à l'emploi pour implémenter les recommandations de la revue de code.

---

## 1. INTERFACE IPage

**Fichier** : `src/main/java/com/e2e/erudaxis/pages/IPage.java`

```java
package com.e2e.erudaxis.pages;

/**
 * Interface pour garantir la cohérence entre tous les Page Objects.
 * Chaque page doit implémenter ces méthodes de base.
 */
public interface IPage {
    
    /**
     * Attendre le chargement complet de la page.
     * Doit vérifier que les éléments clés sont présents et visibles.
     * 
     * @throws TimeoutException si la page n'est pas chargée dans le délai imparti
     */
    void waitForPageLoad();
    
    /**
     * Vérifier que nous sommes sur la bonne page.
     * Effectue des vérifications non-bloquantes (pas de TimeoutException).
     * 
     * @return true si sur la bonne page, false sinon
     */
    boolean isOnExpectedPage();
}
```

**Mise à jour** : `BasePage.java`

```java
public abstract class BasePage implements IPage {
    
    // ...existing code...
    
    /**
     * Implémentation par défaut - À surcharger dans les sous-classes
     */
    @Override
    public void waitForPageLoad() {
        logger.debug("Default page load - override in subclass for specific behavior");
    }
    
    /**
     * Implémentation par défaut - À surcharger dans les sous-classes
     */
    @Override
    public boolean isOnExpectedPage() {
        logger.debug("Default page verification - override in subclass for specific checks");
        return true;
    }
}
```

---

## 2. BASEPAGE - CENTRALISER JAVASCRIPT EXECUTOR

**Fichier** : Ajouter à `src/main/java/com/e2e/erudaxis/pages/BasePage.java`

```java
/**
 * Exécute un script JavaScript dans le contexte du navigateur.
 * 
 * @param script Le code JavaScript à exécuter
 * @param args   Arguments à passer au script (accessibles via arguments[0], arguments[1], etc.)
 * @return Le résultat du script
 * @throws RuntimeException si l'exécution du script échoue
 */
protected Object executeScript(String script, Object... args) {
    try {
        logger.debug("Executing JavaScript script");
        JavascriptExecutor js = (JavascriptExecutor) getDriver();
        Object result = js.executeScript(script, args);
        logger.debug("Script executed successfully, result: {}", result);
        return result;
    } catch (Exception e) {
        logger.error("Failed to execute JavaScript script: {}", e.getMessage());
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
 * Déclenche spécifiquement un événement 'input' pour React.
 * Combine sendKeys() + événement JavaScript pour assurer la synchronisation.
 * 
 * @param locator Le locateur du champ
 * @param text    Le texte à saisir
 */
protected void typeAndTriggerReactInput(By locator, String text) {
    logger.debug("Typing text and triggering React input event");
    type(locator, text);
    triggerEvent(locator, "input");
}

/**
 * Récupère la valeur d'un attribut d'un élément.
 * 
 * @param locator Le locateur de l'élément
 * @param attributeName Le nom de l'attribut
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
```

---

## 3. WAITUTILS - AJOUTER MÉTHODES MANQUANTES

**Fichier** : Ajouter à `src/main/java/com/e2e/erudaxis/utils/WaitUtils.java`

```java
/**
 * Attendre un nombre spécifique d'éléments.
 * Utile après un filtrage ou une recherche.
 * 
 * @param locator Le locateur des éléments
 * @param count   Le nombre d'éléments attendus
 */
public void waitForNumberOfElements(By locator, int count) {
    try {
        wait.until(ExpectedConditions.numberOfElementsToBe(locator, count));
        logger.debug("Found {} elements for locator: {}", count, locator);
    } catch (TimeoutException e) {
        int actualCount = driver.findElements(locator).size();
        logger.warn("Expected {} elements but found {}", count, actualCount);
        throw e;
    }
}

/**
 * Attendre qu'un attribut ait une valeur spécifique.
 * Exemple : Attendre que le bouton disabled="false" (becomes enabled)
 * 
 * @param locator    Le locateur de l'élément
 * @param attribute  Le nom de l'attribut (ex: "disabled", "value", "class")
 * @param value      La valeur attendue
 */
public void waitForAttributeValue(By locator, String attribute, String value) {
    try {
        wait.until(driver -> {
            try {
                String attrValue = driver.findElement(locator).getAttribute(attribute);
                boolean match = value.equals(attrValue);
                if (!match) {
                    logger.debug("Attribute '{}' = '{}', waiting for '{}'", 
                        attribute, attrValue, value);
                }
                return match;
            } catch (Exception e) {
                return false;
            }
        });
        logger.debug("Attribute '{}' reached value '{}' for locator: {}", 
            attribute, value, locator);
    } catch (TimeoutException e) {
        try {
            String currentValue = driver.findElement(locator).getAttribute(attribute);
            logger.warn("Timeout waiting for attribute. Expected: '{}', Actual: '{}'", 
                value, currentValue);
        } catch (Exception ex) {
            logger.warn("Element not found during attribute wait");
        }
        throw e;
    }
}

/**
 * Attendre qu'un texte spécifique soit présent dans un élément.
 * 
 * @param locator Le locateur de l'élément
 * @param text    Le texte attendu
 */
public void waitForTextInElement(By locator, String text) {
    try {
        wait.until(ExpectedConditions.textToBePresentInElement(locator, text));
        logger.debug("Text '{}' found in element: {}", text, locator);
    } catch (TimeoutException e) {
        try {
            String actualText = driver.findElement(locator).getText();
            logger.warn("Expected text '{}' but found '{}' in element: {}", 
                text, actualText, locator);
        } catch (Exception ex) {
            logger.warn("Element not found during text wait");
        }
        throw e;
    }
}

/**
 * Attendre qu'un élément devienne "stale" (détaché du DOM).
 * Utile quand le DOM est entièrement rérendu (React, Angular).
 * 
 * @param locator Le locateur de l'élément
 */
public void waitForElementToBeStale(By locator) {
    try {
        WebElement element = driver.findElement(locator);
        wait.until(ExpectedConditions.stalenessOf(element));
        logger.debug("Element became stale (removed from DOM): {}", locator);
    } catch (TimeoutException e) {
        logger.warn("Element did not become stale within timeout: {}", locator);
        throw e;
    } catch (NoSuchElementException e) {
        logger.debug("Element not found (already stale?): {}", locator);
    }
}

/**
 * Attendre une condition personnalisée.
 * Pour les cas complexes non couverts par ExpectedConditions.
 * 
 * @param condition    Une fonction retournant true quand la condition est remplie
 * @param description  Description de la condition (pour les logs)
 */
public void waitForCustomCondition(
        Function<WebDriver, Boolean> condition,
        String description) {
    try {
        wait.until(driver -> condition.apply(driver));
        logger.debug("Custom condition met: {}", description);
    } catch (TimeoutException e) {
        logger.warn("Custom condition not met within timeout: {}", description);
        throw e;
    }
}

/**
 * Attendre un élément avec retry et backoff exponentiel.
 * Utile pour les applications lentes ou flakys.
 * 
 * @param locator    Le locateur de l'élément
 * @param maxRetries Nombre maximum de tentatives
 * @throws TimeoutException si l'élément n'apparaît pas après tous les retries
 */
public void waitForElementWithRetry(By locator, int maxRetries) {
    TimeoutException lastException = null;
    
    for (int retry = 0; retry < maxRetries; retry++) {
        try {
            waitForVisibility(locator);
            logger.debug("Element found on retry {}/{}", retry + 1, maxRetries);
            return;  // Succès
        } catch (TimeoutException e) {
            lastException = e;
            
            if (retry < maxRetries - 1) {
                // Attendre avant le prochain retry avec backoff exponentiel
                // Délai : 100ms * 2^retry (100ms, 200ms, 400ms, 800ms, ...)
                int delayMs = (int) (100 * Math.pow(2, retry));
                logger.debug("Retry {}/{} after {}ms delay", retry + 1, maxRetries, delayMs);
                
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted during retry wait", ie);
                }
            }
        }
    }
    
    logger.error("Element not found after {} retries: {}", maxRetries, locator);
    throw lastException;
}
```

---

## 4. BASEPOPUP - CLASSES POUR DIALOGUES

**Fichier** : `src/main/java/com/e2e/erudaxis/pages/BasePopup.java`

```java
package com.e2e.erudaxis.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Classe parent abstraite pour tous les popups/modales.
 * Fournit une interface commune pour les interactions avec les dialogues.
 */
public abstract class BasePopup extends BasePage {
    
    private static final Logger logger = LoggerFactory.getLogger(BasePopup.class);
    
    // Locateurs communs à tous les popups MUI
    protected static final By POPUP_CONTAINER = By.cssSelector(
        "div[class*='MuiDialog-root']," +
        "div[class*='MuiModal-root']:not([class*='hidden'])," +
        "div[role='dialog']"
    );
    
    protected static final By POPUP_CLOSE_BUTTON = By.xpath(
        "//button[" +
        "  contains(@aria-label, 'Close') or " +
        "  contains(@aria-label, 'Fermer') or " +
        "  contains(@aria-label, 'close') or " +
        "  @aria-label='✕'" +
        "]"
    );
    
    /**
     * Template method - À implémenter par les sous-classes.
     * Doit attendre tous les éléments nécessaires au popup.
     */
    public abstract void waitForPopupLoad();
    
    /**
     * Vérifier que le popup est actuellement affiché.
     * Non-bloquant : retourne false au lieu de lever une exception.
     * 
     * @return true si le popup est visible, false sinon
     */
    public boolean isPopupDisplayed() {
        try {
            return isDisplayed(POPUP_CONTAINER);
        } catch (Exception e) {
            logger.debug("Popup not displayed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Attendre l'apparition du popup avec timeout spécifique.
     * 
     * @param timeoutSeconds Timeout en secondes
     * @return ce popup pour chaînage
     */
    public BasePopup waitForPopupAppearance(int timeoutSeconds) {
        logger.info("Waiting for popup to appear (timeout: {}s)...", timeoutSeconds);
        getWait().waitForVisibility(POPUP_CONTAINER, timeoutSeconds);
        logger.info("Popup appeared");
        return this;
    }
    
    /**
     * Fermer le popup via le bouton close.
     * Attends la disparition du popup avant de retourner.
     */
    public void closePopupByButton() {
        logger.info("Closing popup via close button");
        if (isDisplayed(POPUP_CLOSE_BUTTON)) {
            click(POPUP_CLOSE_BUTTON);
            getWait().waitForInvisibility(POPUP_CONTAINER);
            logger.info("Popup closed");
        } else {
            logger.warn("Close button not found, popup may not close");
        }
    }
    
    /**
     * Fermer le popup en appuyant sur Escape.
     * Plus fiable que le bouton close dans certains cas.
     */
    public void closePopupByEscape() {
        logger.info("Closing popup via Escape key");
        try {
            getDriver().switchTo().activeElement().sendKeys(Keys.ESCAPE);
            getWait().waitForInvisibility(POPUP_CONTAINER);
            logger.info("Popup closed via Escape");
        } catch (Exception e) {
            logger.warn("Failed to close popup with Escape: {}", e.getMessage());
            // Essayer avec le bouton close comme fallback
            if (isDisplayed(POPUP_CLOSE_BUTTON)) {
                closePopupByButton();
            }
        }
    }
    
    /**
     * Attendre que le popup disparaisse.
     * Utile après une action qui devrait fermer le popup.
     */
    public void waitForPopupToDisappear() {
        logger.debug("Waiting for popup to disappear");
        getWait().waitForInvisibility(POPUP_CONTAINER);
        logger.debug("Popup disappeared");
    }
}
```

---

## 5. CORRECTION - DASHBOARDPAGE.ISDISPLAYED()

**Fichier** : Remplacer la méthode dans `src/main/java/com/e2e/erudaxis/pages/DashboardPage.java`

```java
/**
 * Attendre que le dashboard soit complètement chargé.
 * Valide ENSEMBLE l'URL ET la présence du conteneur principal.
 * 
 * @return true si le dashboard est chargé
 * @throws TimeoutException si le dashboard n'est pas chargé dans le délai imparti
 */
public DashboardPage waitForDashboardLoad() {
    logger.info("Waiting for dashboard to load...");
    try {
        // Attendre ENSEMBLE l'URL et le container
        getWait().waitForUrlContains(DASHBOARD_URL);
        getWait().waitForVisibility(DASHBOARD_CONTAINER);
        logger.info("✅ Dashboard loaded successfully");
        return this;
    } catch (TimeoutException e) {
        String currentUrl = getDriver().getCurrentUrl();
        logger.error("❌ Dashboard not loaded. Current URL: {}", currentUrl);
        
        // Log debug pour diagnostiquer
        boolean containerPresent = isDisplayedNow(DASHBOARD_CONTAINER);
        logger.debug("Container present: {}, URL contains 'dashboard': {}", 
            containerPresent, currentUrl.contains(DASHBOARD_URL));
        
        throw new RuntimeException("Dashboard failed to load within timeout", e);
    }
}

/**
 * Vérifier que le dashboard est affiché (non-bloquant).
 * À utiliser pour les vérifications dans les assertions.
 * 
 * @return true si le dashboard est complètement affiché, false sinon
 */
public boolean isDisplayed() {
    try {
        waitForDashboardLoad();
        return true;
    } catch (TimeoutException e) {
        logger.warn("Dashboard not displayed within timeout");
        return false;
    }
}
```

---

## 6. CORRECTION - LOGINPAGE.ISON LOGINPAGE()

**Fichier** : Ajouter à `src/main/java/com/e2e/erudaxis/pages/LoginPage.java`

```java
/**
 * Vérifier que l'utilisateur est sur la page de connexion.
 * Validation multiple : URL + éléments visibles + structure DOM
 * 
 * @return true si sur la page de connexion, false sinon
 */
public boolean isOnLoginPage() {
    try {
        logger.debug("Verifying we are on the login page");
        
        // Vérification 1 : URL
        String currentUrl = getCurrentUrl();
        boolean urlValid = currentUrl.contains("erudaxis");
        logger.debug("URL check: {}", urlValid);
        
        // Vérification 2 : Éléments clés visibles
        boolean elementsPresent = 
            isDisplayed(EMAIL_FIELD) && 
            isDisplayed(PASSWORD_FIELD) &&
            isDisplayed(LOGIN_BUTTON);
        logger.debug("Elements present check: {}", elementsPresent);
        
        // Les deux conditions doivent être vraies
        return urlValid && elementsPresent;
        
    } catch (Exception e) {
        logger.debug("Not on login page: {}", e.getMessage());
        return false;
    }
}

@Override
public void waitForPageLoad() {
    logger.debug("Waiting for login page to load");
    getWait().waitForVisibility(EMAIL_FIELD);
    getWait().waitForVisibility(PASSWORD_FIELD);
    getWait().waitForVisibility(LOGIN_BUTTON);
}

@Override
public boolean isOnExpectedPage() {
    return isOnLoginPage();
}
```

---

## 7. EXEMPLE - UTILISATION DANS STEPDEFINITIONS

**Fichier** : `src/test/java/com/e2e/erudaxis/stepdefinitions/LoginSteps.java`

```java
public class LoginSteps {
    
    private final LoginPage loginPage = new LoginPage();
    private final DashboardPage dashboardPage = new DashboardPage();
    
    // ✅ AVANT - Viole l'encapsulation
    // @Given("I am on the login page")
    // public void i_am_on_the_login_page() {
    //     String currentUrl = DriverManager.getDriver().getCurrentUrl();
    //     assertTrue(currentUrl.contains("erudaxis"));
    // }
    
    // ✅ APRÈS - Encapsulé correctement
    @Given("I am on the login page")
    public void i_am_on_the_login_page() {
        logger.info("Verifying user is on login page");
        assertTrue(loginPage.isOnLoginPage(), 
            "L'utilisateur devrait être sur la page de connexion");
    }
    
    @When("I enter valid email")
    public void i_enter_valid_email() {
        logger.info("Entering valid email");
        loginPage.enterValidEmail();
    }
    
    @When("I enter valid password")
    public void i_enter_valid_password() {
        logger.info("Entering valid password");
        loginPage.enterValidPassword();
    }
    
    @When("I click on login button")
    public void i_click_on_login_button() {
        logger.info("Clicking login button");
        assertTrue(loginPage.isLoginButtonEnabled(),
            "Le bouton devrait être activé");
        loginPage.clickLogin();
    }
    
    @Then("I should be redirected to the dashboard")
    public void i_should_be_redirected_to_the_dashboard() {
        logger.info("Checking dashboard redirection");
        assertTrue(dashboardPage.isDisplayed(),
            "Le dashboard devrait être affiché");
    }
}
```

---

## 8. VALIDATION CONFIGREADER

**Fichier** : Ajouter au début de `ConfigReader.java` (dans le bloc static)

```java
static {
    try (InputStream input = ConfigReader.class
            .getClassLoader()
            .getResourceAsStream("config.properties")) {

        if (input == null) {
            throw new RuntimeException("config.properties not found");
        }

        properties.load(input);
        
        // ✅ AJOUTER : Valider les clés requises
        validateRequiredConfiguration();

    } catch (Exception e) {
        throw new RuntimeException("Failed to load config file", e);
    }
}

/**
 * Valider que toutes les clés requises sont présentes au démarrage.
 * Échoue rapidement plutôt que à l'exécution du test.
 */
private static void validateRequiredConfiguration() {
    List<String> requiredKeys = List.of(
        "base.url",
        "browser",
        "timeout.seconds",
        "login.email",
        "login.password",
        "login.department",
        "dashboard.timeout.seconds"
    );
    
    List<String> missingKeys = requiredKeys.stream()
        .filter(key -> properties.getProperty(key) == null)
        .toList();
    
    if (!missingKeys.isEmpty()) {
        throw new RuntimeException(
            "Missing required configuration keys: " + 
            String.join(", ", missingKeys) + 
            ". Check src/test/resources/config.properties"
        );
    }
    
    logger.info("✅ Configuration validation passed - all required keys present");
}
```

---

## 9. CHECKLIST D'IMPLÉMENTATION

```markdown
FICHIERS À CRÉER :
- [ ] IPage.java
- [ ] BasePopup.java
- [ ] CODE_REVIEW_REPORT.md
- [ ] CODE_TEMPLATES.md (ce fichier)

FICHIERS À MODIFIER :
- [ ] BasePage.java (ajouter executeScript, scrollToElement, triggerEvent, getAttribute)
- [ ] WaitUtils.java (ajouter 6 méthodes)
- [ ] DashboardPage.java (corriger isDisplayed et waitForPageLoad)
- [ ] LoginPage.java (ajouter isOnLoginPage, waitForPageLoad, isOnExpectedPage)
- [ ] ListOfProjectsPage.java (remplacer hardcoded 5 par ConfigReader)
- [ ] LoginSteps.java (supprimer accès direct DriverManager)
- [ ] ConfigReader.java (ajouter validateRequiredConfiguration)

TESTS À AJOUTER :
- [ ] Tests unitaires pour IPage
- [ ] Tests des nouvelles méthodes WaitUtils
- [ ] Tests de BasePopup
- [ ] Intégration tests avec les pages modifiées

DOCUMENTATION :
- [ ] Mettre à jour README.md avec les changements
- [ ] Ajouter JavaDoc aux nouvelles méthodes
- [ ] Documenter les conventions de retry
```

---

Tous ces templates sont prêts à être copiés-collés dans votre code ! 🚀

