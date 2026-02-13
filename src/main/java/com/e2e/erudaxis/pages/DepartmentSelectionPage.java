package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;

import java.util.List;

public class DepartmentSelectionPage extends BasePage {

    private static final By POPUP_CONTAINER = By.cssSelector("div[class*='MuiBox-root']");

    private static final By COLLEGE_OPTION = By.xpath(
            "//span[contains(text(), 'Établissement collège')]/ancestor::div[contains(@class, 'css-1ro84om')]"
    );

    private static final By LYCEE_OPTION = By.xpath(
            "//span[contains(text(), 'Établissement Lycée')]/ancestor::div[contains(@class, 'css-1ro84om')]"
    );

    public void waitForPopup() {
        try {
            wait.waitForVisibility(POPUP_CONTAINER);
            Thread.sleep(1000);
            System.out.println("✅ Pop-up de sélection affiché");
        } catch (Exception e) {
            System.err.println("❌ Pop-up non trouvé : " + e.getMessage());
            throw new RuntimeException(e);
        }
    }

    public boolean isPopupDisplayed() {
        try {
            wait.waitForVisibility(POPUP_CONTAINER);
            boolean displayed = isDisplayed(POPUP_CONTAINER);
            System.out.println("Pop-up affiché : " + displayed);
            return displayed;
        } catch (Exception e) {
            System.err.println("Pop-up non visible : " + e.getMessage());
            return false;
        }
    }

    private void clickWithJavaScript(By locator, String elementName) {
        try {
            wait.waitForVisibility(locator);

            List<WebElement> elements = driver.findElements(locator);
            System.out.println("🔍 Nombre d'éléments trouvés : " + elements.size());

            if (elements.isEmpty()) {
                throw new RuntimeException("Aucun élément trouvé avec le sélecteur : " + locator);
            }

            WebElement element = null;
            for (WebElement el : elements) {
                if (el.isDisplayed()) {
                    element = el;
                    System.out.println("🎯 Élément sélectionné : " + el.getText());
                    break;
                }
            }

            if (element == null) {
                throw new RuntimeException("Aucun élément visible trouvé");
            }

            String urlBeforeClick = driver.getCurrentUrl();
            System.out.println("📍 URL avant clic : " + urlBeforeClick);

            JavascriptExecutor js = (JavascriptExecutor) driver;
            js.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
            Thread.sleep(500);
            js.executeScript("arguments[0].click();", element);

            System.out.println("✅ Clicked on: " + elementName);

            int maxWaitSeconds = 10;
            int waited = 0;
            while (waited < maxWaitSeconds) {
                Thread.sleep(1000);
                waited++;
                String currentUrl = driver.getCurrentUrl();

                if (!currentUrl.equals(urlBeforeClick)) {
                    System.out.println("✅ Redirection détectée après " + waited + " secondes");
                    System.out.println("📍 Nouvelle URL : " + currentUrl);
                    return;
                }

                System.out.println("⏳ Attente de la redirection... (" + waited + "s)");
            }

            System.err.println("⚠️ Aucune redirection détectée après " + maxWaitSeconds + " secondes");
            System.err.println("📍 URL finale : " + driver.getCurrentUrl());

        } catch (Exception e) {
            System.err.println("❌ Failed to click on: " + elementName);
            System.err.println("📍 URL actuelle : " + driver.getCurrentUrl());
            throw new RuntimeException("Element non cliquable: " + elementName, e);
        }
    }

    public void selectCollege() {
        clickWithJavaScript(COLLEGE_OPTION, "Option Collège");
    }

    public void selectLycee() {
        clickWithJavaScript(LYCEE_OPTION, "Option Lycée");
    }

    /**
     * Sélectionner un département par nom
     */
    public void selectDepartment(String departmentName) throws InterruptedException {
        waitForPopup();

        switch (departmentName.toLowerCase()) {
            case "college":
            case "collège":
                selectCollege();
                break;
            case "lycee":
            case "lycée":
                selectLycee();
                break;
            default:
                throw new IllegalArgumentException("Département inconnu : " + departmentName);
        }
    }

    /**
     * ⭐ Sélectionner le département configuré dans config.properties
     */
    public void selectConfiguredDepartment() {
        String department = ConfigReader.get("login.department");
        System.out.println("🏫 Département configuré : " + department);

        try {
            selectDepartment(department);
        } catch (InterruptedException e) {
            throw new RuntimeException("Erreur lors de la sélection du département", e);
        }
    }

    public void waitForPopupToDisappear() {
        try {
            waitForInvisibility(POPUP_CONTAINER);
            System.out.println("✅ Pop-up disparu - Redirection en cours");
        } catch (Exception e) {
            String currentUrl = driver.getCurrentUrl();
            System.out.println("⚠️ Le pop-up n'a pas disparu dans le délai");
            System.out.println("📍 URL après sélection : " + currentUrl);
        }
    }
}