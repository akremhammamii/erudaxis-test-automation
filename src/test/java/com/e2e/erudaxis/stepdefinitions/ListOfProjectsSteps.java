package com.e2e.erudaxis.stepdefinitions;

import com.e2e.erudaxis.pages.ListOfProjectsPage;
import io.cucumber.datatable.DataTable;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

public class ListOfProjectsSteps {

    private static final Logger logger = LoggerFactory.getLogger(ListOfProjectsSteps.class);
    private final ListOfProjectsPage projectsPage = new ListOfProjectsPage();

    // ==========================================================
    // NAVIGATION
    // ==========================================================

    @Given("I am on the projects list page")
    public void i_am_on_the_projects_list_page() {
        logger.info("Opening projects list page");
        projectsPage.openFromSidebar();
        assertTrue(projectsPage.isOnProjectsListPage(),
                "Devrait être sur la page liste des projets");
    }

    // ==========================================================
    // RECHERCHE PAR TITRE
    // ==========================================================

    @When("I enter {string} in the project search field")
    public void i_enter_in_the_project_search_field(String projectTitle) {
        logger.info("Entering project search: {}", projectTitle);
        projectsPage.enterSearchText(projectTitle);
    }

    @Given("I have entered {string} in the search field")
    public void i_have_entered_in_the_search_field(String projectTitle) {
        logger.info("Pre-filling search field with: {}", projectTitle);
        projectsPage.enterSearchText(projectTitle);
    }

    @Then("I should see the project {string} in the results")
    public void i_should_see_the_project_in_the_results(String projectTitle) {
        logger.info("Checking project in results: {}", projectTitle);
        assertTrue(projectsPage.isProjectInResults(projectTitle),
                "Le projet devrait être visible dans les résultats de recherche");
    }

    // ==========================================================
    // BOUTONS — dispatch selon le nom
    // ==========================================================

    @When("I click on {string} button")
    public void i_click_on_button(String buttonName) {
        logger.info("Clicking button: {}", buttonName);
        switch (buttonName) {
            case "Afficher Filtres":
            case "Masquer Filtres":
                projectsPage.clickToggleFilters();
                break;
            case "Tout réinitialiser":
                projectsPage.resetFilters();
                break;
            case "+Ajouter Projet":
                projectsPage.clickAddProject();
                break;
            case "AJOUTER":
                projectsPage.submitProjectForm();
                break;
            default:
                throw new IllegalArgumentException("Bouton inconnu : " + buttonName);
        }
    }

    // ==========================================================
    // FILTRES
    // ==========================================================

    @When("I select {string} in the responsable filter")
    public void i_select_in_the_responsable_filter(String responsable) {
        logger.info("Selecting responsable filter: {}", responsable);
        projectsPage.selectResponsableFilter(responsable);
    }

    @Given("I have selected a responsable in the filter")
    public void i_have_selected_a_responsable_in_the_filter() {
        logger.info("Opening filters and pre-selecting a responsable");
        projectsPage.clickToggleFilters();
        // ✅ Sélectionner réellement un responsable depuis la config
        projectsPage.selectResponsableFilter(
                com.e2e.erudaxis.config.ConfigReader.getValidEmail()
        );
    }

    // ==========================================================
    // RÉINITIALISATION
    // ==========================================================

    @Then("the search field should be empty")
    public void the_search_field_should_be_empty() {
        logger.info("Checking search field is empty");
        assertTrue(projectsPage.isSearchFieldEmpty(),
                "Le champ de recherche devrait être vide");
    }

    @Then("the responsable filter should be reset to {string}")
    public void the_responsable_filter_should_be_reset_to(String defaultValue) {
        logger.info("Checking responsable filter reset to: {}", defaultValue);
        assertTrue(projectsPage.isResponsableFilterReset(defaultValue),
                "Le filtre responsable devrait être réinitialisé à : " + defaultValue);
    }

    // ==========================================================
    // VÉRIFICATION DES RÉSULTATS
    // ==========================================================

    @Then("I should only see projects with responsable {string}")
    public void i_should_only_see_projects_with_responsable(String responsable) {
        logger.info("Checking all results belong to responsable: {}", responsable);
        assertTrue(projectsPage.allProjectsBelongToResponsable(responsable),
                "Tous les projets devraient appartenir au responsable : " + responsable);
    }

    @Then("I should see {string} in the projects list")
    public void i_should_see_in_the_projects_list(String projectTitle) {
        logger.info("Checking project visible in list: {}", projectTitle);
        assertTrue(projectsPage.isProjectInResults(projectTitle),
                "Le projet devrait être visible dans la liste : " + projectTitle);
    }

    // ==========================================================
    // CRÉATION DE PROJET
    // ==========================================================

    @When("I fill in the new project form with:")
    public void i_fill_in_the_new_project_form_with(DataTable dataTable) {
        logger.info("Filling new project form");
        Map<String, String> fields = dataTable.asMap(String.class, String.class);

        if (fields.containsKey("Titre de projet")) {
            projectsPage.fillProjectTitle(fields.get("Titre de projet"));
        }
        if (fields.containsKey("Description")) {
            projectsPage.fillProjectDescription(fields.get("Description"));
        }
        if (fields.containsKey("Responsable")) {
            projectsPage.fillProjectResponsable(fields.get("Responsable"));
        }
    }

    @Then("a success message should be displayed {string}")
    public void a_success_message_should_be_displayed(String expectedMessage) {
        assertTrue(projectsPage.isSuccessMessageDisplayed(),
                "Un message de succès devrait être affiché");
        String actualMessage = projectsPage.getSuccessMessageText();
        assertTrue(actualMessage.contains(expectedMessage),
                "Le message devrait contenir '" + expectedMessage + "' mais contient : '" + actualMessage + "'");
        projectsPage.dismissSuccessDialog(); // dismiss before next step
    }


}