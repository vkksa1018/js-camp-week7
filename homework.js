// ========================================
// 第七週作業：使用第三方套件優化電商系統
// 執行方式：npm install && node homework.js
// ========================================

// 載入環境變數與套件
require("dotenv").config({ path: ".env" });
const dayjs = require("dayjs");
const axios = require("axios");

// API 設定（從 .env 讀取）
const API_PATH = process.env.API_PATH;
const BASE_URL = "https://livejs-api.hexschool.io";
const ADMIN_TOKEN = process.env.API_KEY;

// ========================================
// 任務一：日期處理 - dayjs
// ========================================

/**
 * 1. 將 Unix timestamp 轉換為可讀日期
 * @param {number} timestamp - Unix timestamp（秒）
 * @returns {string} - 格式 'YYYY/MM/DD HH:mm'，例如 '2024/01/01 08:00'
 */
function formatOrderDate(timestamp) {
  // 請實作此函式
  // 提示：dayjs.unix(timestamp).format('YYYY/MM/DD HH:mm')
  return dayjs.unix(timestamp).format("YYYY/MM/DD HH:mm");
}

/**
 * 2. 計算訂單距今幾天
 * @param {number} timestamp - Unix timestamp（秒）
 * @returns {string} - 例如 '3 天前' 或 '今天'
 */
function getDaysAgo(timestamp) {
  // 請實作此函式
  // 提示：
  // 1. 用 dayjs() 取得今天
  // 2. 用 dayjs.unix(timestamp) 取得訂單日期
  // 3. 用 .diff() 計算天數差異
  const now = dayjs();
  const targetDate = dayjs.unix(timestamp);
  const diff = now.diff(targetDate, "day");

  if (diff === 0) {
    return "今天";
  } else {
    return `${diff} 天前`;
  }
}

/**
 * 3. 判斷訂單是否超過 7 天（可能需要催付款）
 * @param {number} timestamp - Unix timestamp（秒）
 * @returns {boolean} - 超過 7 天回傳 true
 */
function isOrderOverdue(timestamp) {
  // 請實作此函式
  const now = dayjs();
  const orderDate = dayjs.unix(timestamp);

  const diffDays = now.diff(orderDate, "day");
  return diffDays > 7;
}

/**
 * 4. 取得本週的訂單
 * @param {Array} orders - 訂單陣列，每筆訂單有 createdAt 欄位
 * @returns {Array} - 篩選出 createdAt 在本週的訂單
 */
function getThisWeekOrders(orders) {
  // 請實作此函式
  // 提示：
  // 1. 用 dayjs().startOf('week') 取得本週開始
  // 2. 用 dayjs().endOf('week') 取得本週結束
  // 3. 用 .isBefore() 和 .isAfter() 判斷
  const startOfWeek = dayjs().startOf("week");
  const endOfWeek = dayjs().endOf("week");

  return orders.filter((order) => {
    const orderDate = dayjs.unix(order.createdAt);
    // 檢查訂單日期是否在週初之後，且在週末之前
    return orderDate.isAfter(startOfWeek) && orderDate.isBefore(endOfWeek);
  });
}

// ========================================
// 任務二：資料驗證（原生 JS 實作）
// ========================================

/**
 * 1. 驗證訂單使用者資料
 * @param {Object} data - { name, tel, email, address, payment }
 * @returns {Object} - { isValid: boolean, errors: string[] }
 *
 * 驗證規則：
 * - name: 不可為空
 * - tel: 必須是 09 開頭的 10 位數字
 * - email: 必須包含 @ 符號
 * - address: 不可為空
 * - payment: 必須是 'ATM', 'Credit Card', 'Apple Pay' 其中之一
 */
