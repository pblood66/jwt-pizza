import { Page } from "@playwright/test";
import { Role, User } from "../src/service/pizzaService";

export async function basicInit(page: Page, role: Role = Role.Diner) {
  let loggedInUser: User | undefined;

  const validUsers: Record<string, User> = {
    "d@jwt.com": {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      password: "a",
      roles: [{ role }],
    },
    "a@jwt.com": {
      id: "4",
      name: "Admin User", 
      email: "a@jwt.com",
      password: "d",
      roles: [{role: Role.Admin}],
    }
  };

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    // Only login should be PUT
    if (method !== "PUT") {
      await route.fulfill({ status: 200, json: {} });
      return;
    }

    const loginReq = route.request().postDataJSON();

    if (!loginReq || !loginReq.email) {
      await route.fulfill({ status: 400, json: { error: "Bad request" } });
      return;
    }

    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }

    loggedInUser = user;
    await route.fulfill({ json: { user, token: "abcdef" } });
  });

  await page.route("*/**/api/user/me", async (route) => {
    await route.fulfill({ json: loggedInUser ?? null });
  });

  await page.route("*/**/api/order/menu", async (route) => {
    await route.fulfill({
      json: [
        {
          id: 1,
          title: "Veggie",
          image: "pizza1.png",
          price: 0.0038,
          description: "Garden",
        },
        {
          id: 2,
          title: "Pepperoni",
          image: "pizza2.png",
          price: 0.0042,
          description: "Spicy",
        },
      ],
    });
  });

  let franchises = [
    {
      id: 1,
      name: "Pizza Empire",
      stores: [{ id: 1, name: "Downtown" }],
    },
  ];

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    const method = route.request().method();

    // Get all franchises
    if (method === "GET") {
      await route.fulfill({ json: { franchises } });
      return;
    }

    // Create franchise
    if (method === "POST") {
      const body = route.request().postDataJSON();
      const newFranchise = {
        id: franchises.length + 1,
        name: body.name,
        stores: [],
      };
      franchises.push(newFranchise);

      await route.fulfill({ json: newFranchise });
      return;
    }

    await route.fulfill({ status: 400, json: {} });
  });

  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    if (route.request().method() === "DELETE") {
      const id = Number(route.request().url().split("/").pop());
      franchises = franchises.filter((f) => f.id !== id);
      await route.fulfill({ json: {} });
      return;
    }
  });

  await page.route("*/**/api/order", async (route) => {
    const method = route.request().method();

    // Fetch order history
    if (method === "GET") {
      await route.fulfill({ json: { orders: [] } });
      return;
    }

    // Create order
    if (method === "POST") {
      const orderReq = route.request().postDataJSON() || {};
      await route.fulfill({
        json: {
          order: { ...orderReq, id: 99 },
          jwt: "abc123",
        },
      });
      return;
    }

    await route.fulfill({ status: 400, json: {} });
  });

  // Load app
  await page.goto("/");
}
