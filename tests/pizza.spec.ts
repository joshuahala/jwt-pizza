import { test, expect } from "./testSetup";
import { basicInit } from "./basicInit";

test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

test("login", async ({ page }) => {
  await basicInit(page);
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "KC" })).toBeVisible();
});

test("purchase with login", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("button", { name: "Order now" }).click();

  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("main")).toContainText(
    "Send me those 2 pizzas right now!",
  );
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  await expect(page.getByText("0.008")).toBeVisible();
});

test("list users", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("a@jwt.com");
  await page.getByPlaceholder("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "AU" })).toBeVisible();

  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("Users");
  await expect(page.getByRole("main")).toContainText("Kai Chen");
  await expect(page.getByRole("main")).toContainText("d@jwt.com");
  await expect(page.getByRole("main")).toContainText("Admin User");
  await expect(page.getByRole("main")).toContainText("Fran Chise");
});

test("create franchise", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("a@jwt.com");
  await page.getByPlaceholder("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "AU" })).toBeVisible();

  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await page.getByRole("button", { name: "Add Franchise" }).click();
  await page.getByPlaceholder("franchise name").fill("newest");
  await page.getByPlaceholder("franchisee admin email").fill("a@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("main")).toContainText("newest");
});

test("close franchise", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("a@jwt.com");
  await page.getByPlaceholder("Password").fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "AU" })).toBeVisible();

  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await page.getByRole("row", { name: "topSpot" }).getByRole("button").click();
  await expect(page.getByRole("main")).toContainText("topSpot");
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("main")).toContainText("LotaPizza");
  await expect(page.getByText("topSpot")).toHaveCount(0);
});

test("close store", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("f@jwt.com");
  await page.getByPlaceholder("Password").fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "FC" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Global" })
    .getByRole("link", { name: "Franchise" })
    .click();
  await page.getByRole("row", { name: "Lehi" }).getByRole("button").click();
  await expect(page.getByRole("main")).toContainText("Lehi");
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("main")).toContainText("Springville");
  await expect(page.getByText("Lehi")).toHaveCount(0);
});

test("create store", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("f@jwt.com");
  await page.getByPlaceholder("Password").fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "FC" })).toBeVisible();

  await page
    .getByRole("navigation", { name: "Global" })
    .getByRole("link", { name: "Franchise" })
    .click();
  await page.getByRole("button", { name: "Create store" }).click();
  await page.getByPlaceholder("store name").fill("new store");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("main")).toContainText("new store");
});

test("logout", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByPlaceholder("Email address").fill("f@jwt.com");
  await page.getByPlaceholder("Password").fill("franchisee");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "FC" })).toBeVisible();

  await page.getByRole("link", { name: "Logout" }).click();

  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "FC" })).toHaveCount(0);
});

test("about page", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "About" }).click();

  await expect(page.getByRole("heading", { name: "The secret sauce" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText("Our employees");
});

test("register", async ({ page }) => {
  await basicInit(page);

  await page.getByRole("link", { name: "Register" }).click();
  await page.getByPlaceholder("Full name").fill("Test User");
  await page.getByPlaceholder("Email address").fill("t@jwt.com");
  await page.getByPlaceholder("Password").fill("test");
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page.getByRole("link", { name: "TU" })).toBeVisible();
});
