package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;




public class LoginPage extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(LoginPage.class);
    private static final By EMAIL_FIELD = By.id("sign-in-email-input");
    private static final By PASSWORD_FIELD = By.id("sign-in-password-input");
    private static final By LOGIN_BUTTON = By.id("sign-in-button");
    private static final By ERROR_MESSAGE = By.id("error-alert");

    // ========== MÉTHODES DE BASE ==========

    public LoginPage enterEmail(String email) {
        logger.debug("Entering email (masked)");
        type(EMAIL_FIELD, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        logger.debug("Entering password (masked)");
        type(PASSWORD_FIELD, password);
        return this;
    }

    public DashboardPage clickLogin() {
        logger.info("Clicking login button");
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
        logger.info("Login with configured user");
        enterValidEmail()
                .enterValidPassword();
        return clickLogin();
    }

    // ========== MÉTHODES DE VÉRIFICATION ==========

    public boolean isLoginButtonEnabled() {
        logger.debug("Checking login button enabled");
        return isEnabled(LOGIN_BUTTON);
    }

    public boolean isLoginButtonDisabled() {
        logger.debug("Checking login button disabled");
        return !isEnabled(LOGIN_BUTTON);
    }

    public boolean isErrorMessageDisplayed() {
        logger.debug("Checking login error message displayed");
        return isDisplayed(ERROR_MESSAGE);
    }
}
