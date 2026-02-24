@projects
Feature: Project Management
  As an authenticated user
  I want to manage projects
  So that I can organize and track my work

  Background:
    Given I am logged in as a valid user
    And I am on the projects list page

  @search @smoke
  Scenario: Search for a project by title
    When I enter "projet 1" in the project search field
    Then I should see the project "projet 1" in the results

  @filter @smoke
  Scenario: Filter projects by responsable
    When I click on "Afficher Filtres" button
    And I select "hammami.akrem03@gmail.com" in the responsable filter
    Then I should only see projects with responsable "hammami.akrem03@gmail.com"

  @filter @reset
  Scenario: Reset search and filters
    Given I have entered "projet 1" in the search field
    And I have selected a responsable in the filter
    When I click on "Tout réinitialiser" button
    Then the search field should be empty
    And the responsable filter should be reset to "Tous les responsables"

  @projects @create @smoke @critical @wip
  Scenario: Create a new project
    When I click on "+Ajouter Projet" button
    And I fill in the new project form with:
      | field          | value                    |
      | Titre de projet| Mon Nouveau Projet       |
      | Description    | Description du projet    |
      | Responsable    | hammami.akrem03@gmail.com|
    And I click on "AJOUTER" button
    Then a success message should be displayed "Succès"
    And I should see "Mon Nouveau Projet" in the projects list