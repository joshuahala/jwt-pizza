import { expect, Page } from "@playwright/test";
import { Role, User } from "../src/service/pizzaService";

export async function basicInit(page: Page) {
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
  const users: User[] = Object.values(validUsers);

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
      users.push(newUser);
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

  await page.route(/\/api\/user(\/[^/?]+)?(\?.*)?$/, async (route) => {
    const method = route.request().method();
    const pathname = new URL(route.request().url()).pathname;

    if (pathname.endsWith("/me")) {
      expect(method).toBe("GET");
      await route.fulfill({ json: loggedInUser });
      return;
    }

    if (method === "GET") {
      await route.fulfill({ json: { users, more: false } });
      return;
    }

    if (method === "PUT") {
      const id = pathname.split("/").pop();
      const body = route.request().postDataJSON();
      let user = Object.values(validUsers).find((item) => item.id === id);
      if (!user) {
        user = { id, roles: [{ role: Role.Diner }] };
        users.push(user);
      }

      const previousEmail = user.email;
      user.name = body.name ?? user.name;
      user.email = body.email ?? user.email;
      if (body.password) {
        user.password = body.password;
      }

      if (previousEmail && previousEmail !== user.email) {
        delete validUsers[previousEmail];
      }
      if (user.email) {
        validUsers[user.email] = user;
      }

      loggedInUser = user;
      await route.fulfill({ json: { user, token: "abcdef" } });
      return;
    }

    expect(method).toBe("DELETE");
    const id = pathname.split("/").pop();
    const index = users.findIndex((user) => user.id === id);
    if (index >= 0) users.splice(index, 1);
    await route.fulfill({ json: {} });
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
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        json: { id: loggedInUser?.id, dinerId: loggedInUser?.id, orders: [] },
      });
      return;
    }

    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: "23" },
      jwt: "eyJpYXQ",
    };
    expect(method).toBe("POST");
    await route.fulfill({ json: orderRes });
  });

  await page.goto("/");
}
