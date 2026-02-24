package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class DepartmentSelectionPage extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(DepartmentSelectionPage.class);
    private static final By POPUP_CONTAINER = By.cssSelector("div[class*='MuiBox-root']");

    // Map dynamique pour gerer facilement les departements
    private static final Map<String, By> DEPARTMENTS = Map.of(
            "college", By.xpath("//span[contains(text(), 'Établissement collège')]/ancestor::div[contains(@class, 'css-1ro84om')]") ,
            "lycee",  By.xpath("//span[contains(text(), 'Établissement Lycée')]/ancestor::div[contains(@class, 'css-1ro84om')]")
    );

    /**
     * Attendre que le popup de selection apparaisse
     */
    public DepartmentSelectionPage waitForPopup() {
        logger.debug("Waiting for department selection popup...");
        getWait().waitForVisibility(POPUP_CONTAINER);
        return this;
    }

    public boolean isPopupDisplayed() {
        return isDisplayed(POPUP_CONTAINER);
    }

    /**
     * Cliquer sur un element avec JS (uniquement si necessaire)
     */
    private void clickWithJavaScript(By locator, String elementName) {
        getWait().waitForVisibility(locator);

        List<WebElement> elements = getDriver().findElements(locator);
        if (elements.isEmpty()) {
            logger.error("No element found for: {}", elementName);
            throw new RuntimeException("Aucun element trouve pour : " + elementName);
        }

        WebElement element = elements.stream().filter(WebElement::isDisplayed).findFirst()
                .orElseThrow(() -> new RuntimeException("Aucun element visible pour : " + elementName));

        JavascriptExecutor js = (JavascriptExecutor) getDriver();
        js.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
        js.executeScript("arguments[0].click();", element);

        logger.info("Clicked on department: {}", elementName);
    }

    /**
     * Selectionner un departement par nom
     */
    public DepartmentSelectionPage selectDepartment(String departmentName) {
        waitForPopup();

        String normalized = normalizeDepartment(departmentName);
        By locator = DEPARTMENTS.get(normalized);
        if (locator == null) {
            logger.error("Unknown department: {}", departmentName);
            throw new IllegalArgumentException("Departement inconnu : " + departmentName);
        }

        logger.info("Selecting department: {}", departmentName);
        clickWithJavaScript(locator, departmentName);
        return this;
    }

    /**
     * Selectionner le departement configure dans config.properties
     */
    public DepartmentSelectionPage selectConfiguredDepartment() {
        String department = ConfigReader.getValidDepartment();
        logger.info("Configured department: {}", department);
        return selectDepartment(department);
    }

    private static String normalizeDepartment(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.toLowerCase(Locale.ROOT);
    }
}
