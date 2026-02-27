package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.List;

public class ListOfProjectsPage extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(ListOfProjectsPage.class);

    // ========== URL ==========
    private static final String PROJECTS_URL = "/suiviTache/ListeProjet";

    // ========== NAVIGATION ==========
    private static final By MENU_GESTION_DE_PROJETS = By.xpath(
            "//li[.//span[normalize-space(text())='Gestion de projets']]"
    );
    private static final By MENU_LISTE_DE_PROJETS = By.xpath(
            "//span[normalize-space(text())='Liste de projets']"
    );

    // ========== PAGE IDENTITY ==========
    private static final By PAGE_TITLE = By.xpath(
            "//h5[contains(text(),'Liste des Projects')]"
    );

    // ========== SEARCH ==========
    /**
     * Search field - Stable XPath avec fallbacks
     *
     * ⚠️ RATIONALE: MUI Input text, peut avoir placeholder variable
     * Fallbacks: placeholder partial → structure div+input
     */
    private static final By SEARCH_FIELD = By.xpath(
            "//input[contains(@placeholder, 'Titre')] | " +
            "//input[@aria-label='Rechercher'] | " +
            "//div[contains(@class, 'MuiInputBase')]//input[@type='text'][1]"
    );

    // ========== FILTRES ==========
    /**
     * Toggle filters button - With aria-label fallback
     *
     * ⚠️ RATIONALE: aria-label est plus stable que text content
     * Fallback: normalize-space() pour texte exact
     */
    private static final By TOGGLE_FILTERS_BUTTON = By.xpath(
            "//button[@aria-label='Filtres'] | " +
            "//button[normalize-space()='Afficher Filtres' or normalize-space()='Masquer Filtres']"
    );

    /**
     * Responsable filter input - Avec structure fallback
     *
     * ⚠️ RATIONALE: MUI Autocomplete input, peut avoir placeholder variable
     * Fallbacks: placeholder partial → MuiAutocomplete structure
     */
    private static final By RESPONSABLE_FILTER = By.xpath(
            "//input[contains(@placeholder, 'responsable')] | " +
            "//div[contains(@class, 'MuiAutocomplete')]//input[1]"
    );
    private static final By RESET_FILTERS_BUTTON = By.xpath(
            "//button[contains(normalize-space(.),'Tout réinitialiser')]"
    );

    // ========== ACTIONS ==========
    private static final By ADD_PROJECT_BUTTON = By.xpath(
            "//button[contains(normalize-space(.), 'Ajouter Projet')]");
    private static final By ADD_PROJECT_MODAL = By.xpath(
            "//*[@role='dialog'] | //*[contains(@class,'MuiModal-root') and not(contains(@class,'MuiModal-hidden'))]");
    // ========== TABLE ==========
    /**
     * Table rows - Using role attribute (stable, semantic)
     *
     * ⚠️ RATIONALE: Évite les classes générées MUI (css-XXXXX)
     * Uses: @role='table' + @role='row' (standard HTML5)
     */
    private static final By TABLE_ROWS = By.xpath(
            "//table[@role='table']//tbody//tr[@role='row']"
    );
    /**
     * Responsable cells - Using role and semantic selectors
     *
     * ⚠️ RATIONALE: Évite les classes générées, plus robuste
     */
    private static final By RESPONSABLE_CELLS = By.xpath(
            "//table[@role='table']//tbody//tr[@role='row']//td[3]//div"
    );
    // ========== FORMULAIRE CRÉATION ==========
    private static final By FORM_TITLE_INPUT = By.xpath(
            "//input[@name='titre' or @placeholder='Titre De Projet']");
    private static final By FORM_DESCRIPTION_INPUT = By.xpath(
            "//textarea[@name='description' or @placeholder='Description']");
    private static final By FORM_RESPONSABLE_INPUT = By.xpath(
            "//input[@placeholder='Choisir un responsable....']");
    private static final By FORM_SUBMIT_BUTTON = By.xpath(
            "//button[@type='submit' or contains(normalize-space(.),'Enregistrer') or contains(normalize-space(.),'Créer')]");

    // ========== MESSAGES ==========
    private static final By SUCCESS_MESSAGE = By.xpath(
            "//h2[contains(@class,'swal2-title')]");
    private static final By SWAL2_OK_BUTTON = By.xpath(
            "//button[contains(@class,'swal2-confirm')]");
    // ==========================================================
    // LOCATORS DYNAMIQUES
    // ==========================================================

    /**
     * Escape XPath pour gérer les titres contenant ' ou "
     */
    private static String escapeXPath(String value) {
        if (!value.contains("'")) {
            return "'" + value + "'";
        } else if (!value.contains("\"")) {
            return "\"" + value + "\"";
        } else {
            return "concat('" + value.replace("'", "', \"'\", '") + "')";
        }
    }

    private static By projectRowByTitle(String title) {
        return By.xpath("//span[@aria-label=" + escapeXPath(title) + "]");
    }

    // ==========================================================
    // NAVIGATION
    // ==========================================================

    public ListOfProjectsPage openFromSidebar() {
        logger.info("Opening 'Gestion de projets' from sidebar");
        click(MENU_GESTION_DE_PROJETS);
        getWait().waitForVisibility(MENU_LISTE_DE_PROJETS);
        click(MENU_LISTE_DE_PROJETS);
        waitForPageLoad();
        return this;
    }

    public ListOfProjectsPage navigateDirectly() {
        // ✅ Utilise PROJECTS_URL pour éviter la duplication
        String url = ConfigReader.getUrl() + PROJECTS_URL;
        logger.info("Navigating directly to: {}", url);
        navigateTo(url);
        waitForPageLoad();
        return this;
    }

    public ListOfProjectsPage waitForPageLoad() {
        logger.debug("Waiting for projects list page to load");
        getWait().waitForVisibility(PAGE_TITLE);
        return this;
    }

    // ==========================================================
    // PAGE IDENTITY
    // ==========================================================

    public boolean isOnProjectsListPage() {
        try {
            waitForUrlContains(PROJECTS_URL);
            return isDisplayed(PAGE_TITLE);
        } catch (Exception e) {
            logger.warn("Failed to detect projects list page", e);
            return false;
        }
    }

    // ==========================================================
    // RECHERCHE PAR TITRE
    // ==========================================================

    public ListOfProjectsPage enterSearchText(String projectTitle) {
        logger.info("Searching for project: {}", projectTitle);
        type(SEARCH_FIELD, projectTitle);
        return this;
    }

    public ListOfProjectsPage clearSearch() {
        logger.info("Clearing search field");
        getWait().waitForVisibility(SEARCH_FIELD);
        WebElement field = getDriver().findElement(SEARCH_FIELD);
        // ✅ Sélectionner tout + supprimer — fonctionne avec React
        field.sendKeys(org.openqa.selenium.Keys.CONTROL + "a");
        field.sendKeys(org.openqa.selenium.Keys.DELETE);
        return this;
    }

    public boolean isSearchFieldEmpty() {
        // ✅ Wait ajouté avant accès direct au DOM
        getWait().waitForVisibility(SEARCH_FIELD);
        String value = getDriver().findElement(SEARCH_FIELD).getAttribute("value");
        return value == null || value.isEmpty();
    }

    // ==========================================================
    // FILTRES
    // ==========================================================

    public ListOfProjectsPage clickToggleFilters() {
        logger.info("Toggling filters panel");
        clickWithRetry(TOGGLE_FILTERS_BUTTON, "toggle filters");
        return this;
    }

    private void clickWithRetry(By locator, String elementName) {
        RuntimeException lastFailure = null;
        int maxAttempts = 3;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                getWait().waitForVisibility(locator);
                scrollToElement(locator);
                getDriver().findElement(locator).click();
                return;
            } catch (ElementClickInterceptedException | StaleElementReferenceException e) {
                logger.warn("{} click attempt {} failed: {}", elementName, attempt, e.getClass().getSimpleName());
                lastFailure = new RuntimeException("Failed to click " + elementName, e);
            }
        }

        logger.warn("Falling back to JavaScript click for {}", elementName);
        try {
            WebElement element = getDriver().findElement(locator);
            executeScript("arguments[0].click();", element);
        } catch (Exception e) {
            if (lastFailure != null) {
                throw lastFailure;
            }
            throw e;
        }
    }

    public ListOfProjectsPage selectResponsableFilter(String responsable) {
        logger.info("Selecting responsable filter: {}", responsable);
        type(RESPONSABLE_FILTER, responsable);

        By firstOption = By.xpath("//li[contains(@class,'MuiAutocomplete-option')][1]");
        // Explicitly wait for the option to appear after the DOM re-renders
        getWait().waitForVisibility(firstOption);
        // Re-find the element right before clicking to avoid stale reference
        getDriver().findElement(firstOption).click();
        return this;
    }

    public ListOfProjectsPage resetFilters() {
        logger.info("Resetting all filters");
        getWait().waitForVisibility(RESET_FILTERS_BUTTON);
        clickWithRetry(RESET_FILTERS_BUTTON, "reset filters");
        // Attendre que le chip "filtre actif" disparaisse
        By activeFilterChip = By.xpath("//*[contains(@class,'MuiChip') and contains(.,'filtre actif')]");
        // ✅ FIX CRITIQUE : Utiliser ConfigReader.getTimeout() pour le timeout
        new WebDriverWait(getDriver(), Duration.ofSeconds(ConfigReader.getTimeout()))
                .until(ExpectedConditions.invisibilityOfElementLocated(activeFilterChip));
        // Le champ titre n'est pas réinitialisé par l'app → on le vide manuellement
        clearSearch();
        return this;
    }

    public boolean isResponsableFilterReset(String expectedPlaceholder) {
        getWait().waitForVisibility(RESPONSABLE_FILTER);
        // Attendre explicitement que la valeur du champ devienne vide
        // ✅ FIX CRITIQUE : Utiliser ConfigReader.getTimeout() pour le timeout
        new WebDriverWait(getDriver(), Duration.ofSeconds(ConfigReader.getTimeout()))
                .until(driver -> {
                    String value = driver.findElement(RESPONSABLE_FILTER).getAttribute("value");
                    return value == null || value.isEmpty();
                });
        String value = getDriver().findElement(RESPONSABLE_FILTER).getAttribute("value");
        logger.debug("Responsable filter value after reset: '{}'", value);
        return value == null || value.isEmpty();
    }

    // ==========================================================
    // VÉRIFICATION DES RÉSULTATS
    // ==========================================================

    public int getProjectCount() {
        // ✅ Attendre le conteneur, pas les lignes (qui peuvent être absentes)
        By tableContainer = By.xpath("//tbody[contains(@class,'MuiTableBody-root')]");
        getWait().waitForVisibility(tableContainer);
        List<WebElement> rows = getDriver().findElements(TABLE_ROWS);
        logger.debug("Project count in table: {}", rows.size());
        return rows.size();
    }

    public boolean isProjectInResults(String projectTitle) {
        boolean visible = isDisplayed(projectRowByTitle(projectTitle));
        logger.debug("Project '{}' visible in results: {}", projectTitle, visible);
        return visible;
    }

    public boolean allProjectsBelongToResponsable(String responsable) {
        // ✅ Wait ajouté avant accès direct au DOM
        getWait().waitForVisibility(RESPONSABLE_CELLS);
        List<WebElement> cells = getDriver().findElements(RESPONSABLE_CELLS);
        if (cells.isEmpty()) {
            logger.warn("No responsable cells found");
            return false;
        }
        return cells.stream().allMatch(cell -> {
            String text = cell.getText().trim();
            boolean matches = text.contains(responsable);
            if (!matches) {
                logger.warn("Expected '{}' but found '{}'", responsable, text);
            }
            return matches;
        });
    }

    // ==========================================================
    // CRÉATION DE PROJET
    // ==========================================================

    public ListOfProjectsPage clickAddProject() {
        logger.info("Clicking '+Ajouter Projet' button");
        click(ADD_PROJECT_BUTTON);
        // Wait for the modal to actually open before returning
        getWait().waitForVisibility(ADD_PROJECT_MODAL);
        return this;
    }

    public ListOfProjectsPage fillProjectTitle(String title) {
        logger.info("Filling project title: {}", title);

        // DEBUG — remove after confirming the correct selector
        try {
            List<WebElement> inputs = getDriver().findElements(
                    By.xpath("//*[@role='dialog']//input | //*[contains(@class,'MuiModal')]//input")
            );
            inputs.forEach(i -> logger.info(
                    "[DEBUG] Input found: name='{}', placeholder='{}', type='{}', id='{}'",
                    i.getAttribute("name"), i.getAttribute("placeholder"),
                    i.getAttribute("type"), i.getAttribute("id")
            ));
        } catch (Exception ignored) {}

        type(FORM_TITLE_INPUT, title);
        return this;
    }

    public ListOfProjectsPage fillProjectDescription(String description) {
        logger.info("Filling project description");
        type(FORM_DESCRIPTION_INPUT, description);
        return this;
    }

    public ListOfProjectsPage fillProjectResponsable(String responsable) {
        logger.info("Filling project responsable: {}", responsable);
        type(FORM_RESPONSABLE_INPUT, responsable);

        // MUI Autocomplete needs a selection from the dropdown
        By firstOption = By.xpath("//li[contains(@class,'MuiAutocomplete-option')][1]");
        getWait().waitForVisibility(firstOption);
        getDriver().findElement(firstOption).click();
        return this;
    }

    public ListOfProjectsPage submitProjectForm() {
        logger.info("Submitting project creation form");
        click(FORM_SUBMIT_BUTTON);
        return this;
    }

    public ListOfProjectsPage createProject(String title, String description, String responsable) {
        return clickAddProject()
                .fillProjectTitle(title)
                .fillProjectDescription(description)
                .fillProjectResponsable(responsable)
                .submitProjectForm();
    }

    // ==========================================================
    // MESSAGES
    // ==========================================================

    public boolean isSuccessMessageDisplayed() {
        try {
            getWait().waitForVisibility(SUCCESS_MESSAGE);
            return isDisplayedNow(SUCCESS_MESSAGE);
        } catch (Exception e) {
            logger.warn("Success message not found", e);
            return false;
        }
    }

    public String getSuccessMessageText() {
        return getText(SUCCESS_MESSAGE);
    }



    private static final By SWAL2_CONTAINER = By.xpath(
            "//div[contains(@class,'swal2-container')]"
    );

    public ListOfProjectsPage dismissSuccessDialog() {
        if (isDisplayedNow(SWAL2_OK_BUTTON)) {
            click(SWAL2_OK_BUTTON);
            // Attendre que le dialog disparaisse complètement avant de continuer
            // ✅ FIX CRITIQUE : Utiliser ConfigReader.getTimeout() pour le timeout
            new WebDriverWait(getDriver(), Duration.ofSeconds(ConfigReader.getTimeout()))
                    .until(ExpectedConditions.invisibilityOfElementLocated(SWAL2_CONTAINER));
        }
        return this;
    }

    /*public boolean isProjectInResultsAfterSearch(String projectTitle) {
        logger.info("Searching for newly created project: {}", projectTitle);

        // Attendre que la page soit stable (titre visible) après fermeture du dialog
        getWait().waitForVisibility(PAGE_TITLE);

        // Entrer le texte de recherche
        enterSearchText(projectTitle);

        // Attendre que le tableau se filtre et que la ligne apparaisse
        try {
            new WebDriverWait(getDriver(), Duration.ofSeconds(10))
                    .until(ExpectedConditions.visibilityOfElementLocated(projectRowByTitle(projectTitle)));
            return true;
        } catch (TimeoutException e) {
            logger.warn("Project '{}' not found in results after search", projectTitle);
            return false;
        }
    }*/
    public boolean isProjectInResultsAfterSearch(String projectTitle) {
        logger.info("Searching for newly created project: {}", projectTitle);

        getWait().waitForVisibility(PAGE_TITLE);
        getWait().waitForVisibility(SEARCH_FIELD);

        // Effacer et remplir via JavaScript pour déclencher l'onChange de React
        WebElement searchField = getDriver().findElement(SEARCH_FIELD);

        // Simuler focus + clear + input pour React
        searchField.click();
        searchField.sendKeys(Keys.CONTROL + "a");
        searchField.sendKeys(Keys.DELETE);
        searchField.sendKeys(projectTitle);

        // ✅ FIX : Utiliser la méthode centralisée au lieu de JavascriptExecutor direct
        triggerEvent(SEARCH_FIELD, "input");

        logger.info("[DEBUG] Valeur saisie dans la recherche: '{}'",
                searchField.getAttribute("value"));

        // Attendre que le résultat apparaisse
        By projectRowContains = By.xpath(
                "//span[contains(@class,'MuiTypography-body') and contains(@aria-label,'" + projectTitle + "')]"
        );

        try {
            new WebDriverWait(getDriver(), Duration.ofSeconds(ConfigReader.getTimeout()))
                    .until(ExpectedConditions.visibilityOfElementLocated(projectRowContains));
            logger.info("[DEBUG] Projet '{}' trouvé dans les résultats", projectTitle);
            return true;
        } catch (TimeoutException e) {
            // Log ce qui est réellement dans le DOM
            getDriver().findElements(By.xpath(
                    "//tbody[contains(@class,'MuiTableBody-root')]//span[@aria-label]"
            )).forEach(el ->
                    logger.warn("[DEBUG] aria-label présent: '{}'", el.getAttribute("aria-label"))
            );
            logger.warn("[DEBUG] Projet '{}' introuvable après recherche", projectTitle);
            return false;
        }
    }

}
