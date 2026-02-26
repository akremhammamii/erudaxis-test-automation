package com.e2e.erudaxis.stepdefinitions;

import com.e2e.erudaxis.pages.DashboardPage;
import com.e2e.erudaxis.pages.DepartmentSelectionPage;
import com.e2e.erudaxis.pages.LoginPage;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import static org.junit.jupiter.api.Assertions.*;

public class LoginSteps {

    private static final Logger logger = LoggerFactory.getLogger(LoginSteps.class);
    private final LoginPage loginPage = new LoginPage();
    private final DepartmentSelectionPage departmentPage = new DepartmentSelectionPage();
    private final DashboardPage dashboardPage = new DashboardPage();

    @Given("I am on the login page")
    public void i_am_on_the_login_page() {
        logger.info("Verifying user is on login page");
        // ✅ FIX CRITIQUE : Utiliser la méthode encapsulée au lieu d'accès direct DriverManager
        assertTrue(loginPage.isOnLoginPage(),
                "L'utilisateur devrait être sur la page de connexion");
    }

    // ⭐ Step pour l'email valide
    @When("I enter valid email")
    public void i_enter_valid_email() {
        logger.info("Entering valid email");
        loginPage.enterValidEmail();
    }

    // ⭐ Step pour le password valide
    @When("I enter valid password")
    public void i_enter_valid_password() {
        logger.info("Entering valid password");
        loginPage.enterValidPassword();
    }

    @When("I enter {string} in the email field")
    public void i_enter_in_the_email_field(String email) {
        logger.info("Entering email value");
        loginPage.enterEmail(email);
    }

    @When("I enter {string} in the password field")
    public void i_enter_in_the_password_field(String password) {
        logger.info("Entering password value");
        loginPage.enterPassword(password);
    }

    @When("I click on login button")
    public void i_click_on_login_button() {
        logger.info("Clicking login button");
        assertTrue(loginPage.isLoginButtonEnabled(),
                "Le bouton devrait être activé");

        loginPage.clickLogin();
    }

    @When("I select the configured department")
    public void i_select_the_configured_department() {
        logger.info("Selecting configured department");
        assertTrue(departmentPage.isPopupDisplayed(),
                "Le pop-up devrait être affiché");

        departmentPage.selectConfiguredDepartment();
    }


    @Then("I should be redirected to the dashboard")
    public void i_should_be_redirected_to_the_dashboard() {
        logger.info("Checking dashboard redirection");
        assertTrue(dashboardPage.isDisplayed(),
                "Le dashboard devrait être affiché");
    }

    @Then("I should see an error message")
    public void i_should_see_an_error_message() {
        logger.info("Checking error message");
        assertTrue(loginPage.isErrorMessageDisplayed(),
                "Un message d'erreur devrait être affiché");
    }

    @Then("the login button should be disabled")
    public void the_login_button_should_be_disabled() {
        logger.info("Checking login button disabled");
        assertTrue(loginPage.isLoginButtonDisabled(),
                "Le bouton devrait être désactivé");
    }
}
