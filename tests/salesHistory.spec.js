// @ts-check
/**
 * Sales History E2E Test (FIXED VERSION v2)
 *
 * Flow: Select country → Login → Add product to cart (Tables & Desks) →
 * Checkout → Fill delivery → Pay with Stripe test card → Verify order in Sales History.
 *
 * Prerequisites:
 * - Server running: npm start (http://localhost:8081)
 * - A test account: register at the site, then on the success page click [GRADING MODE] "ACTIVATE ACCOUNT",
 *   then set TEST_MEMBER_EMAIL and TEST_MEMBER_PASSWORD below to that account.
 *
 * Stripe test card (success): 4242 4242 4242 4242, expiry 12/34, CVC 123
 * @see https://docs.stripe.com/testing
 */

import { test, expect } from '@playwright/test';

const COUNTRY_PREFIX = 'SG';

// Replace with your activated test member account
const TEST_MEMBER_EMAIL = 'jc@lol.com';
const TEST_MEMBER_PASSWORD = '12345678';

test.describe('Sales History', () => {
  test.beforeEach(async ({ page }) => {
    // Set localStorage so app doesn't redirect to selectCountry
    await page.goto('/B/selectCountry.html');
    await page.click('text=Singapore');
    await page.waitForURL(/\/B\/SG\//);
  });

  test('full flow: login, add product to cart, checkout with Stripe test card, verify order in Sales History', async ({
    page,
  }) => {
    // --- Login ---
    console.log('Step 1: Logging in...');
    await page.goto('/B/' + COUNTRY_PREFIX + '/memberLogin.html');
    await page.fill('#emailLogin', TEST_MEMBER_EMAIL);
    await page.fill('#passwordLogin', TEST_MEMBER_PASSWORD);
    await page.click('input[type="submit"][onclick="login()"]');
    
    // Wait for navigation after login
    await page.waitForURL(/\/(memberProfile|memberLogin)\.html/, { timeout: 10000 });
    
    // Check if login was successful
    if (page.url().includes('errMsg=')) {
      await page.screenshot({ path: 'test-results/login-error.png' });
      throw new Error(
        'Login failed: email or password incorrect. Replace TEST_MEMBER_EMAIL and TEST_MEMBER_PASSWORD in tests/salesHistory.spec.js with your activated test account.'
      );
    }
    
    // Verify we're on member profile page
    await expect(page).toHaveURL(/memberProfile\.html/);
    console.log('✓ Login successful');

    // --- Tables & Desks → Add product to cart ---
    console.log('Step 2: Loading products...');
    await page.goto(
      '/B/' +
        COUNTRY_PREFIX +
        '/furnitureCategory.html?cat=' +
        encodeURIComponent('Tables & Desks')
    );
    
    // Wait for products to load
    await page.waitForSelector('#furnituresDisplay li.product', { timeout: 10000 });
    console.log('✓ Products loaded');
    
    // Wait for page to fully render (important for Add to Cart buttons)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give JavaScript time to render buttons
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/products-page.png', fullPage: true });

    // Check if any Add to Cart buttons exist
    const allAddToCartButtons = page.locator('button').filter({ hasText: /add\s*to\s*cart/i });
    const buttonCount = await allAddToCartButtons.count();
    console.log(`Found ${buttonCount} "Add to Cart" buttons`);
    
    if (buttonCount === 0) {
      // Debugging: Check what buttons ARE present
      const allButtons = await page.locator('li.product button').all();
      console.log(`Found ${allButtons.length} total buttons in product cards`);
      for (let i = 0; i < Math.min(3, allButtons.length); i++) {
        const btnText = await allButtons[i].textContent();
        console.log(`  Button ${i}: "${btnText}"`);
      }
      
      // Check if user is still logged in
      const logoutLink = page.locator('a:has-text("Logout")');
      const isLoggedIn = await logoutLink.count() > 0;
      console.log(`Logged in: ${isLoggedIn}`);
      
      throw new Error(
        'No "Add to Cart" buttons found. Possible reasons:\n' +
        '1. User not logged in (session expired)\n' +
        '2. No products have stock available\n' +
        '3. JavaScript not loading properly\n' +
        'Check test-results/products-page.png for screenshot'
      );
    }

    // Prefer LINMON if present, otherwise use first available product
    const linmonCard = page.locator('li.product').filter({ hasText: /LINMON/i });
    const addToCartInLinmon = linmonCard.locator('button').filter({ hasText: /add\s*to\s*cart/i });
    
    let productName;
    if ((await addToCartInLinmon.count()) > 0) {
      console.log('✓ LINMON found, adding to cart');
      productName = (await linmonCard.locator('h4').first().textContent())?.trim() || 'LINMON';
      await addToCartInLinmon.first().click();
    } else {
      console.log('LINMON not found, using first available product');
      const firstProductWithButton = page.locator('#furnituresDisplay li.product').filter({
        has: page.locator('button').filter({ hasText: /add\s*to\s*cart/i })
      }).first();
      productName = (await firstProductWithButton.locator('h4').first().textContent())?.trim() || 'Product';
      console.log(`Adding product: ${productName}`);
      await allAddToCartButtons.first().click();
    }

    // Wait for redirect or modal after adding to cart
    await page.waitForURL(/goodMsg=|shoppingCart\.html/, { timeout: 10000 });
    console.log(`✓ Added "${productName}" to cart`);

    // --- Cart → Check Out ---
    console.log('Step 3: Going to cart and checking out...');
    await page.goto('/B/' + COUNTRY_PREFIX + '/shoppingCart.html');
    
    // Wait for cart to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Take screenshot of cart page
    await page.screenshot({ path: 'test-results/cart-page.png', fullPage: true });
    
    // Verify product is in cart - try multiple possible selectors
    const cartSelectors = [
      '#cart',
      '#cartItems', 
      '#shoppingCart',
      'body', // fallback - just check page body
    ];
    
    let cartFound = false;
    for (const selector of cartSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        const text = await element.textContent();
        if (text && text.includes(productName)) {
          console.log(`✓ Product found in cart using selector: ${selector}`);
          cartFound = true;
          break;
        }
      }
    }
    
    if (!cartFound) {
      console.log('⚠ Could not verify product in specific cart element, checking entire page...');
      // Just verify product name appears somewhere on the page
      await expect(page.locator('body')).toContainText(productName, { timeout: 5000 });
      console.log('✓ Product name found on cart page');
    }
    
    // Click checkout button
    await page.click('button:has-text("Check Out")');
    await page.waitForSelector('#makePaymentForm', { state: 'visible', timeout: 5000 });
    console.log('✓ Checkout form loaded');

    // --- Delivery details ---
    console.log('Step 4: Filling delivery details...');
    const deliveryName = 'Test User Sales History';
    const deliveryContact = '91234567';
    const deliveryAddress = '123 Test Street';
    const deliveryPostal = '123456';

    await page.fill('#txtName', deliveryName);
    await page.fill('#txtContact', deliveryContact);
    await page.fill('#txtAddress', deliveryAddress);
    await page.fill('#txtPostalCode', deliveryPostal);
    console.log('✓ Delivery details filled');

    // --- Stripe: fill card in iframe ---
    console.log('Step 5: Filling Stripe payment details...');
    await page.waitForSelector('#card-element iframe, iframe', { timeout: 10000 });
    const cardFrame = page.frameLocator('iframe').first();
    
    await cardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await cardFrame.locator('input[name="exp-date"]').fill('1234');
    await cardFrame.locator('input[name="cvc"]').fill('123');
    console.log('✓ Card details filled');

    // --- Make Payment → Confirm modal ---
    console.log('Step 6: Confirming payment...');
    await page.click('#makePayment');
    await page.waitForSelector('#paymentConfirmModal', { state: 'visible', timeout: 5000 });
    
    // Take screenshot before confirming
    await page.screenshot({ path: 'test-results/payment-confirm.png' });
    
    await page.click('#paymentConfirmModal input[onclick="doMakePayment()"]');

    // Wait for success redirect
    await page.waitForURL(/goodMsg=|shoppingCart\.html/, { timeout: 20000 });
    await expect(page).toHaveURL(/goodMsg=/);
    console.log('✓ Payment successful');

    // Capture expected date/time
    const purchaseDate = new Date();
    const expectedWeekday = purchaseDate.toLocaleDateString('en-us', { weekday: 'long' });
    const expectedMonthDayYear = purchaseDate.toLocaleDateString('en-us', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // --- Profile → Sales History tab ---
    console.log('Step 7: Verifying order in Sales History...');
    await page.goto('/B/' + COUNTRY_PREFIX + '/memberProfile.html');
    await page.click('a[href="#salesHistory"]');
    await page.waitForSelector('#salesHistoryTab', { state: 'visible' });
    
    // Wait for sales history to load
    await page.waitForTimeout(2000);
    
    // Take screenshot of sales history
    await page.screenshot({ path: 'test-results/sales-history.png', fullPage: true });

    // --- Assert: order appears with correct details ---
    const salesHistory = page.locator('#salesHistoryTab');
    await expect(salesHistory).not.toContainText('No orders yet');

    // Order contains the product we added
    await expect(salesHistory).toContainText(productName);
    console.log(`✓ Product "${productName}" found in sales history`);

    // Delivery details match what we entered
    await expect(salesHistory).toContainText(deliveryName);
    await expect(salesHistory).toContainText(deliveryContact);
    await expect(salesHistory).toContainText(deliveryAddress);
    await expect(salesHistory).toContainText(deliveryPostal);
    console.log('✓ Delivery details verified');

    // Order section exists (may be multiple orders with same delivery name; pick the most recent one)
    await expect(salesHistory).toContainText('Order #');
    const orderCardWePlaced = salesHistory
      .locator('.sales-history-order-card')
      .filter({ hasText: deliveryName })
      .last();
    await expect(orderCardWePlaced).toBeVisible();

    // Purchase date and time are displayed on that order
    const orderMeta = orderCardWePlaced.locator('.order-meta');
    await expect(orderMeta).toBeVisible();
    const orderMetaText = await orderMeta.textContent();

    // Check weekday of purchase (the order we placed today)
    expect(orderMetaText, 'Sales history should show purchase weekday').toContain(expectedWeekday);

    // Check date of purchase
    expect(orderMetaText, 'Sales history should show purchase date').toContain(expectedMonthDayYear);

    // Check time of purchase is shown
    expect(
      orderMetaText,
      'Sales history should show purchase time (e.g. 06:30 PM)'
    ).toMatch(/\d{1,2}:\d{2}\s*[AP]M/i);
    
    console.log('✓ Purchase date and time verified');
    console.log('✅ All tests passed!');
  });
});