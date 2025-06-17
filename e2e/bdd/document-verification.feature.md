# Feature: Document Verification

As a recipient of a sealed document
I want to verify the authenticity of the document
So that I can trust its contents

## Background

  Given I am on the verification page

## Scenario: Successful verification via QR code scan

  When I scan a valid QR code from a sealed document
  Then I should see verification success information
  And I should see details about who sealed the document
  And I should see when the document was sealed

## Scenario: Successful verification via URL

  When I open a verification URL from a sealed document
  Then I should see verification success information
  And I should see details about who sealed the document
  And I should see when the document was sealed

## Scenario: Verification of tampered document

  When I scan a QR code from a tampered document
  Then I should see a verification failure message
  And I should see details about why the verification failed

## Scenario: Verification of invalid QR code

  When I scan an invalid or non-seal QR code
  Then I should see an appropriate error message
  And I should be able to try scanning again

## Scenario: Verification of expired seal

  When I scan a QR code from a document with an expired seal
  Then I should see information that the seal has expired
  And I should see when the seal expired

## Scenario: Offline verification

  Given I am offline
  When I scan a valid QR code from a sealed document
  Then I should still see basic verification information
  And I should see a notice that full verification requires internet connection
