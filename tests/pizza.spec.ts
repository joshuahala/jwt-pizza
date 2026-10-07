import { Page } from "@playwright/test";
import { test, expect } from "./testSetup";
import { Role, User } from "../src/service/pizzaService";

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    "d@jwt.com": {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      password: "a",
      roles: [{ role: Role.Diner }],
    },
    "a@jwt.com": {
      id: "1",
      name: "Admin User",
      email: "a@jwt.com",
      password: "admin",
      roles: [{ role: Role.Admin }],
    },
    "f@jwt.com": {
      id: "8",
      name: "Fran Chise",
      email: "f@jwt.com",
      password: "franchisee",
      roles: [{ role: Role.Franchisee, objectId: "2" }],
    },
  };

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();
    if (method === "DELETE") {
      loggedInUser = undefined;
      await route.fulfill({ json: {} });
      return;
    }
    const authReq = route.request().postDataJSON();
    if (method === "POST") {
      const newUser: User = {
        id: "9",
        name: authReq.name,
        email: authReq.email,
        password: authReq.password,
        roles: [{ role: Role.Diner }],
      };
      validUsers[newUser.email!] = newUser;
      loggedInUser = newUser;
      await route.fulfill({ json: { user: newUser, token: "abcdef" } });
      return;
    }
    const user = validUsers[authReq.email];
    if (!user || user.password !== authReq.password) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    loggedInUser = validUsers[authReq.email];
    expect(method).toBe("PUT");
    await route.fulfill({ json: { user: loggedInUser, token: "abcdef" } });
  });

  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: "1",
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: "2",
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  const franchises = [
    {
      id: "2",
      name: "LotaPizza",
      stores: [
        { id: "4", name: "Lehi" },
        { id: "5", name: "Springville" },
        { id: "6", name: "American Fork" },
      ],
    },
    {
      id: "3",
      name: "PizzaCorp",
      stores: [{ id: "7", name: "Spanish Fork" }],
    },
    { id: "4", name: "topSpot", stores: [] },
  ];

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    if (route.request().method() === "POST") {
      const franchiseReq = route.request().postDataJSON();
      const franchiseRes = { ...franchiseReq, id: "5", stores: [] };
      franchises.push(franchiseRes);
      await route.fulfill({ json: franchiseRes });
      return;
    }
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: { franchises, more: false } });
  });

  await page.route(/\/api\/franchise\/[^/]+$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    if (route.request().method() === "DELETE") {
      const index = franchises.findIndex((franchise) => franchise.id === id);
      if (index >= 0) franchises.splice(index, 1);
      await route.fulfill({ json: {} });
      return;
    }
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: id === "8" ? [franchises[0]] : [] });
  });

  await page.route(/\/api\/franchise\/[^/]+\/store$/, async (route) => {
    expect(route.request().method()).toBe("POST");
    const franchiseId = new URL(route.request().url()).pathname.split("/")[3];
    const storeReq = route.request().postDataJSON();
    const storeRes = { ...storeReq, id: "8" };
    const franchise = franchises.find((item) => item.id === franchiseId);
    if (franchise) franchise.stores.push(storeRes);
    await route.fulfill({ json: storeRes });
  });

  await page.route(/\/api\/franchise\/[^/]+\/store\/[^/]+$/, async (route) => {
    expect(route.request().method()).toBe("DELETE");
    const parts = new URL(route.request().url()).pathname.split("/");
    const franchiseId = parts.at(-3);
    const storeId = parts.at(-1);
    const franchise = franchises.find((item) => item.id === franchiseId);
    if (franchise) {
      franchise.stores = franchise.stores.filter(
        (store) => store.id !== storeId,
      );
    }
    await route.fulfill({ json: {} });
  });

  await page.route("*/**/api/order", async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: "23" },
      jwt: "eyJpYXQ",
    };
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ json: orderRes });
  });

  await page.goto("/");
}

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
