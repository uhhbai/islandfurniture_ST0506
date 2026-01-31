import { test, expect } from "@playwright/test";

test.describe("Member Profile Page - Edit Profile & Change Password", () => {

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("http://localhost:8081/B/SG/memberLogin.html");

    // Wait for login form to appear
    await page.waitForSelector("#emailLogin");
    await page.fill("#emailLogin", "john@test.com");

    await page.waitForSelector("#passwordLogin");
    await page.fill("#passwordLogin", "Password@123");

    await page.click("button[type='submit']");

    // Wait for successful login redirect
    await page.waitForLoadState("networkidle");

    // Navigate to profile page
    await page.goto("http://localhost:8081/B/SG/memberProfile.html");
    await page.waitForLoadState("networkidle");
  });

  test.describe("Personal Information - Edit Profile", () => {

    test("password fields should not be visible in Personal Information tab", async ({ page }) => {
      await expect(page.locator("#oldPassword")).toBeHidden();
      await expect(page.locator("#password")).toBeHidden();
      await expect(page.locator("#repassword")).toBeHidden();
    });

    test("should update personal information successfully", async ({ page }) => {
      await page.fill("#name", "John Doe");
      await page.fill("#phone", "67671234");
      await page.selectOption("#country", { label: "Singapore" });
      await page.fill("#address", "123 Singapore");
      await page.selectOption("#securityQuestion", { index: 1 });
      await page.fill("#securityAnswer", "Mary");
      await page.fill("#age", "20");
      await page.fill("#income", "2400");
      await page.check("#serviceLevelAgreement");

      // Submit profile update
      await page.click("button:has-text('Submit')");

      // Expect success message via URL param
      await expect(page).toHaveURL(/goodMsg=Successfully Updated!/);
    });

  });

  test.describe("Change Password Validation", () => {

    test.beforeEach(async ({ page }) => {
      // Switch to Change Password tab
      await page.click("a[href='#changePassword']");
      await page.waitForSelector("#oldPassword");
    });

    test("old password only entered should show error", async ({ page }) => {
      await page.fill("#oldPassword", "Password@123");

      await page.click("button:has-text('Submit')");

      await expect(page.locator("#changePasswordErrorModal")).toBeVisible();
      await expect(page.locator("#changePasswordErrorMsg"))
        .toContainText("Please fill in all password fields");
    });

    test("incorrect old password should show error", async ({ page }) => {
      await page.fill("#oldPassword", "Password@1234");
      await page.fill("#password", "NewPass@123");
      await page.fill("#repassword", "NewPass@123");

      await page.click("button:has-text('Submit')");

      await expect(page.locator("#changePasswordErrorModal")).toBeVisible();
      await expect(page.locator("#changePasswordErrorMsg"))
        .toContainText("Old password is incorrect");
    });

    test("mismatched new passwords should show error", async ({ page }) => {
      await page.fill("#oldPassword", "Password@123");
      await page.fill("#password", "NewPass@123");
      await page.fill("#repassword", "NewPass@321");

      await page.click("button:has-text('Submit')");

      await expect(page.locator("#changePasswordErrorModal")).toBeVisible();
      await expect(page.locator("#changePasswordErrorMsg"))
        .toContainText("Passwords do not match");
    });

    test("valid password change should succeed", async ({ page }) => {
      await page.fill("#oldPassword", "Password@123");
      await page.fill("#password", "NewPass@123");
      await page.fill("#repassword", "NewPass@123");

      await page.click("button:has-text('Submit')");

      await expect(page).toHaveURL(/goodMsg=Password changed successfully!/);
    });

  });

  test.describe("Login With New Password", () => {

    test("should login successfully with new password", async ({ page }) => {
      // Logout (clear session manually)
      await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });

      await page.goto("http://localhost:8081/B/SG/memberLogin.html");

      await page.waitForSelector("#emailLogin");
      await page.fill("#emailLogin", "john@test.com");

      await page.waitForSelector("#passwordLogin");
      await page.fill("#passwordLogin", "NewPass@123");

      await page.click("button[type='submit']");

      await page.waitForLoadState("networkidle");

      // Expect redirect to authenticated page
      await expect(page).not.toHaveURL(/memberLogin.html/);
    });

  });

});
