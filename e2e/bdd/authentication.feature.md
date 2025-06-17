# Feature: Authentication

As a user
I want to authenticate myself
So that I can seal documents with my identity

## Background:
  Given I have uploaded a document
  And I am on the document preview page

## Scenario: Successful authentication with Google
  When I click on the "Sign in with Google" button
  Then I should be redirected to Google's authentication page
  When I complete the Google authentication process
  Then I should be redirected back to the application
  And I should see my authentication information in the document preview
  And I should be able to proceed with sealing the document

## Scenario: Successful authentication with GitHub
  When I click on the "Sign in with GitHub" button
  Then I should be redirected to GitHub's authentication page
  When I complete the GitHub authentication process
  Then I should be redirected back to the application
  And I should see my authentication information in the document preview
  And I should be able to proceed with sealing the document

## Scenario: Canceling authentication
  When I click on an authentication provider button
  And I cancel the authentication process
  Then I should be redirected back to the application
  And I should see that I am not authenticated
  And I should be able to try authenticating again

## Scenario: Authentication error handling
  When I click on an authentication provider button
  And the authentication process fails with an error
  Then I should see an appropriate error message
  And I should be able to try authenticating again

## Scenario: Session persistence
  Given I have previously authenticated successfully
  When I reload the page
  Then I should still be authenticated
  And I should be able to proceed with sealing the document
