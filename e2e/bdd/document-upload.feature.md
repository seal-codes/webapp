# Feature: Document Upload

As a user
I want to upload a document to the application
So that I can seal it with a QR code

## Background

  Given I am on the document upload page

## Scenario: Successful image upload via button click

  When I click on the file selection button
  And I select a valid image file (JPEG, PNG, or WebP)
  Then the document should be loaded successfully
  And I should see a preview of the document
  And I should be able to proceed to the next step

## Scenario: Successful image upload via drag and drop

  When I drag a valid image file (JPEG, PNG, or WebP) onto the dropzone
  Then the document should be loaded successfully
  And I should see a preview of the document
  And I should be able to proceed to the next step

## Scenario: Uploading an unsupported file format

  When I try to upload a file with an unsupported format (not JPEG, PNG, or WebP)
  Then I should see an error message indicating unsupported format
  And the file should not be loaded

## Scenario: Uploading a file that exceeds the size limit

  When I try to upload an image file larger than 10MB
  Then I should see an error message indicating the file is too large
  And the file should not be loaded

## Scenario: Canceling file selection

  When I click on the file selection button
  And I cancel the file selection dialog
  Then no file should be loaded
  And I should remain on the document upload page
