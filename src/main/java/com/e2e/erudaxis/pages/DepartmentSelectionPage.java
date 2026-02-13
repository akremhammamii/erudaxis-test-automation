package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;

import java.util.List;
import java.util.Map;

public class DepartmentSelectionPage extends BasePage {

    private static final By POPUP_CONTAINER = By.cssSelector("div[class*='MuiBox-root']");

    // Map dynamique pour gérer facilement les départements
    private static final Map<String, By> DEPARTMENTS = Map.of(
            "college", By.xpath("//span[contains(text(), 'Établissement collège')]/ancestor::div[contains(@class, 'css-1ro84om')]"),
            "lycee",  By.xpath("//span[contains(text(), 'Établissement Lycée')]/ancestor::div[contains(@class, 'css-1ro84om')]")
    );

    /**
     * Attendre que le popup de sélection apparaisse
     */
    public DepartmentSelectionPage waitForPopup() {
        wait.waitForVisibility(POPUP_CONTAINER);
        return this;
    }

    public boolean isPopupDisplayed() {
        return isDisplayed(POPUP_CONTAINER);
    }

    /**
     * Cliquer sur un élément avec JS (uniquement si nécessaire)
     */
    private void clickWithJavaScript(By locator, String elementName) {
        wait.waitForVisibility(locator);

        List<WebElement> elements = driver.findElements(locator);
        if (elements.isEmpty()) {
            throw new RuntimeException("Aucun élément trouvé pour : " + elementName);
        }

        WebElement element = elements.stream().filter(WebElement::isDisplayed).findFirst()
                .orElseThrow(() -> new RuntimeException("Aucun élément visible pour : " + elementName));

        JavascriptExecutor js = (JavascriptExecutor) driver;
        js.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
        js.executeScript("arguments[0].click();", element);

        System.out.println("✅ Clicked on: " + elementName);
    }

    /**
     * Sélectionner un département par nom
     */
    public DepartmentSelectionPage selectDepartment(String departmentName) {
        waitForPopup();

        By locator = DEPARTMENTS.get(departmentName.toLowerCase());
        if (locator == null) {
            throw new IllegalArgumentException("Département inconnu : " + departmentName);
        }

        clickWithJavaScript(locator, departmentName);
        return this;
    }

    /**
     * Sélectionner le département configuré dans config.properties
     */
    public DepartmentSelectionPage selectConfiguredDepartment() {
        String department = ConfigReader.getValidDepartment();
        System.out.println("🏫 Département configuré : " + department);
        return selectDepartment(department);
    }
}
