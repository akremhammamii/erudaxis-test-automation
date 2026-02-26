package com.e2e.erudaxis.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Classe abstraite pour gérer les popups / dialogues réutilisables.
 */
public abstract class BasePopup extends BasePage {

    private static final Logger logger = LoggerFactory.getLogger(BasePopup.class);

    protected static final By POPUP_CONTAINER = By.cssSelector(
            "div[role='dialog'], div[aria-modal='true'], .MuiModal-root:not(.MuiModal-hidden)"
    );
    protected static final By POPUP_CLOSE_BUTTON = By.xpath("//button[contains(@aria-label,'Close') or contains(@aria-label,'Fermer')]");

    /**
     * Attendre le chargement du popup (implémentation spécifique dans la sous-classe si nécessaire)
     */
    public void waitForPopupLoad() {
        getWait().waitForVisibility(POPUP_CONTAINER);
    }

    public boolean isPopupDisplayed() {
        return isDisplayed(POPUP_CONTAINER);
    }

    public void closePopupByButton() {
        if (isDisplayed(POPUP_CLOSE_BUTTON)) {
            click(POPUP_CLOSE_BUTTON);
            getWait().waitForInvisibility(POPUP_CONTAINER);
        }
    }

    public void closePopupByEscape() {
        try {
            getDriver().switchTo().activeElement().sendKeys(Keys.ESCAPE);
            getWait().waitForInvisibility(POPUP_CONTAINER);
        } catch (Exception e) {
            logger.warn("Failed to close popup by Escape: {}", e.getMessage());
            if (isDisplayed(POPUP_CLOSE_BUTTON)) {
                closePopupByButton();
            }
        }
    }

}

