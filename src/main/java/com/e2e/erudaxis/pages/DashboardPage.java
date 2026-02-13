package com.e2e.erudaxis.pages;

import org.openqa.selenium.By;

public class DashboardPage extends BasePage {

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
            System.out.println("⏳ Attente de la redirection vers le dashboard...");
            waitForUrlContains(DASHBOARD_URL);

            String currentUrl = driver.getCurrentUrl();
            boolean urlContainsDashboard = currentUrl.contains(DASHBOARD_URL);

            System.out.println("📍 URL actuelle : " + currentUrl);
            System.out.println("✅ URL contient 'dashboard' : " + urlContainsDashboard);

            return urlContainsDashboard;
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la vérification du dashboard");
            System.err.println("📍 URL actuelle : " + driver.getCurrentUrl());
            return false;
        }
    }


}