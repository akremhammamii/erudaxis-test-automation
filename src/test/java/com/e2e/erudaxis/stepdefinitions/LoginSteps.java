package com.e2e.erudaxis.stepdefinitions;

import com.e2e.erudaxis.pages.DashboardPage;
import com.e2e.erudaxis.pages.DepartmentSelectionPage;
import com.e2e.erudaxis.pages.LoginPage;
import com.e2e.erudaxis.utils.DriverManager;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;

import static org.junit.jupiter.api.Assertions.*;

public class LoginSteps {

    private final LoginPage loginPage = new LoginPage();
    private final DepartmentSelectionPage departmentPage = new DepartmentSelectionPage();
    private final DashboardPage dashboardPage = new DashboardPage();

    @Given("I am on the login page")
    public void i_am_on_the_login_page() {
        String currentUrl = DriverManager.getDriver().getCurrentUrl();
        assertTrue(currentUrl.contains("erudaxis"),
                "Devrait être sur la page Erudaxis");
    }

    // ⭐ Step pour l'email valide
    @When("I enter valid email")
    public void i_enter_valid_email() {
        loginPage.enterValidEmail();
    }

    // ⭐ Step pour le password valide
    @When("I enter valid password")
    public void i_enter_valid_password() {
        loginPage.enterValidPassword();
    }

    @When("I enter {string} in the email field")
    public void i_enter_in_the_email_field(String email) {
        loginPage.enterEmail(email);
    }

    @When("I enter {string} in the password field")
    public void i_enter_in_the_password_field(String password) {
        loginPage.enterPassword(password);
    }

    @When("I click on login button")
    public void i_click_on_login_button() {
        assertTrue(loginPage.isLoginButtonEnabled(),
                "Le bouton devrait être activé");

        loginPage.clickLogin();
    }

    @When("I select the configured department")
    public void i_select_the_configured_department() {
        assertTrue(departmentPage.isPopupDisplayed(),
                "Le pop-up devrait être affiché");

        departmentPage.selectConfiguredDepartment();
    }


    @Then("I should be redirected to the dashboard")
    public void i_should_be_redirected_to_the_dashboard() {
        assertTrue(dashboardPage.isDisplayed(),
                "Le dashboard devrait être affiché");
    }

    @Then("I should see an error message")
    public void i_should_see_an_error_message() {
        assertTrue(loginPage.isErrorMessageDisplayed(),
                "Un message d'erreur devrait être affiché");
    }

    @Then("the login button should be disabled")
    public void the_login_button_should_be_disabled() {
        assertTrue(loginPage.isLoginButtonDisabled(),
                "Le bouton devrait être désactivé");
    }
}