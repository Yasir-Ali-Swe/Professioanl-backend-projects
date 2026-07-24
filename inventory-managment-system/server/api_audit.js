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

  if (!response.ok) {
    const err = new Error(`HTTP Error ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return { status: response.status, data };
}

async function runAudit() {
  console.log("=== STARTING API QA AUDIT ===");

  let adminToken = "";
  let staffToken = "";
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
    console.log("✔ Admin Login Successful. Token obtained.");
  } catch (err) {
    console.error("❌ Admin Login Failed:", err.data || err.message);
    return;
  }

  // Get staff token too
  try {
    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: "POST",
      body: {
        email: "aiproductengineer288@gmail.com",
        password: "Password123!"
      }
    });
    staffToken = loginRes.data.accessToken;
    console.log("✔ Staff Login Successful. Token obtained.");
  } catch (err) {
    console.warn("⚠ Staff Login Failed (will skip staff auth tests):", err.data || err.message);
  }

  // 2. CATEGORY AUDIT
  console.log("\n--- Testing Category Module ---");
  let newCatId = "";
  // Test A: Duplicate Category Name
  try {
    await request(`${BASE_URL}/category/create-category`, {
      method: "POST",
      body: { name: "Electronics" },
      headers
    });
    console.log("❌ Duplicate Category Creation: Succeeded (should have failed or returned validation error)");
  } catch (err) {
    console.log(`✔ Duplicate Category Creation failed as expected. Status: ${err.status}. Response:`, err.data);
  }

  // Test B: Create Valid Category
  try {
    const res = await request(`${BASE_URL}/category/create-category`, {
      method: "POST",
      body: { name: "QA Temp Category" },
      headers
    });
    console.log(`✔ Create Valid Category Succeeded. Status: ${res.status}`);
  } catch (err) {
    console.error("❌ Create Valid Category Failed:", err.data || err.message);
  }

  // Fetch category list to get the ID
  try {
    const res = await request(`${BASE_URL}/category/get-all-categories`, {
      method: "GET",
      headers
    });
    const list = res.data.data || [];
    const createdCat = list.find(c => c.name === "QA Temp Category");
    if (createdCat) {
      newCatId = createdCat._id;
      console.log(`✔ Found created category ID: ${newCatId}`);
    } else {
      console.log("❌ Created category not found in list!");
    }
  } catch (err) {
    console.error("❌ Fetch Categories Failed:", err.data || err.message);
  }

  // 3. SUPPLIER AUDIT
  console.log("\n--- Testing Supplier Module ---");
  let newSuppId = "";
  // Test A: Invalid Email & Negative Lead Time
  try {
    const res = await request(`${BASE_URL}/supplier/create-supplier`, {
      method: "POST",
      body: {
        name: "QA Temp Supplier",
        contactPerson: "QA Tester",
        email: "not-an-email",
        phone: "12345678",
        address: "123 Test St",
        leadTimeDays: -5
      },
      headers
    });
    console.log(`❌ Create Supplier with malformed email and negative lead time succeeded. Status: ${res.status}. Response:`, res.data);
  } catch (err) {
    console.log(`✔ Create Supplier with invalid data failed. Status: ${err.status}. Response:`, err.data);
  }

  // Fetch suppliers list to see if it was created
  try {
    const res = await request(`${BASE_URL}/supplier/get-all-suppliers`, {
      method: "GET",
      headers
    });
    const list = res.data.data || [];
    const createdSupp = list.find(s => s.name === "QA Temp Supplier");
    if (createdSupp) {
      newSuppId = createdSupp._id;
      console.log(`✔ Found Supplier in list. ID: ${newSuppId}`);
    } else {
      // Create a valid one if not created
      await request(`${BASE_URL}/supplier/create-supplier`, {
        method: "POST",
        body: {
          name: "QA Valid Supplier",
          contactPerson: "QA Tester",
          email: "qa@supplier.com",
          phone: "12345678",
          address: "123 Test St",
          leadTimeDays: 3
        },
        headers
      });
      console.log("✔ Created valid supplier.");
      const res2 = await request(`${BASE_URL}/supplier/get-all-suppliers`, { method: "GET", headers });
      const list2 = res2.data.data || [];
      const createdSupp2 = list2.find(s => s.name === "QA Valid Supplier");
      newSuppId = createdSupp2?._id;
    }
  } catch (err) {
    console.error("❌ Supplier listing failed:", err.message);
  }

  // 4. PRODUCT AUDIT
  console.log("\n--- Testing Product Module ---");
  let newProdId = "";
  // Test A: Create Product with negative price/quantity values
  if (newCatId && newSuppId) {
    try {
      const res = await request(`${BASE_URL}/product/create-product`, {
        method: "POST",
        body: {
          name: "QA Negative Price Product",
          categoryId: newCatId,
          supplierId: newSuppId,
          costPrice: -10.50,
          sellingPrice: -20.00,
          unit: "piece",
          quantity: -5,
          reorderThreshold: -1
        },
        headers
      });
      console.log(`❌ Create Product with negative values succeeded (should have validation errors). Status: ${res.status}. Response:`, res.data);
      newProdId = res.data.data?._id;
    } catch (err) {
      console.log(`✔ Create Product with negative values failed. Status: ${err.status}. Response:`, err.data);
    }

    // Test B: Create Valid Product with auto SKU
    try {
      const res = await request(`${BASE_URL}/product/create-product`, {
        method: "POST",
        body: {
          name: "QA Test Widget",
          categoryId: newCatId,
          supplierId: newSuppId,
          costPrice: 100.00,
          sellingPrice: 150.00,
          unit: "piece",
          quantity: 10,
          reorderThreshold: 5
        },
        headers
      });
      newProdId = res.data.data?._id;
      console.log(`✔ Create Product with auto-SKU succeeded. SKU: ${res.data.data?.sku}`);
    } catch (err) {
      console.error("❌ Create Product failed:", err.data || err.message);
    }

    // Test C: Create Duplicate SKU
    if (newProdId) {
      try {
        const prodDetails = await request(`${BASE_URL}/product/get-product-by-id/${newProdId}`, { method: "GET", headers });
        const sku = prodDetails.data.data?.sku;
        const res = await request(`${BASE_URL}/product/create-product`, {
          method: "POST",
          body: {
            name: "QA Duplicate SKU Product",
            categoryId: newCatId,
            supplierId: newSuppId,
            costPrice: 50,
            sellingPrice: 75,
            unit: "piece",
            sku: sku
          },
          headers
        });
        console.log(`❌ Create Product with duplicate SKU succeeded. Status: ${res.status}`);
      } catch (err) {
        console.log(`✔ Create Product with duplicate SKU failed. Status: ${err.status}. Response:`, err.data);
      }
    }
  }

  // 5. STOCK AUDIT
  console.log("\n--- Testing Stock Module ---");
  if (newProdId) {
    // Test A: Stock In with invalid reason casing ("Purchase")
    try {
      const res = await request(`${BASE_URL}/stock/stock-in`, {
        method: "POST",
        body: {
          productId: newProdId,
          quantity: 10,
          reason: "Purchase"
        },
        headers
      });
      console.log(`❌ Stock In with capitalized reason succeeded. Status: ${res.status}`);
    } catch (err) {
      console.log(`✔ Stock In with capitalized reason failed. Status: ${err.status}. Response:`, err.data);
    }

    // Test B: Stock In with valid reason casing ("purchase")
    try {
      const res = await request(`${BASE_URL}/stock/stock-in`, {
        method: "POST",
        body: {
          productId: newProdId,
          quantity: 10,
          reason: "purchase"
        },
        headers
      });
      console.log(`✔ Stock In with valid reason succeeded. New quantity: ${res.data.data?.product?.quantity}`);
    } catch (err) {
      console.error("❌ Stock In failed:", err.data || err.message);
    }

    // Test C: Stock Out greater than available stock
    try {
      const res = await request(`${BASE_URL}/stock/stock-out`, {
        method: "POST",
        body: {
          productId: newProdId,
          quantity: 500,
          reason: "sale"
        },
        headers
      });
      console.log(`❌ Stock Out exceeding availability succeeded. Status: ${res.status}`);
    } catch (err) {
      console.log(`✔ Stock Out exceeding availability failed. Status: ${err.status}. Response:`, err.data);
    }

    // Test D: Stock Out with negative quantity
    try {
      const res = await request(`${BASE_URL}/stock/stock-out`, {
        method: "POST",
        body: {
          productId: newProdId,
          quantity: -5,
          reason: "sale"
        },
        headers
      });
      console.log(`❌ Stock Out with negative quantity succeeded. Status: ${res.status}`);
    } catch (err) {
      console.log(`✔ Stock Out with negative quantity failed. Status: ${err.status}. Response:`, err.data);
    }
  }

  // 6. TEAM INVITATION & ACCESS CONTROL
  console.log("\n--- Testing Team & Authorization ---");
  // Test A: Admin invites a user with role `super_admin` (Privilege Escalation)
  try {
    const inviteRes = await request(`${BASE_URL}/organization/organization-users/invite`, {
      method: "POST",
      body: {
        name: "QA Superadmin Attempt",
        email: `super_admin_attempt_${Date.now()}@example.com`,
        role: "super_admin",
        password: "Password123!"
      },
      headers
    });
    console.log(`❌ Privilege Escalation: Admin invited a super_admin successfully. Status: ${inviteRes.status}. Response:`, inviteRes.data);
  } catch (err) {
    console.log(`✔ Admin invite super_admin failed. Status: ${err.status}. Response:`, err.data);
  }

  // Test B: Staff attempts to perform stock-in but lacks permissions (Wait, staff has permission for stock-in/out in routes! Let's check if they can access organization-users list)
  if (staffToken) {
    try {
      await request(`${BASE_URL}/organization/organization-users`, {
        method: "GET",
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      console.log("❌ Role Check: Staff user successfully listed organization users!");
    } catch (err) {
      console.log(`✔ Role Check: Staff user blocked from listing users. Status: ${err.status}. Response:`, err.data);
    }
  }

  // Cleanup temporary items
  console.log("\n--- Cleaning up temporary QA items ---");
  // Toggle product inactive
  if (newProdId) {
    try {
      await request(`${BASE_URL}/product/toggle-product-active/${newProdId}`, {
        method: "PATCH",
        body: { isActive: false },
        headers
      });
      console.log("✔ Deactivated temp product.");
    } catch (err) {
      console.error("⚠ Failed to deactivate temp product:", err.message);
    }
  }

  // Delete category
  if (newCatId) {
    try {
      await request(`${BASE_URL}/category/delete-category/${newCatId}`, {
        method: "DELETE",
        headers
      });
      console.log("✔ Deleted temp category.");
    } catch (err) {
      console.log("⚠ Deleted temp category failed (expected if active products exist):", err.data?.message);
    }
  }

  // Delete supplier
  if (newSuppId) {
    try {
      await request(`${BASE_URL}/supplier/delete-supplier/${newSuppId}`, {
        method: "DELETE",
        headers
      });
      console.log("✔ Deleted temp supplier.");
    } catch (err) {
      console.log("⚠ Deleted temp supplier failed (expected if active products exist):", err.data?.message);
    }
  }

  console.log("\n=== API QA AUDIT COMPLETE ===");
}

runAudit();
