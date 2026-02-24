package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DashboardPage extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(DashboardPage.class);
    private static final String DASHBOARD_URL = "/dashboards/default";
    private static final By DASHBOARD_CONTAINER = By.cssSelector(
            "[data-testid='dashboard-container'], .dashboard-container, main[role='main']"
    );

    /**
     * Vérifier si le dashboard est affiché
     */
    public boolean isDisplayed() {
        try {
            // Attendre jusqu'à 15 secondes que l'URL contienne "dashboard"
            logger.info("Waiting for redirect to dashboard...");
            getWait().waitForUrlContainsOrVisibility(
                    DASHBOARD_URL,
                    DASHBOARD_CONTAINER,
                    ConfigReader.getDashboardTimeout()
            );

            boolean containerDisplayed = isDisplayedNow(DASHBOARD_CONTAINER);
            String currentUrl = getDriver().getCurrentUrl();
            boolean urlContainsDashboard = currentUrl.contains(DASHBOARD_URL);

            logger.debug("Current URL: {}", currentUrl);
            logger.debug("URL contains dashboard: {}", urlContainsDashboard);

            return containerDisplayed || urlContainsDashboard;
        } catch (Exception e) {
            logger.error("Error while checking dashboard display", e);
            logger.debug("Current URL: {}", getDriver().getCurrentUrl());
            return false;
        }
    }


}
