package com.e2e.erudaxis.hooks;

import com.e2e.erudaxis.config.ConfigReader;
import com.e2e.erudaxis.utils.DriverManager;
import io.cucumber.java.After;
import io.cucumber.java.Before;
import io.cucumber.java.Scenario;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Hooks class pour la gestion du setup et teardown des tests Cucumber.
 * - @Before : initialise le WebDriver et navigue vers l'URL de base
 * - @After : ferme le driver et capture un screenshot en cas d'échec
 */
public class Hooks {

    private static final Logger logger = LoggerFactory.getLogger(Hooks.class);
    private WebDriver driver;

    /**
     * Hook exécuté avant chaque scénario Cucumber.
     * Initialise le WebDriver et navigue vers l'URL configurée.
     *
     * @throws RuntimeException si l'initialisation du driver échoue
     * @throws RuntimeException si l'URL est null ou invalide
     */
    @Before
    public void setup() {
        logger.info("========================================");
        logger.info("Démarrage du setup du test");
        logger.info("========================================");

        try {
            // 1️⃣ Initialiser le WebDriver
            logger.debug("Initialisation du WebDriver...");
            DriverManager.initDriver();
            this.driver = DriverManager.getDriver();
            logger.info("✅ WebDriver initialisé avec succès");

            // 2️⃣ Valider que le driver n'est pas null
            if (driver == null) {
                logger.error("❌ Erreur : DriverManager a retourné null");
                throw new RuntimeException("DriverManager.getDriver() a retourné null. Vérifiez DriverManager.initDriver()");
            }

            // 3️⃣ Récupérer et valider l'URL
            String url = ConfigReader.getUrl();
            logger.debug("URL configurée : {}", url);

            if (url.trim().isEmpty()) {
                logger.error("❌ Erreur : URL vide dans config.properties");
                throw new RuntimeException("L'URL est vide. Vérifiez la clé 'url' dans config.properties");
            }

            // 4️⃣ Naviguer vers l'URL
            logger.info("Navigation vers l'URL : {}", url);
            driver.get(url);
            logger.info("✅ Navigation réussie vers : {}", url);

            logger.info("✅ Setup complété avec succès");
            logger.info("========================================");

        } catch (RuntimeException e) {
            logger.error("❌ Erreur lors du setup du test : {}", e.getMessage(), e);

            // Nettoyer en cas d'erreur
            try {
                DriverManager.quitDriver();
            } catch (Exception cleanupError) {
                logger.warn("Avertissement : Erreur lors du cleanup après setup échoué", cleanupError);
            }

            throw e;  // Propager l'exception pour échouer le scénario
        }
    }

    /**
     * Hook exécuté après chaque scénario Cucumber.
     * Capture un screenshot en cas d'échec et ferme le driver.
     *
     * @param scenario L'objet scénario Cucumber contenant les informations du test
     */
    @After
    public void tearDown(Scenario scenario) {
        logger.info("========================================");
        logger.info("Démarrage du teardown du test");
        logger.info("========================================");

        try {
            // 1️⃣ Vérifier si le scénario a échoué
            if (scenario.isFailed()) {
                logger.warn("❌ Scénario échoué : {}", scenario.getName());
                captureScreenshot(scenario);
            } else {
                logger.info("✅ Scénario réussi : {}", scenario.getName());
            }

            // 2️⃣ Fermer le driver
            if (driver != null) {
                logger.debug("Fermeture du WebDriver...");
                DriverManager.quitDriver();
                logger.info("✅ WebDriver fermé avec succès");
            }

        } catch (Exception e) {
            logger.error("❌ Erreur lors du teardown : {}", e.getMessage(), e);

            // Essayer de forcer la fermeture du driver même en cas d'erreur
            try {
                DriverManager.quitDriver();
                logger.info("✅ Driver fermé malgré l'erreur");
            } catch (Exception finalError) {
                logger.error("❌ Impossible de fermer le driver : {}", finalError.getMessage(), finalError);
            }

        } finally {
            logger.info("========================================");
            logger.info("Teardown terminé");
            logger.info("========================================");
        }
    }

    /**
     * Capture un screenshot en cas d'échec du scénario.
     * Le screenshot est attaché au rapport Cucumber.
     *
     * @param scenario L'objet scénario Cucumber
     */
    private void captureScreenshot(Scenario scenario) {
        try {
            if (driver != null && driver instanceof TakesScreenshot) {
                logger.debug("Capture du screenshot...");
                byte[] screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
                scenario.attach(screenshot, "image/png", "Erreur - " + scenario.getName());
                logger.info("✅ Screenshot capturé et attaché au rapport");
            } else {
                logger.warn("⚠️ Impossible de capturer le screenshot : driver null ou ne supporte pas TakesScreenshot");
            }
        } catch (Exception e) {
            logger.error("❌ Erreur lors de la capture du screenshot : {}", e.getMessage(), e);
        }
    }
}
