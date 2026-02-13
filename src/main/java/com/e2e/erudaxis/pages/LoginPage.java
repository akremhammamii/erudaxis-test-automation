package com.e2e.erudaxis.pages;

import com.e2e.erudaxis.config.ConfigReader;
import org.openqa.selenium.By;

public class LoginPage extends BasePage {

    private static final By EMAIL_FIELD = By.id("sign-in-email-input");
    private static final By PASSWORD_FIELD = By.id("sign-in-password-input");
    private static final By LOGIN_BUTTON = By.id("sign-in-button");
    private static final By ERROR_MESSAGE = By.id("error-alert");

    // ========== MÉTHODES DE BASE ==========

    public void enterEmail(String email) {
        type(EMAIL_FIELD, email);
    }

    public void enterPassword(String password) {
        type(PASSWORD_FIELD, password);
    }

    public void clickLogin() {
        click(LOGIN_BUTTON);
    }

    // ========== MÉTHODES AVEC CONFIG ==========

    /**
     * ⭐ Saisir l'email depuis config.properties
     */
    public void enterValidEmail() {
        String email = ConfigReader.get("login.email");
        System.out.println("📧 Email : " + email);
        enterEmail(email);
    }

    /**
     * ⭐ Saisir le password depuis config.properties
     */
    public void enterValidPassword() {
        String password = ConfigReader.get("login.password");
        System.out.println("🔒 Mot de passe saisi");
        enterPassword(password);
    }

    /**
     * Login complet avec credentials de config.properties
     * (utilisé dans CommonSteps pour le Background)
     */
    public void loginWithValidUser() {
        enterValidEmail();
        enterValidPassword();
        clickLogin();
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

    public boolean isEmailFieldInError() {
        String ariaInvalid = driver.findElement(EMAIL_FIELD)
                .getAttribute("aria-invalid");
        return "true".equalsIgnoreCase(ariaInvalid);
    }

    public boolean isPasswordFieldInError() {
        String ariaInvalid = driver.findElement(PASSWORD_FIELD)
                .getAttribute("aria-invalid");
        return "true".equalsIgnoreCase(ariaInvalid);
    }
}