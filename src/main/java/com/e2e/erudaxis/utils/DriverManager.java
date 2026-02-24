package com.e2e.erudaxis.utils;

import com.e2e.erudaxis.config.ConfigReader;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;


/**
 * DriverManager : Gestionnaire centralisé du WebDriver
 * Utilise ThreadLocal pour garantir la thread-safety en tests parallèles
 */
public class DriverManager {

    private static final Logger logger = LoggerFactory.getLogger(DriverManager.class);
    private static final ThreadLocal<WebDriver> driver = new ThreadLocal<>();

    /**
     * Retourne le WebDriver actuel pour le thread courant.
     *
     * @return Le WebDriver ou null si non initialisé
     */
    public static WebDriver getDriver() {
        return driver.get();
    }

    /**
     * Initialise le WebDriver selon la configuration.
     * - Récupère le navigateur depuis config.properties
     * - Configure les options (headless, window size, etc.)
     *
     * @throws RuntimeException si le navigateur configuré n'est pas supporté
     */
    public static void initDriver() {
        logger.info("Initialisation du WebDriver...");

        String browser = ConfigReader.getBrowser().toLowerCase();
        int timeout = ConfigReader.getTimeout();
        boolean headless = ConfigReader.isHeadless();

        logger.debug("Configuration : browser={}, timeout={}s, headless={}", browser, timeout, headless);

        if (browser.equalsIgnoreCase("chrome")) {
            initChromeDriver(headless);
        } else if (browser.equalsIgnoreCase("firefox")) {
            initFirefoxDriver(headless);
        } else {
            throw new RuntimeException("❌ Navigateur non supporté: " + browser +
                    " (supportés : chrome, firefox)");
        }

        // Configurer les timeouts
        getDriver().manage().window().maximize();
// ✅ Configurer les timeouts
        getDriver().manage().timeouts().pageLoadTimeout(
                Duration.ofSeconds(ConfigReader.getTimeout())
        );
        getDriver().manage().timeouts().scriptTimeout(
                Duration.ofSeconds(30)
        );
        logger.info("✅ WebDriver initialisé avec succès");
    }

    /**
     * Initialise Chrome WebDriver avec les options configurées.
     *
     * @param headless true pour activer le mode headless
     */
    private static void initChromeDriver(boolean headless) {
        logger.debug("Initialisation du driver Chrome...");
        WebDriverManager.chromedriver().setup();

        ChromeOptions options = new ChromeOptions();

        if (headless) {
            logger.debug("Mode headless activé pour Chrome");
            options.addArguments("--headless=new");
        }

        // Options de sécurité et performance
        options.addArguments(
                "--disable-blink-features=AutomationControlled",
                "--disable-gpu",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--start-maximized"
        );

        driver.set(new ChromeDriver(options));
    }

    /**
     * Initialise Firefox WebDriver avec les options configurées.
     *
     * @param headless true pour activer le mode headless
     */
    private static void initFirefoxDriver(boolean headless) {
        logger.debug("Initialisation du driver Firefox...");
        WebDriverManager.firefoxdriver().setup();

        FirefoxOptions options = new FirefoxOptions();

        if (headless) {
            logger.debug("Mode headless activé pour Firefox");
            options.addArguments("--headless");
        }

        driver.set(new FirefoxDriver(options));
    }

    /**
     * Ferme le WebDriver et nettoie la ressource ThreadLocal.
     * Sûr même si le driver n'a pas été initialisé.
     */
    public static void quitDriver() {
        try {
            WebDriver currentDriver = driver.get();
            if (currentDriver != null) {
                logger.debug("Fermeture du WebDriver...");
                currentDriver.quit();
                driver.remove();
                logger.info("✅ WebDriver fermé avec succès");
            }
        } catch (Exception e) {
            logger.error("❌ Erreur lors de la fermeture du driver", e);
            driver.remove();
        }
    }
}
