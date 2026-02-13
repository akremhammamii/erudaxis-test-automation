package com.e2e.erudaxis.stepdefinitions;

import com.e2e.erudaxis.pages.DashboardPage;
import com.e2e.erudaxis.pages.DepartmentSelectionPage;
import com.e2e.erudaxis.pages.LoginPage;
import io.cucumber.java.en.Given;

import static org.junit.jupiter.api.Assertions.assertTrue;

    /**
     * Steps communs réutilisables dans plusieurs features
     * Ces steps sont utilisés dans le Background d'autres features
     */
    public class CommonSteps {

        private final LoginPage loginPage = new LoginPage();
        private final DepartmentSelectionPage departmentPage = new DepartmentSelectionPage();
        private final DashboardPage dashboardPage = new DashboardPage();

        /**
         * Step réutilisable pour l'authentification
         * Utilisé dans le Background de : projects.feature, users.feature, etc.
         */
        @Given("I am logged in as a valid user")
        public void i_am_logged_in_as_a_valid_user() {
            System.out.println("🔐 Authentification automatique...");

            // Login complet avec credentials de config.properties
            loginPage.loginWithValidUser();

            // Sélection du département
            assertTrue(departmentPage.isPopupDisplayed(),
                    "Le pop-up devrait être affiché");
            departmentPage.selectConfiguredDepartment();

            // Vérification du dashboard
            assertTrue(dashboardPage.isDisplayed(),
                    "Le dashboard devrait être affiché");

            System.out.println("✅ Authentification réussie");
        }
    }

