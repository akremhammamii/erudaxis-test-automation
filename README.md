# Erudaxis Test Automation Framework

Framework d'automatisation de tests E2E avec **Selenium WebDriver**, **Cucumber** et **JUnit** pour les tests du projet Erudaxis.

## 📋 Table des matières
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Exécution des tests](#exécution-des-tests)
- [Structure des fichiers](#structure-des-fichiers)
- [Rapports](#rapports)

## 🏗 Architecture

Le projet suit le pattern **Page Object Model (POM)** pour une meilleure maintenabilité et réutilisabilité :

```
src/
├── main/java/com/e2e/erudaxis/
│   ├── config/              # Gestion des configurations (ConfigReader)
│   ├── pages/               # Page Objects
│   │   ├── BasePage.java              # Classe parent pour les pages
│   │   ├── LoginPage.java             # Page de connexion
│   │   ├── DashboardPage.java         # Page du dashboard
│   │   ├── DepartmentSelectionPage.java
│   │   └── ListOfProjectsPage.java    # Page de liste des projets
│   └── utils/               # Utilitaires
│       ├── DriverManager.java         # Gestion du WebDriver
│       └── WaitUtils.java             # Utilitaires d'attente
└── test/java/com/e2e/erudaxis/
    ├── hooks/               # Hooks Cucumber (@Before, @After)
    ├── stepdefinitions/     # Mapping des étapes Gherkin
    │   ├── CommonSteps.java
    │   ├── LoginSteps.java
    │   └── ListOfProjectsSteps.java
    └── runners/             # TestRunner Cucumber
test/resources/
├── features/                # Fichiers .feature (Gherkin)
│   ├── login.feature
│   └── listOfProjects.feature
├── config.properties        # Configuration test
└── logback-*.xml            # Configuration des logs
```

## 📦 Prérequis

- **Java 11+**
- **Maven 3.6+**
- **Chrome/Firefox** (navigateurs pour les tests)
- **Git**

## 🚀 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/akremhammamii/erudaxis-test-automation.git
cd opencartv121
```

2. **Installer les dépendances Maven**
```bash
mvn clean install
```

## ⚙️ Configuration

### Fichier config.properties

Modifier `src/test/resources/config.properties` :
```properties
base.url=http://localhost:8080/erudaxis
browser=chrome
timeout.seconds=10
headless=false
```

### Options de configuration disponibles

| Propriété | Description | Valeurs | Défaut |
|-----------|-------------|---------|--------|
| `base.url` | URL de l'application | URL valide | http://localhost:8080 |
| `browser` | Navigateur à utiliser | chrome, firefox | chrome |
| `timeout.seconds` | Délai d'attente maximum | Nombre entier | 10 |
| `headless` | Mode navigateur sans interface | true, false | false |

## ▶️ Exécution des tests

### Tous les tests
```bash
mvn test
```

### Tests spécifiques d'une fonctionnalité
```bash
# Tests de login
mvn test -Dcucumber.filter.tags="@login"

# Tests de liste de projets
mvn test -Dcucumber.filter.tags="@projects"
```

### Tests en mode headless
```bash
mvn test -Dheadless=true
```

### Avec un navigateur spécifique
```bash
mvn test -Dbrowser=firefox
```

## 📊 Rapports

Les rapports de test sont générés automatiquement après l'exécution :

- **Cucumber HTML Reports** : `test-output/cucumber-reports/cucumber.html`
- **Allure Reports** : `test-output/allure-results/`
  - Générer le rapport : `allure generate test-output/allure-results/ -o allure-report/`
  - Afficher le rapport : `allure open allure-report/`
- **Surefire Reports** : `target/surefire-reports/`

## 🧪 Structure des tests

Les tests sont écrits en **Gherkin** (langage lisible) et mappés à des step definitions Java.

### Exemple de feature :
```gherkin
@login
Feature: Login functionality
  
  Scenario: Successful login
    Given L'utilisateur accède à la page de connexion
    When L'utilisateur saisit les identifiants valides
    And L'utilisateur clique sur le bouton connexion
    Then L'utilisateur devrait voir la page du dashboard
```

## 🔧 Technologies utilisées

- **Selenium WebDriver** - Automatisation du navigateur
- **Cucumber** - Tests BDD (Behavior Driven Development)
- **JUnit** - Framework de test
- **Maven** - Gestion des dépendances et build
- **Allure** - Rapports de test
- **Logback** - Logging

## 📝 Conventions de codage

- **Package naming** : `com.e2e.erudaxis.*`
- **Page Objects** : Suffixe `Page` (ex: `LoginPage`)
- **Step Definitions** : Suffixe `Steps` (ex: `LoginSteps`)
- **Features** : Fichiers `.feature` en minuscules avec underscores

## 🤝 Contribution

1. Créer une branche pour votre feature
2. Commiter vos changements
3. Pousser vers la branche
4. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence propriétaire.

---

**Dernière mise à jour** : Février 2026
