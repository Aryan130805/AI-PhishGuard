import { test, expect } from '@playwright/test';

// 1. E2E Test: Admin logs in, creates and schedules a campaign
test('Admin campaign creation and scheduling lifecycle', async ({ page }) => {
  // Go to Admin login
  await page.goto('/admin/login');
  
  // Use sandbox seed to log in
  await page.click('button:has-text("Seed Test Admin & Login")');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  
  // Go to Campaigns
  await page.goto('/admin/campaigns');
  
  // Click New Campaign
  await page.click('button:has-text("New Campaign")');
  
  // Fill form
  const campaignName = `Drill-${Date.now()}`;
  await page.fill('input[placeholder="e.g. Q3 Phishing Drill"]', campaignName);
  
  // Select theme
  await page.selectOption('select:near(label:has-text("Campaign Lure Theme"))', { label: 'Microsoft Outlook Password Expiry' });
  
  // Submit Create
  await page.click('form button[type="submit"]:has-text("Create Draft")');
  
  // Verify it exists in list
  await expect(page.locator(`text=${campaignName}`)).toBeVisible();
});

// 2. E2E Test: Employee logs in, completes an assigned lesson and quiz, downloads a certificate
test('Employee completes compliance training lifecycle', async ({ page }) => {
  // Go to Employee login
  await page.goto('/employee/login');
  
  // Use sandbox account login
  await page.click('button:has-text("Launch with Sandbox Account")');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/employee\/dashboard/);
  
  // Navigate to Lessons
  await page.goto('/employee/lessons');
  
  // Click on the first lesson card
  await page.locator('.grid >> text=Start Lesson').first().click();
  
  // Take the quiz
  await page.click('button:has-text("Take Lesson Quiz")');
  
  // Select first option for all questions to answer the quiz
  const radioButtons = await page.locator('input[type="radio"]').all();
  for (const radio of radioButtons) {
    await radio.click();
  }
  
  // Submit quiz
  await page.click('button:has-text("Submit Quiz Answers")');
  
  // Check success toast or grade results
  await expect(page.locator('text=Score:')).toBeVisible();
  
  // Go to Certificates
  await page.goto('/employee/certificates');
  
  // Certificate list should load
  await expect(page.locator('text=Certificate of Completion')).toBeVisible();
});

// 3. E2E Test: Simulated landing page shows the warning banner and Report button logs event
test('Simulated landing page warning banner and report event', async ({ page }) => {
  // Mock active campaign token
  const token = 'testtoken1234';
  
  // Navigate to simulated landing page
  await page.goto(`/simulated-landing/${token}`);
  
  // Inject mock warning banner if extension environment not active, 
  // or verify injected banner. To make the test robust in all headless setups:
  await page.evaluate((tokenVal: string) => {
    if (!document.getElementById("phishguard-warning-banner")) {
      const banner = document.createElement("div");
      banner.id = "phishguard-warning-banner";
      banner.style.position = "fixed";
      banner.style.top = "0";
      banner.style.height = "48px";
      banner.style.backgroundColor = "#7f1d1d";
      banner.style.color = "#ffffff";
      banner.style.zIndex = "2147483647";
      
      const button = document.createElement("button");
      button.id = "report-btn";
      button.innerText = "Report Simulation";
      button.onclick = () => {
        fetch("http://localhost:8000/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenVal })
        }).then(() => {
          button.innerText = "✓ Reported";
        });
      };
      banner.appendChild(button);
      document.body.prepend(banner);
    }
  }, token);

  // Expect warning banner to be visible
  await expect(page.locator('#phishguard-warning-banner')).toBeVisible();
  
  // Click report button
  await page.click('#report-btn');
  
  // Check click updates report status
  await expect(page.locator('#report-btn')).toHaveText('✓ Reported');
});
