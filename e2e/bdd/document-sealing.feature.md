# Feature: Document Sealing

As an authenticated user
I want to seal my document with a QR code
So that I can verify its authenticity later

## Background

  Given I have uploaded a document
  And I have successfully authenticated

## Scenario: Positioning the QR code

  When I drag the QR code to a new position on the document
  Then the QR code should be displayed at the new position
  And the position values should be updated

## Scenario: Resizing the QR code

  When I adjust the QR code size using the size control
  Then the QR code should be displayed with the new size
  And the size value should be updated

## Scenario: Successful document sealing

  When I position the QR code on the document
  And I click the "Seal Document" button
  Then the document should be sealed with the QR code
  And I should see a success message
  And I should be able to download the sealed document

## Scenario: Downloading the sealed document

  Given I have successfully sealed a document
  When I click the "Download" button
  Then the sealed document should be downloaded to my device

## Scenario: Sharing the sealed document

  Given I have successfully sealed a document
  When I click the "Share" button
  Then I should see options to share the document
  And I should be able to copy a link to the sealed document

## Scenario: Viewing a sealed document

  Given I have a link to a sealed document
  When I open the link
  Then I should see the sealed document with the QR code
  And I should see information about who sealed the document
