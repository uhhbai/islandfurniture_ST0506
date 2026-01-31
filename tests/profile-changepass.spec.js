import { test, expect } from '@playwright/test';

const COUNTRY_PREFIX = 'SG';
// Replace with your activated test account (same as salesHistory)
const TEST_EMAIL = 'tom@lol.com';
const TEST_PASSWORD = '12345678';

// --- Login helper ---
async function login(page, password = TEST_PASSWORD) {
  console.log('Starting login process...');

  await page.goto('http://localhost:8081/B/selectCountry.html');
  await page.click('text=Singapore');
  await page.waitForURL(/\/B\/SG\//);
  console.log('✓ Country selected: Singapore');

  await page.goto(`http://localhost:8081/B/${COUNTRY_PREFIX}/memberLogin.html`);

  const emailInput = page.locator('#emailLogin');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  await emailInput.fill(TEST_EMAIL);
  await page.locator('#passwordLogin').fill(password);
  console.log('✓ Credentials entered');

  await page.click('input[value="Login"]');
  // Wait for redirect (success → memberProfile, failure → memberLogin?errMsg=)
  await page.waitForURL(/\/(memberProfile|memberLogin)\.html/, { timeout: 10000 });

  if (page.url().includes('errMsg=')) {
    await page.screenshot({ path: 'test-results/login-error-profile.png' });
    throw new Error(
      `Login failed for ${TEST_EMAIL}. Update TEST_EMAIL and TEST_PASSWORD in tests/profile-changepass.spec.js`
    );
  }

  // Wait for profile page to load
  await page.waitForSelector('#name', { state: 'visible', timeout: 10000 });
  console.log('✓ Login successful');
}

// --- Test suite (serial: one at a time, so password change test doesn't break others) ---
test.describe.serial('Member Profile Page - Edit Profile & Change Password', () => {

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(60000); // 60s for slow loads
    await login(page);
  });

  // --- Personal Info Tests ---
  test('Personal Information - Edit Profile - should update personal information successfully', async ({ page }) => {
    console.log('Test: Updating personal information...');

    await page.screenshot({ path: 'test-results/profile-page-initial.png', fullPage: true });

    // Fill form fields (these are in the Overview tab which is active by default)
    await page.fill('#name', 'John Doe');
    await page.fill('#phone', '67671234');
    await page.selectOption('#country', 'Singapore');
    await page.fill('#address', '123 Singapore');
    await page.selectOption('#securityQuestion', { value: '1' }); // Mother's maiden name
    await page.fill('#securityAnswer', 'Mary');
    await page.fill('#age', '20');
    await page.fill('#income', '2400');
    console.log('✓ Form fields filled');

    // Check the service level agreement checkbox
    const checkbox = page.locator('#serviceLevelAgreement');
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
    console.log('✓ Checkbox checked');

    // Click submit button
    await page.click('input[value="Submit"]');
    console.log('✓ Submit clicked');

    // Wait for redirect with success message
    await page.waitForURL(/goodMsg=/, { timeout: 10000 });
    await expect(page).toHaveURL(/goodMsg=Successfully/);
    console.log('✓ Profile updated successfully');

    await page.screenshot({ path: 'test-results/profile-page-updated.png', fullPage: true });
  });

  test('Personal Information - Edit Profile - password fields should not be visible in Overview tab', async ({ page }) => {
    console.log('Test: Checking password fields are hidden in Overview tab...');
    
    // In Overview tab, password fields should be hidden (they're in Change Password tab)
    await expect(page.locator('#oldPassword')).toBeHidden();
    await expect(page.locator('#password')).toBeHidden();
    await expect(page.locator('#repassword')).toBeHidden();
    console.log('✓ Password fields are hidden as expected');
  });

  // --- Change Password Tests (must open Change Password tab first) ---
  async function openChangePasswordTab(page) {
    await page.click('a[href="#changePassword"]');
    await page.waitForSelector('#oldPassword', { state: 'visible', timeout: 5000 });
    console.log('✓ Change Password tab opened');
  }

  test('Change Password - mismatched new passwords should show error', async ({ page }) => {
    console.log('Test: Checking password mismatch error...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#password', 'newpass1');
    await page.fill('#repassword', 'newpass2');
    await page.click('input[value="Change Password"]');

    // Wait for error modal to appear
    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/Passwords do not match/i, { timeout: 3000 });
    console.log('✓ Password mismatch error shown correctly');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });

  test('Change Password - incorrect old password should show error', async ({ page }) => {
    console.log('Test: Checking incorrect old password error...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', 'wrongpassword');
    await page.fill('#password', 'newpass123');
    await page.fill('#repassword', 'newpass123');
    await page.click('input[value="Change Password"]');

    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/Old password is incorrect/i, { timeout: 3000 });
    console.log('✓ Incorrect old password error shown correctly');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });

  test('Change Password - valid password change should succeed', async ({ page }) => {
    const newPassword = 'NewPass@456';
    console.log('Test: Changing password...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#password', newPassword);
    await page.fill('#repassword', newPassword);
    await page.click('input[value="Change Password"]');

    // Wait for success redirect
    await page.waitForURL(/goodMsg=Password/, { timeout: 10000 });
    await expect(page).toHaveURL(/goodMsg=Password/);
    console.log('✓ Password changed successfully');

    // Verify new password works by logging out and back in
    console.log('Logging out to verify new password...');
    await page.click('a:has-text("Logout")');
    await page.waitForURL(/memberLogin\.html/, { timeout: 5000 });
    console.log('✓ Logged out');

    console.log('Logging in with new password to verify it works...');
    await login(page, newPassword);
    console.log('✓ Logged in with new password');

    // Change password back to original for future test runs
    console.log('Changing password back to original for future test runs...');
    await openChangePasswordTab(page);
    await page.fill('#oldPassword', newPassword);
    await page.fill('#password', TEST_PASSWORD);
    await page.fill('#repassword', TEST_PASSWORD);
    await page.click('input[value="Change Password"]');

    await page.waitForURL(/goodMsg=Password/, { timeout: 10000 });
    await expect(page).toHaveURL(/goodMsg=Password/);
    console.log('✓ Password restored to original');
  });

  test('Change Password - old password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank old password error...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', '');
    await page.fill('#password', 'newpass123');
    await page.fill('#repassword', 'newpass123');
    await page.click('input[value="Change Password"]');

    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/fill in all password fields/i, { timeout: 3000 });
    console.log('✓ Blank old password error shown correctly');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });

  test('Change Password - new password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank new password error...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#password', '');
    await page.fill('#repassword', 'newpass123');
    await page.click('input[value="Change Password"]');

    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/fill in all password fields/i, { timeout: 3000 });
    console.log('✓ Blank new password shows error');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });

  test('Change Password - confirm password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank confirm password error...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#password', 'newpass123');
    await page.fill('#repassword', '');
    await page.click('input[value="Change Password"]');

    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/fill in all password fields/i, { timeout: 3000 });
    console.log('✓ Blank confirm password error shown correctly');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });

  test('Change Password - new password too short should show error', async ({ page }) => {
    console.log('Test: Checking password length validation...');
    await openChangePasswordTab(page);

    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#password', '123');
    await page.fill('#repassword', '123');
    await page.click('input[value="Change Password"]');

    await expect(page.locator('#changePasswordErrorModal')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#changePasswordErrorMsg')).toContainText(/at least 8 characters/i, { timeout: 3000 });
    console.log('✓ Password too short error shown');
    
    // Close modal
    await page.click('#changePasswordErrorModal button[data-dismiss="modal"]');
  });
});