function validateOrderUser(data) {
  // 請實作此函式
  const errors = [];
  const { name, tel, email, address, payment } = data;

  if (!name) errors.push("姓名不可為空");

  // 驗證手機：09 開頭且共 10 位數字
  const telRule = /^09\d{8}$/;
  if (!telRule.test(tel)) errors.push("手機格式不正確");

  if (!email || !email.includes("@")) errors.push("Email 格式不正確");
  if (!address) errors.push("地址不可為空");

  const validPayments = ["ATM", "Credit Card", "Apple Pay"];
  if (!validPayments.includes(payment)) errors.push("付款方式不正確");

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * 2. 驗證購物車數量
 * @param {number} quantity - 數量
 * @returns {Object} - { isValid: boolean, error?: string }
 *
 * 驗證規則：
 * - 必須是正整數
 * - 不可小於 1
 * - 不可大於 99
 */
function validateCartQuantity(quantity) {
  // 請實作此函式
  // 檢查是否為整數、大於等於 1 且小於等於 99
  const isValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 99;
  return {
    isValid: isValid,
    error: isValid ? null : "數量必須是 1-99 之間的整數",
  };
}

// ========================================
// 任務三：唯一識別碼（原生 JS 實作）
// ========================================

/**
 * 1. 產生訂單編號
 * @returns {string} - 格式 'ORD-xxxxxxxx'
 */
function generateOrderId() {
  // 請實作此函式
  // 提示：可以用 Date.now().toString(36) + Math.random().toString(36).slice(2)
  const randomStr =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `ORD-${randomStr}`;
}

/**
 * 2. 產生購物車項目 ID
 * @returns {string} - 格式 'CART-xxxxxxxx'
 */
function generateCartItemId() {
  // 請實作此函式
  const randomStr = Math.random().toString(36).slice(2, 10);
  return `CART-${randomStr}`;
}

// ========================================
// 任務四：使用 Axios 串接 API
// ========================================

/**
 * 1. 取得產品列表（使用 Axios）
 * @returns {Promise<Array>} - 回傳 products 陣列
 */
async function getProductsWithAxios() {
  // 請實作此函式
  // 提示：axios.get() 會自動解析 JSON，不需要 .json()
  // 回傳 response.data.products
  try {
    const url = `${BASE_URL}/api/livejs/v1/customer/${API_PATH}/products`;
    const response = await axios.get(url);
    return response.data.products;
  } catch (error) {
    console.error("取得產品失敗", error);
  }
}

/**
 * 2. 加入購物車（使用 Axios）
 * @param {string} productId - 產品 ID
 * @param {number} quantity - 數量
 * @returns {Promise<Object>} - 回傳購物車資料
 */
async function addToCartWithAxios(productId, quantity) {
  // 請實作此函式
  // 提示：axios.post(url, data) 會自動設定 Content-Type
  try {
    const url = `${BASE_URL}/api/livejs/v1/customer/${API_PATH}/carts`;
    const data = {
      data: { productId, quantity },
    };
    const response = await axios.post(url, data);
    return response.data;
  } catch (error) {
    console.error("加入購物車失敗", error);
  }
}

/**
 * 3. 取得訂單（使用 Axios，需認證）
 * @returns {Promise<Array>} - 回傳訂單陣列
 */
async function getOrdersWithAxios() {
  // 請實作此函式
  // 提示：axios.get(url, { headers: { authorization: token } })
  try {
    const url = `${BASE_URL}/api/livejs/v1/admin/${API_PATH}/orders`;
    const response = await axios.get(url, {
      headers: {
        Authorization: ADMIN_TOKEN,
      },
    });
    return response.data.orders;
  } catch (error) {
    console.error("取得訂單失敗", error);
  }
}

/*

比較題：請說明 fetch 和 axios 的主要差異

1. JSON 解析： fetch 需要手動執行 .json() 轉換；axios 會自動轉換並放在 data 屬性中。

2. 錯誤處理： fetch 只有在網路斷線時才會發出 reject，遇到 404 或 500 仍視為 resolve（需手動檢查 res.ok）；axios 在 HTTP 狀態碼非 2xx 時會直接進入 catch。

3. 語法便利性： axios 支援攔截器 (Interceptors)、請求超時 (Timeout) 設定，且在傳送 POST 請求時會自動設定 Content-Type: application/json。

*/

// ========================================
// 任務五：整合應用 (挑戰)
// ========================================

/**
 * 建立一個完整的「訂單服務」物件
 */
const OrderService = {
  apiPath: API_PATH,
  baseURL: BASE_URL,
  token: ADMIN_TOKEN,

  /**
   * 使用 axios 取得訂單
   * @returns {Promise<Array>} - 訂單陣列
   */
  async fetchOrders() {
    // 請實作此函式
    try {
      const url = `${this.baseURL}/api/livejs/v1/admin/${this.apiPath}/orders`;
      const response = await axios.get(url, {
        headers: {
          Authorization: this.token,
        },
      });
      return response.data.orders;
    } catch (error) {
      console.error(
        "無法取得訂單：",
        error.response?.data?.message || error.message,
      );
      return []; // 失敗時回傳空陣列避免後續 filter 報錯
    }
  },

  /**
   * 使用 dayjs 格式化訂單日期
   * @param {Array} orders - 訂單陣列
   * @returns {Array} - 為每筆訂單加上 formattedDate 欄位
   */
  formatOrders(orders) {
    // 請實作此函式
    return orders.map((order) => {
      return {
        ...order,
        // 使用之前寫過的 formatOrderDate 邏輯
        formattedDate: dayjs.unix(order.createdAt).format("YYYY/MM/DD HH:mm"),
      };
    });
  },

  /**
   * 篩選未付款訂單
   * @param {Array} orders - 訂單陣列
   * @returns {Array} - paid: false 的訂單
   */
  filterUnpaidOrders(orders) {
    // 請實作此函式
    return orders.filter((order) => !order.paid);
  },

  /**
   * 驗證訂單使用者資料
   * @param {Object} userInfo - 使用者資料
   * @returns {Object} - 驗證結果
   */
  validateUserInfo(userInfo) {
    return validateOrderUser(userInfo);
  },

  /**
   * 整合：取得未付款訂單，並格式化日期
   * @returns {Promise<Array>} - 格式化後的未付款訂單
   */
  async getUnpaidOrdersFormatted() {
    const orders = await this.fetchOrders();
    const unpaid = this.filterUnpaidOrders(orders);
    return this.formatOrders(unpaid);
  },
};

// ========================================
// 匯出函式供測試使用
// ========================================
module.exports = {
  API_PATH,
  BASE_URL,
  ADMIN_TOKEN,
  formatOrderDate,
  getDaysAgo,
  isOrderOverdue,
  getThisWeekOrders,
  validateOrderUser,
  validateCartQuantity,
  generateOrderId,
  generateCartItemId,
  getProductsWithAxios,
  addToCartWithAxios,
  getOrdersWithAxios,
  OrderService,
};

// ========================================
// 直接執行測試
// ========================================
if (require.main === module) {
  // 測試資料
  const testOrders = [
    {
      id: "order-1",
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 3,
      paid: false,
    },
    {
      id: "order-2",
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 10,
      paid: true,
    },
    { id: "order-3", createdAt: Math.floor(Date.now() / 1000), paid: false },
  ];

  async function runTests() {
    console.log("=== 第七週作業測試 ===\n");
    console.log("API_PATH:", API_PATH);
    console.log("");

    // 任務一測試
    console.log("--- 任務一：dayjs 日期處理 ---");
    const timestamp = 1704067200;
    console.log("formatOrderDate:", formatOrderDate(timestamp));
    console.log("getDaysAgo:", getDaysAgo(testOrders[0].createdAt));
    console.log("isOrderOverdue:", isOrderOverdue(testOrders[1].createdAt));
    console.log(
      "getThisWeekOrders:",
      getThisWeekOrders(testOrders)?.length,
      "筆",
    );

    // 任務二測試
    console.log("\n--- 任務二：資料驗證 ---");
    const validUser = {
      name: "王小明",
      tel: "0912345678",
      email: "test@example.com",
      address: "台北市信義區",
      payment: "Credit Card",
    };
    console.log("validateOrderUser (valid):", validateOrderUser(validUser));

    const invalidUser = {
      name: "",
      tel: "1234",
      email: "invalid",
      address: "",
      payment: "Bitcoin",
    };
    console.log("validateOrderUser (invalid):", validateOrderUser(invalidUser));

    console.log("validateCartQuantity (5):", validateCartQuantity(5));
    console.log("validateCartQuantity (0):", validateCartQuantity(0));

    // 任務三測試
    console.log("\n--- 任務三：ID 產生 ---");
    console.log("generateOrderId:", generateOrderId());
    console.log("generateCartItemId:", generateCartItemId());

    // 任務四測試
    if (API_PATH) {
      console.log("\n--- 任務四：Axios API 串接 ---");
      try {
        const products = await getProductsWithAxios();
        console.log(
          "getProductsWithAxios:",
          products ? `成功取得 ${products.length} 筆產品` : "回傳 undefined",
        );
      } catch (error) {
        console.log("getProductsWithAxios 錯誤:", error.message);
      }
    } else {
      console.log("\n--- 任務四：請先在 .env 設定 API_PATH ---");
    }

    console.log("\n=== 測試結束 ===");
    console.log("\n提示：執行 node test.js 進行完整驗證");
  }

  runTests();
}
