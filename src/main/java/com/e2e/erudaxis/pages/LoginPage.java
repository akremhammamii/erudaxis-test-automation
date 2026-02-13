package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

import java.util.Map;

public class LoginPage extends BasePage {

    private static final By EMAIL_FIELD = By.id("sign-in-email-input");
    private static final By PASSWORD_FIELD = By.id("sign-in-password-input");
    private static final By LOGIN_BUTTON = By.id("sign-in-button");
    private static final By ERROR_MESSAGE = By.id("error-alert");

    // ========== MÉTHODES DE BASE ==========

    public LoginPage enterEmail(String email) {
        type(EMAIL_FIELD, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        type(PASSWORD_FIELD, password);
        return this;
    }

    public DashboardPage clickLogin() {
        click(LOGIN_BUTTON);
        return new DashboardPage();
    }

    // ========== MÉTHODES AVEC CONFIG ==========

    public LoginPage enterValidEmail() {
        return enterEmail(ConfigReader.getValidEmail());
    }

    public LoginPage enterValidPassword() {
        return enterPassword(ConfigReader.getValidPassword());
    }

    /**
     * Login complet avec credentials de config.properties
     */
    public DashboardPage loginWithValidUser() {
        enterValidEmail()
                .enterValidPassword();
        return clickLogin();
    }

    // ========== MÉTHODES DE VÉRIFICATION ==========

    public boolean isLoginButtonEnabled() {
        return isEnabled(LOGIN_BUTTON);
    }

    public boolean isLoginButtonDisabled() {
        return !isEnabled(LOGIN_BUTTON);
    }

    public boolean isErrorMessageDisplayed() {
        return isDisplayed(ERROR_MESSAGE);
    }
}
