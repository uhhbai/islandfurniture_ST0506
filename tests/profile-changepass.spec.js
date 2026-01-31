import { test, expect } from '@playwright/test';

const COUNTRY_PREFIX = 'SG';
const TEST_EMAIL = 'john@test.com';
const TEST_PASSWORD = 'NewPass@123';

// --- Login helper ---
async function login(page) {
  console.log('Starting login process...');
  
  // 1. First, handle country selection if needed
  await page.goto('http://localhost:8081/B/selectCountry.html');
  await page.click('text=Singapore');
  await page.waitForURL(/\/B\/SG\//);
  console.log('✓ Country selected: Singapore');

  // 2. Navigate to Login Page
  await page.goto(`http://localhost:8081/B/${COUNTRY_PREFIX}/memberLogin.html`);
  
  // 3. Wait for login form to be visible
  const emailInput = page.locator('#emailLogin');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  // 4. Enter credentials
  await emailInput.fill(TEST_EMAIL);
  await page.locator('#passwordLogin').fill(TEST_PASSWORD);
  console.log('✓ Credentials entered');

  // 5. Click Login button
  await page.click('input[value="Login"]');

  // 6. Wait for profile page to load
  await page.waitForURL('**/memberProfile.html', { timeout: 10000 });
  
  // Check if login was successful
  if (page.url().includes('errMsg=')) {
    await page.screenshot({ path: 'test-results/login-error-profile.png' });
    throw new Error(
      `Login failed for ${TEST_EMAIL}. Check credentials or account activation status.`
    );
  }
  
  console.log('✓ Login successful');
}

// --- Test suite ---
test.describe('Member Profile Page - Edit Profile & Change Password', () => {

  // --- Login before each test ---
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(30000); // 30 seconds timeout
    await login(page);
  });

  // --- Personal Info Tests ---
  test('Personal Information - Edit Profile - should update personal information successfully', async ({ page }) => {
    console.log('Test: Updating personal information...');
    
    // Take screenshot of profile page
    await page.screenshot({ path: 'test-results/profile-page-initial.png', fullPage: true });
    
    // Navigate to Edit Profile section
    await page.click('#editProfileButton');
    console.log('✓ Edit profile button clicked');

    // Fill out personal info
    await page.fill('#nameInput', 'John Doe');
    await page.fill('#phoneInput', '67671234');
    await page.selectOption('#countryDropdown', { label: 'Singapore' });
    await page.fill('#addressInput', '123 Singapore');
    await page.selectOption('#challengeQuestionDropdown', { label: "What is your mother's maiden name?" });
    await page.fill('#challengeAnswerInput', 'Mary');
    await page.fill('#ageInput', '20');
    await page.fill('#incomeInput', '2400');
    console.log('✓ Form fields filled');
    
    // Tick the checkbox
    const checkbox = page.locator('#useInfoCheckbox');
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
    console.log('✓ Checkbox checked');

    // Save changes
    await page.click('#saveProfileButton');
    console.log('✓ Save button clicked');

    // Assert success message
    await expect(page.locator('#successMessage')).toHaveText('Profile updated successfully', { timeout: 5000 });
    console.log('✓ Profile updated successfully');
    
    // Take screenshot after save
    await page.screenshot({ path: 'test-results/profile-page-updated.png', fullPage: true });
  });

  test('Personal Information - Edit Profile - password fields should not be visible', async ({ page }) => {
    console.log('Test: Checking password fields are hidden...');
    
    await expect(page.locator('#newPassword')).toBeHidden();
    await expect(page.locator('#confirmPassword')).toBeHidden();
    console.log('✓ Password fields are hidden as expected');
  });

  // --- Change Password Tests ---
  test('Change Password - mismatched new passwords should show error', async ({ page }) => {
    console.log('Test: Checking password mismatch error...');
    
    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#newPassword', 'newpass1');
    await page.fill('#confirmPassword', 'newpass2');
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#passwordError')).toHaveText('Passwords do not match', { timeout: 5000 });
    console.log('✓ Password mismatch error shown correctly');
  });

  test('Change Password - incorrect old password should show error', async ({ page }) => {
    console.log('Test: Checking incorrect old password error...');
    
    await page.fill('#oldPassword', 'wrongpassword');
    await page.fill('#newPassword', 'newpass123');
    await page.fill('#confirmPassword', 'newpass123');
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#passwordError')).toHaveText('Old password is incorrect', { timeout: 5000 });
    console.log('✓ Incorrect old password error shown correctly');
  });

  test('Change Password - valid password change should succeed', async ({ page }) => {
    console.log('Test: Changing password...');
    
    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#newPassword', 'NewPass@456');
    await page.fill('#confirmPassword', 'NewPass@456');
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#successMessage')).toHaveText('Password changed successfully', { timeout: 5000 });
    console.log('✓ Password changed successfully');
    
    // IMPORTANT: Change it back so other tests can still login
    console.log('Changing password back to original...');
    await page.fill('#oldPassword', 'NewPass@456');
    await page.fill('#newPassword', TEST_PASSWORD);
    await page.fill('#confirmPassword', TEST_PASSWORD);
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#successMessage')).toHaveText('Password changed successfully', { timeout: 5000 });
    console.log('✓ Password restored to original');
  });

  // --- Additional Tests ---
  test('Change Password - old password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank old password error...');
    
    await page.fill('#oldPassword', '');
    await page.fill('#newPassword', 'newpass123');
    await page.fill('#confirmPassword', 'newpass123');
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#passwordError')).toHaveText('Old password is required', { timeout: 5000 });
    console.log('✓ Blank old password error shown correctly');
  });

  test('Change Password - new password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank new password error...');
    
    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#newPassword', '');
    await page.fill('#confirmPassword', 'newpass123');
    await page.click('#changePasswordButton');
    
    // This might be "New password is required" or similar - adjust based on your actual error message
    await expect(page.locator('#passwordError')).toBeVisible({ timeout: 5000 });
    console.log('✓ Blank new password shows error');
  });

  test('Change Password - confirm password blank should show error', async ({ page }) => {
    console.log('Test: Checking blank confirm password error...');
    
    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#newPassword', 'newpass123');
    await page.fill('#confirmPassword', '');
    await page.click('#changePasswordButton');
    
    await expect(page.locator('#passwordError')).toHaveText('Please confirm your new password', { timeout: 5000 });
    console.log('✓ Blank confirm password error shown correctly');
  });

  test('Change Password - new password too short should show error', async ({ page }) => {
    console.log('Test: Checking password length validation...');
    
    await page.fill('#oldPassword', TEST_PASSWORD);
    await page.fill('#newPassword', '123');
    await page.fill('#confirmPassword', '123');
    await page.click('#changePasswordButton');
    
    // Adjust the expected error message based on your validation
    await expect(page.locator('#passwordError')).toBeVisible({ timeout: 5000 });
    const errorText = await page.locator('#passwordError').textContent();
    console.log(`✓ Password too short error shown: "${errorText}"`);
  });
});