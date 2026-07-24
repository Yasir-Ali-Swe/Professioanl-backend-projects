const BASE_URL = "http://localhost:5000/api/v1";

async function request(url, options = {}) {
  const { body, ...rest } = options;
  const config = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...rest.headers,
    },
  };
  if (body) {
    config.body = JSON.stringify(body);
  }
  const response = await fetch(url, config);
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  return { status: response.status, data, ok: response.ok };
}

async function runVerification() {
  console.log("=== RUNNING QA FIX VERIFICATION ===");

  let adminToken = "";
  let headers = {};

  // 1. LOGIN
  try {
    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: {
        email: "ali.yasirswe@gmail.com",
        password: "Password123!"
      }
    });
    adminToken = loginRes.data.accessToken;
    headers = { Authorization: `Bearer ${adminToken}` };
    console.log("✔ Admin logged in.");
  } catch (err) {
    console.error("❌ Login Failed:", err.message);
    return;
  }

  // 2. PRIVILEGE ESCALATION BLOCK
  console.log("\n- Testing Privilege Escalation Check -");
  const inviteRes = await request(`${BASE_URL}/organization/organization-users/invite`, {
    method: "POST",
    body: {
      name: "Exploit User",
      email: `exploit_${Date.now()}@example.com`,
      role: "super_admin",
      password: "Password123!"
    },
    headers
  });
  if (inviteRes.status === 403) {
    console.log("✔ Successfully blocked admin from inviting super_admin (Status 403). Response:", inviteRes.data.message);
  } else {
    console.log("❌ Failed to block admin from inviting super_admin! Status:", inviteRes.status, inviteRes.data);
  }

  // 3. PRODUCT BOUNDS VALIDATION
  console.log("\n- Testing Product Bounds Checks -");
  const prodRes = await request(`${BASE_URL}/product/create-product`, {
    method: "POST",
    body: {
      name: "QA Negative Price Product",
      categoryId: "6a63617cdfc46be96c5e6bdb",
      supplierId: "6a63617cdfc46be96c5e6bdc",
      costPrice: -5.00,
      sellingPrice: 10.00,
      unit: "piece"
    },
    headers
  });
  if (prodRes.status === 400) {
    console.log("✔ Successfully blocked product with negative price (Status 400). Response:", prodRes.data.message);
  } else {
    console.log("❌ Failed to block product with negative price! Status:", prodRes.status, prodRes.data);
  }

  // 4. SUPPLIER BOUNDS VALIDATION
  console.log("\n- Testing Supplier Bounds Checks -");
  const suppRes = await request(`${BASE_URL}/supplier/create-supplier`, {
    method: "POST",
    body: {
      name: "QA Bad Supplier",
      contactPerson: "QA Tester",
      email: "bad-email",
      phone: "123456",
      address: "Address",
      leadTimeDays: -3
    },
    headers
  });
  if (suppRes.status === 400) {
    console.log("✔ Successfully blocked supplier with negative leadTime and bad email (Status 400). Response:", suppRes.data.message);
  } else {
    console.log("❌ Failed to block bad supplier! Status:", suppRes.status, suppRes.data);
  }

  // 5. DUPLICATE CATEGORY ERROR HANDLING
  console.log("\n- Testing Duplicate Category Validation -");
  const catRes = await request(`${BASE_URL}/category/create-category`, {
    method: "POST",
    body: { name: "Electronics" },
    headers
  });
  if (catRes.status === 400) {
    console.log("✔ Duplicate category correctly returned Status 400. Response:", catRes.data.message);
  } else {
    console.log("❌ Duplicate category did not return 400! Status:", catRes.status, catRes.data);
  }

  // 6. STOCK IN CASING NORMALIZATION
  console.log("\n- Testing Stock Casing Normalization -");
  const stockRes = await request(`${BASE_URL}/stock/stock-in`, {
    method: "POST",
    body: {
      productId: "6a636199f9ce168ed2e9dd7e", // Existing product or matching temp product
      quantity: 1,
      reason: "Purchase" // Capitalized
    },
    headers
  });
  if (stockRes.status === 201 || (stockRes.status === 404 && stockRes.data.message === "Product not found")) {
    console.log("✔ Stock-in casing normalization check passed. Status:", stockRes.status, "Response message:", stockRes.data.message);
  } else {
    console.log("❌ Stock-in failed casing normalization! Status:", stockRes.status, stockRes.data);
  }

  console.log("\n=== VERIFICATION COMPLETE ===");
}

runVerification();
