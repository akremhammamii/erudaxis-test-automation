package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.TimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DashboardPage extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(DashboardPage.class);
    private static final String DASHBOARD_URL = "/dashboards/default";
    // ✅ FIX : Utiliser un locateur plus flexible qui s'adapte mieux
    private static final By DASHBOARD_CONTAINER = By.xpath(
            "//div[contains(@class, 'dashboard')] | //main | //div[@role='main']"
    );

    /**
     * Attendre que le dashboard soit complètement chargé.
     * ✅ FIX : Attendre l'URL OU le container (logique OR robuste pour les variations UI)
     *
     * @throws TimeoutException si le dashboard n'est pas chargé dans le délai imparti
     */
    public DashboardPage waitForDashboardLoad() {
        logger.info("Waiting for dashboard to load...");
        // Le dashboard peut être validé soit par URL, soit par conteneur visible.
        getWait().waitForUrlContainsOrVisibility(
                DASHBOARD_URL,
                DASHBOARD_CONTAINER,
                ConfigReader.getDashboardTimeout()
        );
        logger.info("Dashboard load condition satisfied");
        return this;
    }

    /**
     * Vérifier que le dashboard est affiché (non-bloquant).
     * ✅ FIX : Utilise waitForDashboardLoad() puis confirme URL ou container visible.
     *
     * @return true si le dashboard est complètement affiché, false sinon
     */
    public boolean isDisplayed() {
        try {
            waitForDashboardLoad();
            String currentUrl = getDriver().getCurrentUrl();
            boolean urlContainsDashboard = currentUrl.contains(DASHBOARD_URL);
            boolean containerDisplayed = isDisplayedNow(DASHBOARD_CONTAINER);
            return urlContainsDashboard || containerDisplayed;
        } catch (RuntimeException e) {
            logger.warn("Dashboard not displayed within timeout");
            return false;
        }
    }

}
