@authentication
Feature: User Authentication
  As a system user
  I want to authenticate with different credentials
  So that I can access or be denied access to the system

  @login_success @smoke
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter valid email
    And I enter valid password
    And I click on login button
    And I select the configured department
    Then I should be redirected to the dashboard

  @login_failure
  Scenario Outline: Login fails with invalid credentials
    Given I am on the login page
    When I enter "<email>" in the email field
    And I enter "<password>" in the password field
    And I click on login button
    Then I should see an error message

    Examples:
      | email                     | password     |
      | invalid@test.com          | wrongPass1   |
      | hammamiakrem0@gmail.com   | wrongPass    |

  @login_validation
  Scenario: Login button disabled with empty fields
    Given I am on the login page
    Then the login button should be disabled