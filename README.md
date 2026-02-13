# Selenium Testing Framework

Framework de test automation avec **Selenium WebDriver**, **Cucumber** et **JUnit**.

## Architecture

```
src/
├── main/java/com/e2e/nomduprojet/
│   ├── config/          # ConfigReader pour gérer les propriétés
│   ├── pages/           # Page Objects (BasePage, LoginPage, HomePage)
│   └── utils/           # Utilitaires (DriverManager, WaitUtils)
└── test/java/com/e2e/nomduprojet/
    ├── hooks/           # Hooks Cucumber (@Before, @After)
    ├── stepdefinitions/ # Mapping des étapes Gherkin
    └── runners/         # TestRunner Cucumber
test/resources/
├── features/            # Fichiers .feature (Gherkin)
└── config.properties    # Configuration test (base.url, browser, etc.)
```

## Exécution

```bash
# Tous les tests
mvn test

# Ou spécifiquement Cucumber
mvn test -Dgroups=com.e2e.erudaxis`

## Configuration

Modifier `src/test/resources/config.properties` :
- `base.url` : URL de l'application
- `browser` : chrome ou firefox
- `timeout.seconds` : délai d'attente
- `headless` : true/false pour mode headless

## Rapports

- Cucumber reports : `test-output/cucumber-reports/`
- Allure reports : `test-output/allure-results/`
