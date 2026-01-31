// @ts-check
const { test, expect } = require('@playwright/test');

// --- Positive Scenario ---
test.describe('User Login & Profile Viewing', () => {
  // Set timeout for all tests in this describe block
  test.setTimeout(60000);

  test('should select country, login successfully, and display user profile', async ({ page }) => {
    // 1. Navigate to the Select Country Page
    await page.goto('http://localhost:8081/B/selectCountry.html');

    // 2. Select "Singapore"
    await page.click('text=SINGAPORE'); 

    // Optional: Verify we landed on the Home Page
    await expect(page).toHaveURL(/.*\/B\/SG\/index.html/);

    // 3. Navigate to Login Page via Header Link
    await page.click('text=Login/Register');

    // 4. Enter Credentials
    await page.locator('#emailLogin').fill('junwei10255@gmail.com');
    await page.locator('#passwordLogin').fill('junwei123');

    // 5. Click the Login button
    await page.click('input[value="Login"]');

    // 6. Assert Redirection to Profile Page
    await expect(page).toHaveURL(/.*memberProfile.html/);

    // 7. Assert Profile Data Load
    const emailField = page.locator('#email'); 
    await expect(emailField).toHaveValue('junwei10255@gmail.com');

    // 8. Assert Welcome Badge
    const welcomeMessage = page.locator('text=Welcome,'); 
    await expect(welcomeMessage).toBeVisible();
  });

});

// --- Negative Scenarios ---
test.describe('User Login - Negative Scenarios', () => {
  // Set timeout for all tests in this describe block
  test.setTimeout(60000);

  // This hook runs before EVERY test in this describe block
  test.beforeEach(async ({ page }) => {
    // 1. Navigate to the Select Country Page
    await page.goto('http://localhost:8081/B/selectCountry.html');

    // 2. Select "Singapore"
    await page.click('text=SINGAPORE');

    // Optional: Verify we landed on the Home Page
    await expect(page).toHaveURL(/.*\/B\/SG\/index.html/);

    // 3. Navigate to Login Page via Header Link
    await page.click('text=Login/Register');
  });

  // Test Case 1: Invalid Password
  test('should fail login and show error message with invalid password', async ({ page }) => {
    // 1. Enter Valid Email
    await page.locator('#emailLogin').fill('junwei10255@gmail.com');

    // 2. Enter Invalid Password
    await page.locator('#passwordLogin').fill('junwei1234'); // Wrong password

    // 3. Click Login
    await page.click('input[value="Login"]');

    // 4. Check URL parameters for error message
    // Note: This expects your app to add ?errMsg=... to the URL on failure
    await expect(page).toHaveURL(/.*errMsg=Login%20fail/);

    // 5. Verify User is NOT Redirected (Still on Login page)
    await expect(page).toHaveURL(/.*memberLogin.html/);
  });

  // Test Case 2: Empty Fields
  test('should block submission when fields are empty', async ({ page }) => {
    // 1. Ensure fields are empty
    await page.locator('#emailLogin').fill('');
    await page.locator('#passwordLogin').fill('');

    // 2. Click Login
    await page.click('input[value="Login"]');

    // 3. Verify HTML5 Validation prevents submission
    
    // Safety Check: Ensure element is visible before checking properties
    await expect(page.locator('#emailLogin')).toBeVisible();

    // We add the type check comment to avoid TypeScript errors
    const isInvalid = await page.$eval('#emailLogin', (/** @type {HTMLInputElement} */ input) => {
      return !input.checkValidity();
    });
    
    expect(isInvalid).toBe(true);

    // 4. Verify URL has NOT changed (submission was blocked client-side)
    await expect(page).toHaveURL(/.*memberLogin.html/);
  });

});