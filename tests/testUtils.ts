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
      roles: [{ role: Role.Admin }],
    },
  };

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    // Handle logout (DELETE)
    if (method === "DELETE") {
      loggedInUser = undefined;
      await route.fulfill({ status: 200, json: { message: "logout successful" } });
      return;
    }

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

  // IMPORTANT: /api/user/me must come BEFORE /api/user** to take precedence
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

  let allUsers = Object.values(validUsers);
  
  // General user routes - list/update/delete
  // This comes AFTER /api/user/me so it doesn't intercept that specific endpoint
  await page.route("*/**/api/user**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // Skip /api/user/me - it has its own handler above
    if (url.match(/\/api\/user\/me$/)) {
      await route.fallback();
      return;
    }
    
    // List users - GET /api/user?page=1&limit=10&name=*
    if (method === "GET" && /\/api\/user(\?|$)/.test(url)) {
      const urlObj = new URL(url);
      let nameFilter = urlObj.searchParams.get("name") || "*";
      
      let filteredUsers = Object.values(validUsers);
      
      if (nameFilter && nameFilter !== "*") {
        const cleanFilter = nameFilter.replace(/\*/g, "");
        
        if (cleanFilter) {
          filteredUsers = filteredUsers.filter((user) => {
            const userName = user.name?.toLowerCase() || "";
            const filterLower = cleanFilter.toLowerCase();
            return userName.includes(filterLower);
          });
        }
      }
      
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: filteredUsers })
      });
      return;
    }
    
    // Update/Delete specific user - /api/user/{userId}
    if (url.match(/\/api\/user\/[^/]+$/)) {
      const userId = url.split("/").pop();

      // Delete user
      if (method === "DELETE") {
        allUsers = allUsers.filter((u) => u.id !== userId);
        await route.fulfill({ json: {} });
        return;
      }

      // Update user
      if (method === "PUT") {
        const updatedUser = route.request().postDataJSON();
        const index = allUsers.findIndex((u) => u.id === userId);

        if (index !== -1) {
          allUsers[index] = { ...allUsers[index], ...updatedUser };
          await route.fulfill({
            json: {
              user: allUsers[index],
              token: "updated-token-xyz",
            },
          });
        } else {
          await route.fulfill({ status: 404, json: { error: "User not found" } });
        }
        return;
      }
    }
    
    await route.fallback();
  });

  // Load app
  await page.goto("/");
}