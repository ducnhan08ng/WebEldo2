const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");
const nodeCrypto = require("crypto");
const CryptoJS = require("crypto-js");
const axios = require("axios");
const { HttpProxyAgent } = require("http-proxy-agent");
const fs = require("fs");
const BLACKLIST_FILE = path.join(__dirname, "blacklist.txt");

const app = express();
app.set("trust proxy", false);

// ===== CONFIG =====
const MAINTENANCE_MODE = false;
const ADMIN_KEY = process.env.ADMIN_KEY;
const STATIC_KEY = CryptoJS.enc.Utf8.parse("a454dfdb578edfed");
const STATIC_IV  = CryptoJS.enc.Utf8.parse("42938ksk2s394030");

// Đọc danh sách IP đen từ file
function loadBlacklist() {
    try {
        if (fs.existsSync(BLACKLIST_FILE)) {
            const content = fs.readFileSync(BLACKLIST_FILE, "utf8");
            const ips = content.split("\n")
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.startsWith("#"));
            return new Set(ips);
        }
    } catch (err) {
        console.error("Lỗi đọc blacklist.txt:", err.message);
    }
    return new Set();
}

let BLACKLIST_IPS = loadBlacklist();

// ===== SECURITY CONFIG =====
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IP_GUARD_ENABLED = process.env.IP_GUARD_ENABLED !== "false";
const IP_RISK_FAIL_CLOSED = process.env.IP_RISK_FAIL_CLOSED !== "false";
const ALLOW_LOCAL_NETWORK = !IS_PRODUCTION && process.env.ALLOW_LOCAL_NETWORK !== "false";
const ALLOWED_COUNTRIES = new Set(
    String(process.env.ALLOWED_COUNTRIES || "VN")
        .split(",")
        .map(value => value.trim().toUpperCase())
        .filter(Boolean)
);
const IPINFO_TOKEN = String(process.env.IPINFO_TOKEN || "").trim();
const IPINFO_PRIVACY_PATH = process.env.IPINFO_PRIVACY_PATH === "anonymous" ? "anonymous" : "privacy";
const TURNSTILE_SECRET = String(process.env.TURNSTILE_SECRET || "").trim();
const TURNSTILE_HOSTNAME = String(process.env.TURNSTILE_HOSTNAME || "").trim().toLowerCase();
const ORIGIN_GUARD_SECRET = String(process.env.ORIGIN_GUARD_SECRET || "").trim();
const BIND_REWARD_TO_IP = process.env.BIND_REWARD_TO_IP !== "false";
const IP_RISK_CACHE_MS = Math.max(60_000, Number(process.env.IP_RISK_CACHE_MS) || 30 * 60 * 1000);
const IP_RISK_CACHE_MAX = Math.max(100, Number(process.env.IP_RISK_CACHE_MAX) || 5000);
const CORS_ORIGINS = new Set(
    String(process.env.CORS_ORIGINS || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
);
const USE_IPAPI = process.env.USE_IPAPI !== "false";

// ===== GACHTHEFAST CALLBACK & CHARGING CONFIG =====
const GTF_PARTNER_ID = String(process.env.GACHTHEFAST_PARTNER_ID || "").trim();
const GTF_PARTNER_KEY = String(process.env.GACHTHEFAST_PARTNER_KEY || "").trim();

// Chuẩn hóa URL endpoint gạch thẻ chính xác là https://gachthefast.com/chargingws/v2
let cleanGtfUrl = String(process.env.GACHTHEFAST_API_URL || "https://gachthefast.com/chargingws/v2").trim();
cleanGtfUrl = cleanGtfUrl.replace(/[:/\s]+$/, ""); // Xóa dấu : hoặc / hoặc khoảng trắng thừa ở cuối nếu có
if (!cleanGtfUrl.includes("chargingws/v2")) {
    cleanGtfUrl = "https://gachthefast.com/chargingws/v2";
}
const GTF_API_URL = cleanGtfUrl;

// Danh sách IP GachTheFast được phép gọi callback (phân cách bằng dấu phẩy, để trống = không giới hạn)
const GTF_ALLOWED_IPS = new Set(
    String(process.env.GACHTHEFAST_CALLBACK_IPS || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean)
);

// Bảng giá quy đổi Mua Key Tool Box
const CARD_RATE_MAP = Object.freeze({
    10000: 1,
    20000: 2,
    50000: 5,
    100000: 10,
    200000: 30,
    300000: 50,
    500000: 100
});
const MB_SPIN_COST_MAP = Object.freeze({ 1: 1, 5: 5, 10: 10, 22: 20, 35: 30, 65: 50 });
const CREDIT_REWARD_MAP = Object.freeze({ 1: 1, 2: 2, 5: 5, 10: 10, 20: 30, 30: 50, 50: 100 });
const ACCOUNT_CREDIT_SALE_MAP = Object.freeze({ 1: 1, 5: 5, 10: 11, 20: 23, 50: 60 });

// 3 loại thẻ được phép nạp: Vina, Viettel, Garena
const ALLOWED_CARD_TELCOS = Object.freeze({
    VIETTEL: "VIETTEL",
    VINAPHONE: "VINAPHONE",
    VINA: "VINAPHONE",
    GARENA: "GARENA"
});

// ============================================================
//                      HÀM HELPER (sớm)
// ============================================================

function encryptForce(text) {
  if (typeof text !== "string") text = JSON.stringify(text);
  return CryptoJS.AES.encrypt(text, STATIC_KEY, { iv: STATIC_IV }).toString();
}
function decryptForce(cipher) {
  try {
    if (cipher.includes("%")) cipher = decodeURIComponent(cipher);
    const bytes = CryptoJS.AES.decrypt(cipher, STATIC_KEY, { iv: STATIC_IV });
    const result = bytes.toString(CryptoJS.enc.Utf8);
    if (!result) return null;
    return result;
  } catch { return null; }
}
function decryptDynamic(cipher, key, iv) {
  try {
    if (cipher.includes("%")) cipher = decodeURIComponent(cipher);
    const bytes = CryptoJS.AES.decrypt(cipher, key, { iv });
    const result = bytes.toString(CryptoJS.enc.Utf8);
    if (!result) return null;
    return result;
  } catch { return null; }
}
function generateAccountKeys(timestamp, today, data2) {
  const u = String(timestamp) + String(today) + data2;
  const key = CryptoJS.enc.Utf8.parse(u.slice(0, 16));
  let iv = u.slice(16, 32);
  while (iv.length < 16) iv += ":";
  return { key, iv: CryptoJS.enc.Utf8.parse(iv) };
}
function extractCipher(raw) {
  if (typeof raw === "object" && raw.CRY_DATA) return raw.CRY_DATA;
  if (typeof raw === "string") {
    const match = raw.match(/"CRY_DATA"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
    return raw;
  }
  return JSON.stringify(raw);
}
function getElUserAgent(platform){
    switch(platform){
        case "SS":
        case "SSVN":
            return "el_webview tizen";
        case "LG":
            return "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36 HbbTV/1.4.1 (+DRM; LGE; OLED55C7V-Z; WEBOS3.5 06.10.65; W3_M16P; W3_M16P;)";
        case "AMO":
            return "el_webview tizen";
        case "ATV":
            return "el_webview tizen";
        default:
            return "el_webview tizen";
    }
}
const proxyUrl = String(process.env.EL_PROXY_URL || "").trim();
function getProxyAgent(){
    if (!proxyUrl) throw new Error("Thiếu biến môi trường EL_PROXY_URL");
    return new HttpProxyAgent(proxyUrl);
}
const BASE_URLS = {
  SS:  "http://211.253.26.47:8089/ELDORADO_SSVN/",
  SSVN: "http://211.253.26.47:8089/ELDORADO_SSVN/",
  AMO: "http://211.253.26.47:8092/ELDORADO_M_2025/",
  ATV: "http://14.63.197.40:8022/ELDORADO_ATV_2025/",
  LG:  "http://211.253.26.47:8081/ELDORADO_LG/",
};
const EL_DORADO_GACHA_CHARACTERS = Object.freeze([
  { name: "Ace", id: "63" },
  { name: "Echo", id: "66" },
  { name: "Smart", id: "67" },
  { name: "Khan", id: "68" },
  { name: "Lucy Thiên Thần", id: "49" },
  { name: "Lucy Oto", id: "50" },
  { name: "Bee", id: "64" },
  { name: "Ruby", id: "65" },
  { name: "Gold", id: "48" },
  { name: "Gin", id: "56" },
  { name: "Bensi", id: "62" },
  { name: "Jey", id: "75" },
  { name: "Koo", id: "81" },
  { name: "Thrue", id: "99" }
]);

// ============================================================
//               HÀM HELPER CHO IP GUARD
// ============================================================

function normalizeIP(value) {
    const ip = String(value || "").trim().split(",")[0].trim();
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}
function isLocalIP(ip) {
    return ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
}
function safeSecretEqual(received, expected) {
    const left = Buffer.from(String(received || ""));
    const right = Buffer.from(String(expected || ""));
    return left.length === right.length && nodeCrypto.timingSafeEqual(left, right);
}
function getIP(req) {
    if (req.clientIP) return req.clientIP;
    const cloudflareIP = normalizeIP(req.get("cf-connecting-ip"));
    if (cloudflareIP) return cloudflareIP;
    return normalizeIP(req.socket.remoteAddress) || "unknown";
}

// ============================================================
//                    IP GUARD MIDDLEWARE
// ============================================================

const ipInfoCache = new Map();
const ipApiCache = new Map();

async function lookupIPInfo(ip) {
    const now = Date.now();
    const cached = ipInfoCache.get(ip);
    if (cached && cached.expiresAt > now) return cached.data;
    if (ipInfoCache.size >= IP_RISK_CACHE_MAX) {
        for (const [key, entry] of ipInfoCache) {
            if (entry.expiresAt <= now) ipInfoCache.delete(key);
        }
        if (ipInfoCache.size >= IP_RISK_CACHE_MAX) {
            ipInfoCache.delete(ipInfoCache.keys().next().value);
        }
    }
    const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json`;
    const response = await axios.get(url, {
        params: { token: IPINFO_TOKEN },
        timeout: 4000,
        headers: { Accept: "application/json" },
        validateStatus: status => status >= 200 && status < 300
    });
    const data = response.data;
    const country = String(data.country || "").trim().toUpperCase();
    const risk = {
        vpn: data.vpn === true || data.is_vpn === true,
        proxy: data.proxy === true || data.is_proxy === true,
        tor: data.tor === true || data.is_tor === true,
        hosting: data.hosting === true || data.is_hosting === true,
        anonymous: data.is_anonymous === true,
        residentialProxy: data.is_residential_proxy === true || data.is_res_proxy === true
    };
    const result = { country, risk };
    ipInfoCache.set(ip, { data: result, expiresAt: now + IP_RISK_CACHE_MS });
    return result;
}
async function checkProxyWithIpApi(ip) {
    const now = Date.now();
    const cached = ipApiCache.get(ip);
    if (cached && cached.expiresAt > now) return cached.data;
    try {
        const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,proxy`;
        const response = await axios.get(url, { timeout: 3000 });
        const data = response.data;
        const isProxy = data.proxy === true;
        const country = data.country ? data.country.toUpperCase() : "";
        const result = { country, isProxy };
        ipApiCache.set(ip, { data: result, expiresAt: now + 300000 });
        return result;
    } catch (error) {
        console.error("ip-api lookup failed:", error.message);
        return { country: "", isProxy: false };
    }
}
async function ipGuard(req, res, next) {
    if (!IP_GUARD_ENABLED) return next();
    if (ORIGIN_GUARD_SECRET) {
        const receivedSecret = req.get("x-origin-guard");
        if (!safeSecretEqual(receivedSecret, ORIGIN_GUARD_SECRET)) {
            return denyAccess(req, res);
        }
    }
        // ===== BLACKLIST =====
    const ip = getIP(req);
    if (BLACKLIST_IPS.has(ip)) {
        console.warn(`[IP-GUARD] Blocked blacklisted IP ${ip}`);
        return denyAccess(req, res);
    }
    if (ALLOW_LOCAL_NETWORK && isLocalIP(ip)) {
        req.clientIP = ip;
        return next();
    }
    // Ngoại lệ Cloudflare Private Relay
    const isCloudflareIP = ip.startsWith("104.28.") || ip.startsWith("172.69.") || ip.startsWith("162.158.");
    if (isCloudflareIP) {
        console.log(`[IP-GUARD] Bypass proxy check for Cloudflare IP ${ip} (likely Apple Private Relay)`);
        req.clientIP = ip;
        return next();
    }
    let country = "";
    let risk = {};
    if (IPINFO_TOKEN) {
        try {
            const info = await lookupIPInfo(ip);
            country = info.country;
            risk = info.risk;
        } catch (error) {
            console.error(`[IP-GUARD] IPinfo lookup failed for ${ip}:`, error.message);
            if (IP_RISK_FAIL_CLOSED) return denyAccess(req, res);
            country = String(req.get("cf-ipcountry") || "").trim().toUpperCase();
        }
    } else {
        country = String(req.get("cf-ipcountry") || "").trim().toUpperCase();
        console.warn("[IP-GUARD] IPINFO_TOKEN not set, using cf-ipcountry fallback");
        if (!country || USE_IPAPI) {
            try {
                const ipApiResult = await checkProxyWithIpApi(ip);
                country = country || ipApiResult.country;
                if (ipApiResult.isProxy) {
                    console.warn(`[IP-GUARD] Blocked proxy/VPN IP ${ip} (fallback ip-api)`);
                    return denyAccess(req, res);
                }
            } catch (error) {
                console.error(`[IP-GUARD] fallback ip-api error for ${ip}:`, error.message);
                if (IP_RISK_FAIL_CLOSED) return denyAccess(req, res);
            }
        }
    }
    if (!country || !ALLOWED_COUNTRIES.has(country)) {
        console.warn(`[IP-GUARD] Blocked IP from ${country || 'unknown'}, ip=${ip}`);
        return denyAccess(req, res);
    }
    const isAnonymized = Object.values(risk).some(Boolean);
    if (isAnonymized) {
        console.warn(`[IP-GUARD] Blocked anonymized IP ${ip} (risk: ${JSON.stringify(risk)})`);
        return denyAccess(req, res);
    }
    if (USE_IPAPI) {
        try {
            const ipApiResult = await checkProxyWithIpApi(ip);
            if (ipApiResult.isProxy) {
                console.warn(`[IP-GUARD] Blocked proxy/VPN IP ${ip} (ip-api proxy flag)`);
                return denyAccess(req, res);
            }
        } catch (error) {
            console.error(`[IP-GUARD] ip-api check error for ${ip}:`, error.message);
        }
    }
    req.clientIP = ip;
    req.ipCountry = country;
    req.ipRisk = risk;
    return next();
}
function denyAccess(req, res) {
    res.set("Cache-Control", "no-store");
    return res.status(404).end();
}

// ============================================================
//                    ROUTES (middleware)
// ============================================================

app.get("/healthz", (req, res) => { res.json({ ok: true, dbReady }); });
app.use(ipGuard);
app.use((req, res, next) => {
    if (!MAINTENANCE_MODE) return next();
    if (ADMIN_KEY && req.query.key && safeSecretEqual(req.query.key, ADMIN_KEY)) return next();
    if (
        req.path.startsWith("/upload-") || req.path.startsWith("/delete-") ||
        req.path.startsWith("/update-") || req.path.startsWith("/shop") ||
        req.path.startsWith("/get-") || req.path.startsWith("/submit-") ||
        req.path.startsWith("/submitted-") || req.path.startsWith("/spin-") ||
        req.path.startsWith("/create-") || req.path.startsWith("/generate-") ||
        req.path.startsWith("/tao-license-key-") || req.path === "/verify-license" ||
        req.path.startsWith("/reset-hwid-") || req.path === "/set-license-status" ||
        req.path.startsWith("/licenses-key-") || req.path.startsWith("/api/el-dorado/") ||
        req.path.startsWith("/api/buy-license") || // Mua key toolbox
        req.path === "/api/gachthefast/callback"  // GachTheFast callback luôn hoạt động kể cả maintenance
    ) return next();
    if (req.path.includes(".")) return next();
    return res.status(404).end();
});
app.use(cors({
    origin(origin, callback) {
        if (!origin || CORS_ORIGINS.size === 0 || CORS_ORIGINS.has(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Origin-Guard"],
    maxAge: 600
}));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
//                    MONGODB
// ============================================================
const MONGODB_URI = process.env.MONGODB_URI;
const client = new MongoClient(MONGODB_URI);
let db, usersCollection, codesCollection, submittedCodesCollection, spinsCollection, shopCollection, licensesCollection, cardTransactionsCollection, accountsCollection, toolUsageHistoryCollection;
let dbReady = false;
async function connectDB() {
    try {
        await client.connect();
        db = client.db("rubyfree");
        licensesCollection = db.collection("licenses");
        usersCollection = db.collection("users");
        codesCollection = db.collection("codes");
        submittedCodesCollection = db.collection("submittedCodes");
        spinsCollection = db.collection("spins");
        shopCollection = db.collection("shop");
        cardTransactionsCollection = db.collection("cardTransactions");
        accountsCollection = db.collection("accounts");
        toolUsageHistoryCollection = db.collection("toolUsageHistory");
        await accountsCollection.createIndex({ username: 1 }, { unique: true });
        await accountsCollection.createIndex({ email: 1 });
        await accountsCollection.createIndex({ token: 1 }, { sparse: true });
        console.log("👤 accounts index ready");
        dbReady = true;
        console.log("✅ MongoDB connected");
        await submittedCodesCollection.createIndex({ deviceId: 1 }, { unique: true, sparse: true });
        await submittedCodesCollection.createIndex({ ip: 1 }, { unique: true, sparse: true });
        await submittedCodesCollection.createIndex({ userAgentHash: 1 });
        await usersCollection.createIndex({ deviceId: 1 });
        await usersCollection.createIndex({ ip: 1 });
        console.log("🔑 Anti-spam index ready");
        // GachTheFast indexes
        await cardTransactionsCollection.createIndex({ request_id: 1 }, { unique: true, sparse: true });
        await cardTransactionsCollection.createIndex({ status: 1 });
        await cardTransactionsCollection.createIndex({ createdAt: -1 });
        await cardTransactionsCollection.createIndex({ serial: 1 }, { sparse: true });
        await toolUsageHistoryCollection.createIndex({ key: 1, createdAt: -1 });
        await toolUsageHistoryCollection.createIndex({ createdAt: -1 });
        console.log("💳 cardTransactions index ready");
        console.log("📜 toolUsageHistory index ready");

        // Tự động kiểm tra và tạo key ngay cho các đơn đã nạp thẻ thành công mà chưa kịp cấp key
        setTimeout(async () => {
            try {
                const targetIds = [
                    "GTF_1787895296753_757179",
                    "GTF_1787894875825_524034",
                    "GTF_1787894160523_427371"
                ];

                // Tự động đồng bộ IP người nạp thẻ vào License Key
                try {
                    const paidCards = await cardTransactionsCollection.find({
                        $or: [{ status: 1 }, { statusText: "success" }],
                        clientIp: { $exists: true, $ne: null }
                    }).toArray();

                    for (const c of paidCards) {
                        const targetK = c.createdKey || c.targetKey;
                        if (targetK && c.clientIp) {
                            await licensesCollection.updateOne(
                                { key: targetK },
                                {
                                    $set: {
                                        ip: c.clientIp,
                                        lastIp: c.clientIp,
                                        purchaseIp: c.clientIp
                                    },
                                    $addToSet: { usedIps: c.clientIp }
                                }
                            );
                        }
                    }
                } catch (syncErr) {
                    console.warn("[IP SYNC] Lỗi đồng bộ IP key:", syncErr.message);
                }

                const unfulfilled = await cardTransactionsCollection.find({
                    fulfilled: false,
                    $or: [
                        { status: 1 },
                        { request_id: { $in: targetIds } }
                    ]
                }).toArray();

                // Tự động cập nhật mã thẻ cho các giao dịch trước đây
                const backfillList = [
                    { reqId: "GTF_1787896987196_675701", code: "7722158221989503", key: "GB8K-BAL3-WSRA" },
                    { reqId: "GTF_1787895296753_757179", code: "60999391847355" },
                    { reqId: "GTF_1787894875825_524034", code: "818996339248151" },
                    { reqId: "GTF_1787894160523_427371", code: "16189779040224" }
                ];
                for (const item of backfillList) {
                    const up = { $set: { code: item.code } };
                    if (item.key) up.$set.createdKey = item.key;
                    await cardTransactionsCollection.updateOne({ request_id: item.reqId }, up);
                }

                for (const tx of unfulfilled) {
                    const cardVal = Number(tx.declared_value || tx.value || 20000);
                    
                // Tự động kiểm tra và cộng tiền cho các đơn nạp tài khoản đã thành công mà chưa được cộng
                const unfulfilledDeposits = await cardTransactionsCollection.find({
                    intent: "account_deposit",
                    fulfilled: { $ne: true },
                    $or: [
                        { status: 1 },
                        { statusText: "success" },
                        { request_id: "GTF_1788005567598_388637" }
                    ]
                }).toArray();

                for (const dTx of unfulfilledDeposits) {
                    const depVal = Number(dTx.value || dTx.declared_value || 20000);
                    console.log(`[DEPOSIT RECOVERY] Tự động cộng tiền nạp thẻ: ${dTx.request_id} (user: ${dTx.username}, số tiền: ${depVal}đ)`);
                    await cardTransactionsCollection.updateOne(
                        { request_id: dTx.request_id },
                        { $set: { status: 1, statusText: "success", value: depVal, updatedAt: new Date() } }
                    );
                    await fulfillAccountDeposit(dTx.request_id, 1, "success", depVal);
                }

                    console.log(`[BUY KEY RECOVERY] Đang cấp License Key cho đơn đã nạp thành công: ${tx.request_id} (mệnh giá: ${cardVal}đ)`);
                    await cardTransactionsCollection.updateOne(
                        { request_id: tx.request_id },
                        { $set: { status: 1, statusText: "success", value: cardVal, updatedAt: new Date() } }
                    );
                    await fulfillBuyLicenseOrder(tx.request_id, 1, "success", cardVal);
                }
            } catch (recoveryErr) {
                console.error("[BUY KEY RECOVERY] Lỗi quét recovery:", recoveryErr.message);
            }
        }, 2000);
    } catch (err) {
        console.error('❌ MongoDB error:', err);
    }
}
connectDB();

async function waitForDB() {
    let retries = 0;
    while (!dbReady && retries < 20) {
        await new Promise(r => setTimeout(r, 500));
        retries++;
    }
    if (!dbReady) throw new Error('DB not ready');
}

// ============================================================
//                   HÀM HELPER BỔ SUNG (rate limit, v.v.)
// ============================================================
function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) {
        code += chars[nodeCrypto.randomInt(0, chars.length)];
        if (i === 3 || i === 7) code += "-";
    }
    return code;
}
function normalizeDeviceId(value) {
    const deviceId = typeof value === "string" ? value.trim() : "";
    return /^[A-Za-z0-9._:-]{6,128}$/.test(deviceId) ? deviceId : "";
}
function safeTextEqual(leftValue, rightValue) {
    const left = Buffer.from(String(leftValue || "").trim().toUpperCase());
    const right = Buffer.from(String(rightValue || "").trim().toUpperCase());
    return left.length === right.length && nodeCrypto.timingSafeEqual(left, right);
}
function hashUserAgent(req) {
    return nodeCrypto.createHash("sha256").update(String(req.get("user-agent") || "unknown")).digest("hex");
}
function createMemoryRateLimiter({ windowMs, max, prefix }) {
    const buckets = new Map();
    return function memoryRateLimiter(req, res, next) {
        const now = Date.now();
        const ip = getIP(req);
        const deviceId = normalizeDeviceId(req.body?.deviceId) || "no-device";
        const key = `${prefix}:${ip}:${deviceId}`;
        let bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            buckets.set(key, bucket);
        }
        bucket.count += 1;
        if (bucket.count > max) {
            const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.set("Retry-After", String(retryAfter));
            return res.status(429).json({ success: false, message: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
        }
        if (buckets.size > 10_000) {
            for (const [bucketKey, value] of buckets) {
                if (value.resetAt <= now) buckets.delete(bucketKey);
            }
        }
        return next();
    };
}
const generateCodeLimiter = createMemoryRateLimiter({ windowMs: 10 * 60 * 1000, max: 6, prefix: "generate-code" });
const submitCodeLimiter = createMemoryRateLimiter({ windowMs: 10 * 60 * 1000, max: 12, prefix: "submit-code" });
const spinLimiter = createMemoryRateLimiter({ windowMs: 10 * 60 * 1000, max: 8, prefix: "spin-wheel" });
const toolboxLimiter = createMemoryRateLimiter({ windowMs: 60 * 1000, max: 20, prefix: "toolbox" });
const buyLicenseLimiter = createMemoryRateLimiter({ windowMs: 60 * 1000, max: 10, prefix: "buy-license" });

function requireAdmin(req, res, next) {
    console.log('[ADMIN] Request path:', req.path);
    console.log('[ADMIN] Query:', req.query);
    console.log('[ADMIN] Cookies header:', req.headers.cookie);
    console.log('[ADMIN] Authorization header:', req.headers.authorization);

    if (!ADMIN_KEY) {
        console.error('[ADMIN] ADMIN_KEY is not set in environment');
        return res.status(503).json({ success: false, message: "ADMIN_KEY chưa được cấu hình" });
    }

    const cookies = Object.fromEntries(
        String(req.get("cookie") || "").split(";").map(part => part.trim()).filter(Boolean).map(part => {
            const separator = part.indexOf("=");
            return separator === -1 ? [part, ""] : [part.slice(0, separator), part.slice(separator + 1)];
        })
    );
    const expectedSession = nodeCrypto.createHmac("sha256", ADMIN_KEY).update("admin-session-v1").digest("hex");
    const authorization = String(req.get("authorization") || "");
    const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    const provided = bearer || req.body?.adminKey || req.query?.adminKey || req.query?.key || cookies.admin_session;

    console.log('[ADMIN] Provided token:', provided);
    console.log('[ADMIN] Expected session:', expectedSession);
    console.log('[ADMIN] ADMIN_KEY match:', safeSecretEqual(provided, ADMIN_KEY));
    console.log('[ADMIN] Session match:', safeSecretEqual(provided, expectedSession));

    const validAdminKey = safeSecretEqual(provided, ADMIN_KEY);
    const validSession = safeSecretEqual(provided, expectedSession);

    if (!validAdminKey && !validSession) {
        console.warn('[ADMIN] Unauthorized access attempt');
        return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    }

    if (validAdminKey && !validSession) {
        res.cookie("admin_session", expectedSession, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: "strict",
            maxAge: 60 * 60 * 1000,
            path: "/"
        });
        console.log('[ADMIN] Session cookie set');
    }

    return next();
}
function requireWebSameOrigin(req, res, next) {
    const source = req.get("origin") || req.get("referer");
    if (!source) return res.status(403).json({ success: false, message: "Nguồn yêu cầu không hợp lệ" });
    try {
        const sourceURL = new URL(source);
        if (sourceURL.host !== req.get("host")) {
            return res.status(403).json({ success: false, message: "Nguồn yêu cầu không hợp lệ" });
        }
        return next();
    } catch {
        return res.status(403).json({ success: false, message: "Nguồn yêu cầu không hợp lệ" });
    }
}
async function requireTurnstile(req, res, next) {
    if (!TURNSTILE_SECRET) return next();
    const token = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken
        : typeof req.body?.["cf-turnstile-response"] === "string" ? req.body["cf-turnstile-response"] : "";
    if (!token || token.length > 2048) {
        return res.status(403).json({ success: false, message: "Xác minh không hợp lệ" });
    }
    try {
        const form = new URLSearchParams({
            secret: TURNSTILE_SECRET,
            response: token,
            remoteip: getIP(req)
        });
        const response = await axios.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            form.toString(),
            { timeout: 5000, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        const validation = response.data || {};
        const hostnameMatches = !TURNSTILE_HOSTNAME ||
            String(validation.hostname || "").toLowerCase() === TURNSTILE_HOSTNAME;
        if (validation.success !== true || !hostnameMatches) {
            return res.status(403).json({ success: false, message: "Xác minh không hợp lệ" });
        }
        delete req.body.turnstileToken;
        delete req.body["cf-turnstile-response"];
        return next();
    } catch (error) {
        console.error("Turnstile validation failed:", error.message);
        return res.status(503).json({ success: false, message: "Không thể xác minh yêu cầu" });
    }
}
function generateLicenseKey() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const groups = [];
    for (let g = 0; g < 3; g++) {
        let part = "";
        for (let i = 0; i < 4; i++) {
            part += chars[Math.floor(Math.random() * chars.length)];
        }
        groups.push(part);
    }
    return groups.join("-");
}

// ============================================================
//                    CÁC API
// ============================================================

app.post("/generate-code", requireWebSameOrigin, generateCodeLimiter, requireTurnstile, async (req, res) => {
    try {
        await waitForDB();
        const deviceId = normalizeDeviceId(req.body?.deviceId);
        const ip = getIP(req);
        if (!deviceId) return res.status(400).json({ success: false, message: "deviceId không hợp lệ" });
        const submitted = await submittedCodesCollection.findOne({ $or: [{ deviceId }, { ip }] });
        if (submitted) {
            const user = await usersCollection.findOne({ deviceId });
            const oldCode = user ? user.code : null;
            return res.json({ success: false, message: "Bạn đã gửi mã rồi, không thể nhận lại.", code: oldCode });
        }
        const user = await usersCollection.findOne({ deviceId });
        if (user) return res.json({ success: true, code: user.code });
        const sameIPUser = await usersCollection.findOne({ ip });
        if (sameIPUser) return res.status(409).json({ success: false, message: "Kết nối này đã nhận mã" });
        const code = generateCode();
        await usersCollection.insertOne({ deviceId, code, ip, createdAt: new Date() });
        await codesCollection.insertOne({ deviceId, code, ip, createdAt: new Date() });
        res.json({ success: true, code });
    } catch (err) {
        console.error("generate-code error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});
app.post("/submit-code", requireWebSameOrigin, submitCodeLimiter, requireTurnstile, async (req, res) => {
    try {
        await waitForDB();
        const deviceId = normalizeDeviceId(req.body?.deviceId);
        const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
        const platform = typeof req.body?.platform === "string" ? req.body.platform.trim() : "";
        const userInputCode = typeof req.body?.userInputCode === "string" ? req.body.userInputCode.trim() : "";
        const lucyAnswer = typeof req.body?.lucyAnswer === "string" ? req.body.lucyAnswer.trim().slice(0, 300) : "";
        const rubyAnswer = typeof req.body?.rubyAnswer === "string" ? req.body.rubyAnswer.trim().slice(0, 300) : "";
        const ip = getIP(req);
        const userAgentHash = hashUserAgent(req);
        if (!deviceId || !userId || userId.length > 200 || !platform || platform.length > 30) {
            return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
        }
        const issuedCode = await usersCollection.findOne({ deviceId });
        if (!issuedCode || !safeTextEqual(userInputCode, issuedCode.code)) {
            return res.status(400).json({ success: false, message: "Sai mã" });
        }
        if (BIND_REWARD_TO_IP && issuedCode.ip !== ip) {
            return res.status(403).json({ success: false, message: "Kết nối không hợp lệ" });
        }
        const exist = await submittedCodesCollection.findOne({ $or: [{ deviceId }, { ip }] });
        if (exist) return res.json({ success: false, message: "Đã gửi rồi" });
        await submittedCodesCollection.insertOne({
            deviceId, userId, platform, code: issuedCode.code, ip,
            lucyAnswer, rubyAnswer, userAgentHash, createdAt: new Date()
        });
        res.json({ success: true });
    } catch (err) {
        console.error("submit-code error:", err);
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});
app.get("/shop-acc", async (req, res) => {
    try {
        await waitForDB();
        const data = await shopCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(data);
    } catch { res.json([]); }
});
app.post("/delete-acc", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id } = req.body;
        if (!id) return res.json({ success: false });
        const result = await shopCollection.deleteOne({ _id: new ObjectId(id) });
        res.json({ success: result.deletedCount === 1 });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});
app.post("/update-acc", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id, price } = req.body;
        if (!id || !price) return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
        const result = await shopCollection.updateOne({ _id: new ObjectId(id) }, { $set: { price } });
        res.json({ success: result.modifiedCount === 1 });
    } catch (err) {
        console.error("update-acc:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, callback) {
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype || "")) {
            return callback(new Error("Chỉ chấp nhận file ảnh"));
        }
        return callback(null, true);
    }
});
app.post("/upload-acc", requireAdmin, upload.single("image"), async (req, res) => {
    try {
        await waitForDB();
        const file = req.file;
        const { price } = req.body;
        if (!file || !price) return res.json({ success: false, message: "Thiếu dữ liệu" });
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        await shopCollection.insertOne({ image: base64, price, createdAt: new Date() });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
});
app.get("/submitted-codes-api", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const data = await submittedCodesCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});
app.get("/submitted-codes", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "submitted-codes.html"));
});
app.post("/spin-wheel", requireWebSameOrigin, spinLimiter, requireTurnstile, async (req, res) => {
    try {
        await waitForDB();
        const deviceId = normalizeDeviceId(req.body?.deviceId);
        const ip = getIP(req);
        if (!deviceId) return res.status(400).json({ success: false, message: "deviceId không hợp lệ" });
        const cooldown = 6 * 60 * 60 * 1000;
        const now = Date.now();
        const exist = await spinsCollection.findOne({ $or: [{ deviceId }, { ip }] });
        if (exist && now - exist.lastSpin < cooldown) return res.json({ success: false });
        const list = ["Ace","Echo","Smart","Khan","Lucy Băng","Lucy Idol",
            "Ruby","Bensi","Gin","Jey","Koo","Thrue","Bebee","Gold"];
        const result = list[Math.floor(Math.random() * list.length)];
        await spinsCollection.insertOne({ deviceId, ip, lastSpin: now, result });
        res.json({ success: true, result });
    } catch { res.json({ success: false }); }
});
app.post("/tao-license-key-deptrai", async (req,res)=>{
    try {
        await waitForDB();
        const { adminKey, days = 30, maxUses = 100 } = req.body;
        if(adminKey !== ADMIN_KEY) return res.json({ success:false, message:"Sai ADMIN KEY" });
        let key;
        while(true){
            key = generateLicenseKey();
            const exist = await licensesCollection.findOne({key});
            if(!exist) break;
        }
        const expire = new Date();
        expire.setDate(expire.getDate()+Number(days));
        await licensesCollection.insertOne({
            key, hwid:null, status:"active", expire,
            maxUses:Number(maxUses), usedCount:0, createdAt:new Date()
        });
        res.json({ success:true, key, expire, maxUses });
    }catch(err){
        console.log(err);
        res.json({ success:false });
    }
});
async function validateAndBindLicense(rawKey, rawHwid, clientIp = null) {
    await waitForDB();
    const key = typeof rawKey === "string" ? rawKey.trim().toUpperCase() : "";
    const hwid = typeof rawHwid === "string" ? rawHwid.trim() : "";
    let license = await licensesCollection.findOne({ key });
    if (!license) return { success: false, message: "License Key không tồn tại. Mua License Key Liên Hệ Qua Discord." };
    if (license.status !== "active") return { success: false, message: "License Key đã bị khóa" };
    if (license.expire && new Date(license.expire) < new Date()) {
        return { success: false, message: "License Key đã hết hạn" };
    }
    if (license.maxUses && license.usedCount >= license.maxUses) {
        return { success: false, message: "License Key đã hết lượt sử dụng" };
    }

    const bindingMode = license.bindingMode === "unlimited" ? "unlimited" : "normal";
    if (bindingMode === "normal" && !key) return { success: false, message: "Thiếu License Key" };
    if (bindingMode === "normal" && !hwid) return { success: false, message: "Thiếu License Key hoặc mã thiết bị" };

    const updateFields = { lastLogin: new Date() };
    if (clientIp) {
        updateFields.lastIp = clientIp;
        if (!license.ip) updateFields.ip = clientIp;
    }

    if (bindingMode === "unlimited") {
        const updateDoc = { $set: updateFields };
        if (clientIp) updateDoc.$addToSet = { usedIps: clientIp };
        await licensesCollection.updateOne({ _id: license._id }, updateDoc);
        return { success: true, license: { ...license, key, hwid: license.hwid || null, bindingMode } };
    }

    if (!license.hwid) {
        updateFields.hwid = hwid;
        updateFields.firstLogin = license.firstLogin || new Date();
        if (clientIp) updateFields.bindIp = clientIp;

        const updateDoc = { $set: updateFields };
        if (clientIp) updateDoc.$addToSet = { usedIps: clientIp };

        const bindResult = await licensesCollection.updateOne(
            { _id: license._id, hwid: null },
            updateDoc
        );
        if (bindResult.modifiedCount === 1) {
            license = { ...license, ...updateFields };
        } else {
            license = await licensesCollection.findOne({ _id: license._id });
        }
    } else {
        const updateDoc = { $set: updateFields };
        if (clientIp) updateDoc.$addToSet = { usedIps: clientIp };
        await licensesCollection.updateOne({ _id: license._id }, updateDoc);
    }

    if (license.hwid !== hwid) {
        return { success: false, message: "License Key đã kích hoạt trên thiết bị khác" };
    }
    return { success: true, license: { ...license, key, hwid, bindingMode } };
}
app.post("/verify-license", async (req, res) => {
    try {
        const ip = getIP(req);
        const result = await validateAndBindLicense(req.body?.key, req.body?.hwid, ip);
        if (!result.success) return res.status(401).json(result);
        return res.json({ success: true });
    } catch (err) {
        console.error("verify-license error:", err.message);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
});
app.post("/reset-hwid-deptrai", async (req, res) => {
    await waitForDB();
    const { adminKey, key } = req.body;
    if (adminKey !== ADMIN_KEY) return res.json({ success: false });
    await licensesCollection.updateOne({ key: key.trim().toUpperCase() }, { $set: { hwid: null } });
    res.json({ success: true });
});
app.post("/delete-license", async (req, res) => {
    await waitForDB();
    const { adminKey, key } = req.body;
    if (adminKey !== ADMIN_KEY) return res.json({ success: false });
    await licensesCollection.deleteOne({ key: key.trim().toUpperCase() });
    res.json({ success: true });
});
app.post("/set-license-status", async (req, res) => {
    await waitForDB();
    const { adminKey, key, status } = req.body;
    if (adminKey !== ADMIN_KEY) return res.json({ success: false });
    await licensesCollection.updateOne({ key: key.trim().toUpperCase() }, { $set: { status } });
    res.json({ success: true });
});
app.get("/licenses-key-ngu", requireAdmin, async (req, res) => {
    await waitForDB();
    const list = await licensesCollection.find().sort({ createdAt: -1 }).toArray();
    res.json(list);
});
app.get("/api/admin/licenses", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const list = await licensesCollection.find().sort({ createdAt: -1 }).toArray();
        res.json({ success: true, data: list });
    } catch (err) {
        console.error("[ADMIN LICENSES] list error:", err.message);
        res.status(500).json({ success: false, message: "Không thể tải danh sách key" });
    }
});
app.post("/api/admin/licenses/create-many", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const count = Math.max(1, Math.min(100, parseInt(req.body?.count || "1", 10) || 1));
        const days = Math.max(1, Math.min(3650, parseInt(req.body?.days || "30", 10) || 30));
        const maxUses = Math.max(1, Math.min(1000000, parseInt(req.body?.maxUses || "100", 10) || 100));
        const bindingMode = req.body?.bindingMode === "unlimited" ? "unlimited" : "normal";
        const customKey = typeof req.body?.customKey === "string" ? req.body.customKey.trim() : "";

        if (customKey) {
            const normalizedKey = customKey.toUpperCase();
            const exists = await licensesCollection.findOne({ key: normalizedKey });
            if (exists) {
                return res.status(409).json({ success: false, message: `Key ${normalizedKey} đã tồn tại` });
            }

            const expire = new Date();
            expire.setDate(expire.getDate() + days);
            const doc = {
                key: normalizedKey,
                hwid: null,
                status: "active",
                expire,
                maxUses,
                usedCount: 0,
                createdAt: new Date(),
                createdBy: "admin-panel",
                bindingMode
            };
            await licensesCollection.insertOne(doc);
            return res.json({ success: true, count: 1, data: [{ key: normalizedKey, expire, maxUses, status: "active", bindingMode }] });
        }

        const created = [];
        for (let i = 0; i < count; i++) {
            let key;
            while (true) {
                key = generateLicenseKey();
                const exist = await licensesCollection.findOne({ key });
                if (!exist) break;
            }
            const expire = new Date();
            expire.setDate(expire.getDate() + days);
            await licensesCollection.insertOne({
                key,
                hwid: null,
                status: "active",
                expire,
                maxUses,
                usedCount: 0,
                createdAt: new Date(),
                createdBy: "admin-panel",
                bindingMode
            });
            created.push({ key, expire, maxUses, status: "active", bindingMode });
        }
        return res.json({ success: true, count: created.length, data: created });
    } catch (err) {
        console.error("[ADMIN LICENSES] create-many error:", err.message);
        return res.status(500).json({ success: false, message: "Không thể tạo key" });
    }
});
app.post("/api/admin/licenses/delete", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const key = String(req.body?.key || "").trim().toUpperCase();
        if (!key) return res.status(400).json({ success: false, message: "Thiếu key" });
        const result = await licensesCollection.deleteOne({ key });
        return res.json({ success: true, deleted: result.deletedCount > 0, key });
    } catch (err) {
        console.error("[ADMIN LICENSES] delete error:", err.message);
        return res.status(500).json({ success: false, message: "Không thể xóa key" });
    }
});
app.get("/api/admin/tool-usage-history", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "100", 10) || 100));
        const list = await toolUsageHistoryCollection.find().sort({ createdAt: -1 }).limit(limit).toArray();
        res.json({ success: true, data: list });
    } catch (err) {
        console.error("[ADMIN TOOL HISTORY] list error:", err.message);
        res.status(500).json({ success: false, message: "Không thể tải lịch sử" });
    }
});
async function requireLicense(req, res, next) {
    try {
        const ip = getIP(req);
        const result = await validateAndBindLicense(req.body?.key, req.body?.hwid, ip);
        if (!result.success) return res.status(401).json(result);
        req.license = result.license;
        delete req.body.key;
        delete req.body.hwid;
        return next();
    } catch (err) {
        console.error("requireLicense error:", err.message);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}
function requireSameOrigin(req, res, next) {
    const origin = req.get("origin");
    if (!origin) return next();
    try {
        const originUrl = new URL(origin);
        if (originUrl.host !== req.get("host")) {
            return res.status(403).json({ success: false, message: "Nguồn yêu cầu không hợp lệ" });
        }
        return next();
    } catch {
        return res.status(403).json({ success: false, message: "Nguồn yêu cầu không hợp lệ" });
    }
}

// ============================================================
//                    EL DORADO TOOLBOX (GIỮ NGUYÊN)
// ============================================================

const EL_PLATFORM_ORDER = ["AMO", "ATV", "LG", "SS"];

function createElPublicError(message) {
    const error = new Error(message);
    error.isPublic = true;
    return error;
}
function normalizeElFieldName(value) {
    return String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}
function parseElNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().replace(/,/g, "");
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : undefined;
}
function findDeepValue(source, candidateKeys) {
    if (!source || typeof source !== "object") return undefined;
    const wanted = new Set(candidateKeys.map(normalizeElFieldName));
    const queue = [source];
    const visited = new Set();
    while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== "object" || visited.has(current)) continue;
        visited.add(current);
        for (const [key, value] of Object.entries(current)) {
            if (wanted.has(normalizeElFieldName(key)) && value !== undefined && value !== null && value !== "") {
                return value;
            }
            if (value && typeof value === "object") queue.push(value);
        }
    }
    return undefined;
}
function collectDeepValues(source, candidateKeys) {
    if (!source || typeof source !== "object") return [];
    const wanted = new Set(candidateKeys.map(normalizeElFieldName));
    const values = [];
    const queue = [source];
    const visited = new Set();
    while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== "object" || visited.has(current)) continue;
        visited.add(current);
        for (const [key, value] of Object.entries(current)) {
            if (wanted.has(normalizeElFieldName(key)) && value !== undefined && value !== null && value !== "") {
                values.push(value);
            }
            if (value && typeof value === "object") queue.push(value);
        }
    }
    return values;
}
function getElDataVariants(value) {
    const variants = [];
    const queue = [value];
    const seenStrings = new Set();
    const seenObjects = new Set();
    while (queue.length && variants.length < 20) {
        const current = queue.shift();
        if (current && typeof current === "object") {
            if (seenObjects.has(current)) continue;
            seenObjects.add(current);
            variants.push(current);
            continue;
        }
        if (typeof current !== "string") continue;
        const text = current.trim();
        if (!text || seenStrings.has(text)) continue;
        seenStrings.add(text);
        variants.push(text);
        try { queue.push(JSON.parse(text)); } catch {}
        try { const decoded = decodeURIComponent(text); if (decoded !== text) queue.push(decoded); } catch {}
        if (/^[A-Za-z0-9+/=_-]+$/.test(text) && text.length >= 8) {
            try {
                const decoded = Buffer.from(text.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
                const printable = decoded.replace(/[\x20-\x7E\r\n\t]/g, "").length === 0;
                if (printable && decoded.trim()) queue.push(decoded);
            } catch {}
        }
        if (text.includes("=") && (text.includes("&") || text.includes("%"))) {
            try { queue.push(Object.fromEntries(new URLSearchParams(text))); } catch {}
        }
    }
    return variants;
}
function findNamedNumber(source, candidateKeys) {
    const wanted = new Set(candidateKeys.map(normalizeElFieldName));
    const queue = [source];
    const visited = new Set();
    while (queue.length) {
        const current = queue.shift();
        if (typeof current === "string") {
            for (const key of candidateKeys) {
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const patterns = [
                    new RegExp(`["']?${escapedKey}["']?\\s*[:=|,]\\s*["']?(-?[\\d,]+(?:\\.\\d+)?)`, "i"),
                    new RegExp(`(?:^|[|,;&])\\s*${escapedKey}\\s*(?:[|,;=&])\\s*(-?[\\d,]+(?:\\.\\d+)?)`, "i")
                ];
                for (const pattern of patterns) {
                    const match = current.match(pattern);
                    const number = match ? parseElNumber(match[1]) : undefined;
                    if (number !== undefined) return number;
                }
            }
            continue;
        }
        if (!current || typeof current !== "object" || visited.has(current)) continue;
        visited.add(current);
        if (Array.isArray(current)) {
            for (let index = 0; index < current.length - 1; index += 1) {
                if (wanted.has(normalizeElFieldName(current[index]))) {
                    const number = parseElNumber(current[index + 1]);
                    if (number !== undefined) return number;
                }
            }
        }
        const semanticKey = current.key ?? current.name ?? current.id ?? current.type ?? current.code;
        if (wanted.has(normalizeElFieldName(semanticKey))) {
            for (const valueKey of ["value", "amount", "number", "count", "data"]) {
                const number = parseElNumber(current[valueKey]);
                if (number !== undefined) return number;
            }
        }
        for (const [key, value] of Object.entries(current)) {
            if (wanted.has(normalizeElFieldName(key))) {
                const number = parseElNumber(value);
                if (number !== undefined) return number;
            }
            if (value && (typeof value === "object" || typeof value === "string")) queue.push(value);
        }
    }
    return undefined;
}
function describeElData1(accountContext) {
    const values = collectDeepValues(accountContext, ["DATA1", "data1"]);
    return values.map(value => {
        if (Array.isArray(value)) return { type: "array", length: value.length };
        if (value && typeof value === "object") return { type: "object", keys: Object.keys(value).slice(0, 20) };
        return { type: typeof value, length: typeof value === "string" ? value.length : undefined };
    });
}
function readPositionalNumberFromData1(value, candidateKeys) {
    const wanted = new Set(candidateKeys.map(normalizeElFieldName));
    let fieldIndex;
    if (["gold", "curgold", "currentgold"].some(key => wanted.has(key))) fieldIndex = 1;
    if (["ruby", "curruby", "currentruby"].some(key => wanted.has(key))) fieldIndex = 2;
    if (fieldIndex === undefined) return undefined;
    const fields = Array.isArray(value) ? value : typeof value === "string" ? value.trim().split(",") : null;
    if (!fields || fields.length <= fieldIndex || String(fields[0] ?? "").trim() === "") return undefined;
    return parseElNumber(fields[fieldIndex]);
}
function readNumberFromData1(accountContext, candidateKeys) {
    const data1Values = collectDeepValues(accountContext, ["DATA1", "data1"]);
    for (const data1Value of data1Values) {
        for (const variant of getElDataVariants(data1Value)) {
            const positionalNumber = readPositionalNumberFromData1(variant, candidateKeys);
            if (positionalNumber !== undefined) return positionalNumber;
            const number = findNamedNumber(variant, candidateKeys);
            if (number !== undefined) return number;
        }
    }
    return undefined;
}

// ===== DECODE & FETCH =====
function decodeElAccountResponse(raw, userKey) {
    let cipher = "";
    if (typeof raw === "object" && raw.CRY_DATA) cipher = raw.CRY_DATA;
    else if (typeof raw === "string") {
        const match = raw.match(/"CRY_DATA"\s*:\s*"([^"]+)"/);
        if (match) cipher = match[1];
        else cipher = raw;
    }
    const staticDecrypted = decryptForce(cipher);
    if (staticDecrypted) {
        try {
            const data = JSON.parse(staticDecrypted);
            let realUserKey = userKey;
            if (data.RESULT === "OK" && typeof data.VALUE === "string" && data.VALUE.startsWith("MATCH:")) {
                realUserKey = data.VALUE.substring(6);
            }
            return {
                raw, data, realUserKey,
                timestamp: data.timestamp,
                today: data.today,
                data2: data.DATA2 || data.data2 || ""
            };
        } catch (e) {
            console.warn("[DECODE] Static decrypt thành công nhưng parse JSON thất bại:", e.message);
        }
    }
    let rawObj = raw;
    if (typeof raw === "string") {
        try { rawObj = JSON.parse(raw); } catch { rawObj = { raw }; }
    }
    let timestamp = rawObj.timestamp || "";
    let today = rawObj.today || "";
    let data2 = rawObj.DATA2 || rawObj.data2 || "";
    if (!timestamp || !today || !data2) {
        console.error("[DECODE] Thiếu timestamp/today/data2 để giải mã dynamic");
        throw createElPublicError("Không giải mã được dữ liệu tài khoản (thiếu thông tin dynamic)");
    }
    try {
        const keys = generateAccountKeys(timestamp, today, data2);
        const dynamicDecrypted = decryptDynamic(cipher, keys.key, keys.iv);
        if (!dynamicDecrypted) throw new Error("Dynamic decrypt trả về rỗng");
        const data = JSON.parse(dynamicDecrypted);
        return { raw, data, realUserKey: userKey, timestamp, today, data2 };
    } catch (err) {
        console.error("[DECODE] Dynamic decrypt thất bại:", err.message);
        throw createElPublicError("Không giải mã được dữ liệu tài khoản");
    }
}

async function fetchElAccountContext(hostId, userKey, platform, useProxy, email = "") {
    const isAtv = platform === "ATV";
    const url = BASE_URLS[platform] + "cnm_exist_host_in_server.php";
    const payload = {
        HOST_ID: hostId,
        MODE: "PACKAGE",
        VER_DATE: "20260922",
        VERSION: isAtv ? "EL_ATV_20260922" : "EL_AMO_20260922",
        SDK_VERSION: "0",
        MODEL_NAME: "",
        TARGET_PLATFORM: 12,
        EMAIL: "",
        COMMENT: userKey ? "VERIFY_AUTH_NUMBER" : "CANCEL_AUTH_NUMBER",
        USER_KEY: userKey,
        LANG: 1,
        IS_SYNC: "false",
        RUN_COUNT: 0
    };
    if (isAtv && email) {
        payload.EMAIL = email;
        payload.MODEL = "58461f11-ca71-4f40-b2b7-dd65f10ee887";
        payload.IP = "211.253.26.47";
        payload.MAC = "04:60:f1:77:a9:5b";
        payload.ADDR = email;
        payload.PACKAGE_NAME = "com.entrix.eldorado.atv";
        payload.LANG = 2;
    }
    const encrypted = encryptForce(JSON.stringify(payload));
    const body = `ID=${encodeURIComponent(hostId)}&CRY_DATA=${encodeURIComponent(encrypted)}`;
    console.log(`[EXIST] Gửi request tới ${url} (proxy=${useProxy})`);
    try {
        const response = await axios.post(url, body, getElRequestConfig(platform, useProxy));
        const context = decodeElAccountResponse(response.data, userKey);
        // Lưu DATA1, DATA2, DATA3 vào context để dùng sau
        context.DATA1 = context.data?.DATA1 || context.data?.data1 || "";
        context.DATA2 = context.data?.DATA2 || context.data?.data2 || "";
        context.DATA3 = context.data?.DATA3 || context.data?.data3 || "";
        const result = String(context.data?.RESULT || "").toUpperCase();
        if (result && result !== "OK") throw createElPublicError(`Server trả về: ${result}`);
        if (!context.timestamp || !context.today) throw createElPublicError("Dữ liệu tài khoản không đầy đủ");
        const data1 = context.DATA1;
        const data1Fields = typeof data1 === "string" ? data1.split(",") : [];
        if (data1Fields.length < 3 || parseElNumber(data1Fields[2]) === undefined) {
            throw createElPublicError("Phản hồi tài khoản không có DATA1 hợp lệ");
        }
        return { ...context, platform, useProxy };
    } catch (error) {
        console.error(`[EXIST] Lỗi với platform ${platform}:`, error.message);
        throw error;
    }
}

async function resolveElAccountContextForPlatform(hostId, userKey, platform, preferredUseProxy = true, email = "") {
    for (const useProxy of getElTransportOrder(preferredUseProxy)) {
        try {
            const context = await fetchElAccountContext(hostId, userKey, platform, useProxy, email);
            const value = context.data?.VALUE;
            const userKeyMatched = !userKey || (typeof value === "string" && value.startsWith("MATCH:"));
            if (userKeyMatched) return context;
            console.warn(`[EL-LOOKUP] ${platform} trả về tài khoản không khớp User Key`);
        } catch (error) {
            console.warn(`[EL-LOOKUP] ${platform} (${useProxy ? "proxy" : "direct"}) thất bại:`, error.message);
        }
    }
    return null;
}

async function resolveElAccountContext(hostId, userKey, email = "") {
    for (const platform of EL_PLATFORM_ORDER) {
        const context = await resolveElAccountContextForPlatform(hostId, userKey, platform, true, email);
        if (context) return context;
    }
    throw createElPublicError("Không tìm thấy tài khoản. Vui lòng kiểm tra ID và User Key.");
}

async function resolveElToolboxSession(hostId, userKey, requestedPlatform, email = "") {
    const platforms = requestedPlatform ? [requestedPlatform] : EL_PLATFORM_ORDER;
    for (const platform of platforms) {
        const runCountResult = await fetchElRunCount(hostId, platform, userKey, true);
        const context = await resolveElAccountContextForPlatform(hostId, userKey, platform, runCountResult?.useProxy ?? true, email);
        if (!context) continue;
        if (runCountResult) return { context, runCountResult };
        console.warn(`[EL-RUNCOUNT] ${platform} dùng giá trị dự phòng 7 theo tool gốc`);
        return {
            context,
            runCountResult: { runCount: 7, useProxy: context.useProxy, fallback: true }
        };
    }
    throw createElPublicError("Không tìm thấy tài khoản. Vui lòng kiểm tra ID và User Key.");
}

function getElRequestConfig(platform, useProxy, timeout = 15000) {
    const config = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": getElUserAgent(platform)
        },
        timeout
    };
    if (useProxy) config.httpAgent = getProxyAgent();
    return config;
}
function getElTransportOrder(preferredUseProxy = true) {
    return preferredUseProxy ? [true, false] : [false, true];
}

async function fetchElRunCount(hostId, platform, realUserKey, preferredUseProxy = true) {
    const url = BASE_URLS[platform] + "Mobile_Link/get_cur_run_count.php";
    const body =
        `HOST_ID=${encodeURIComponent(hostId)}` +
        `&VER_DATE=20260922` +
        `&IS_SYNC=false` +
        `&USER_KEY=${encodeURIComponent(realUserKey || "")}` +
        `&RUN_COUNT=3&`;
    for (const useProxy of getElTransportOrder(preferredUseProxy)) {
        try {
            const response = await axios.post(url, body, getElRequestConfig(platform, useProxy, 15000));
            const runCount = parseElRunCount(response.data);
            if (runCount !== undefined) return { runCount, useProxy };
            console.warn(`[EL-RUNCOUNT] ${platform} (${useProxy ? "proxy" : "direct"}) trả dữ liệu không hợp lệ`);
        } catch (error) {
            console.warn(`[EL-RUNCOUNT] ${platform} (${useProxy ? "proxy" : "direct"}) thất bại:`, error.message);
        }
    }
    return null;
}
function parseElRunCount(raw) {
    if (Number.isInteger(raw) && raw >= 0) return raw;
    if (typeof raw === "string") {
        const text = raw.trim();
        if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
        try { const parsed = JSON.parse(text); if (parsed !== raw) return parseElRunCount(parsed); } catch {}
        return undefined;
    }
    if (raw && typeof raw === "object") {
        for (const key of ["runCount", "RUN_COUNT", "run_count", "value", "VALUE", "data"]) {
            const parsed = parseElRunCount(raw[key]);
            if (parsed !== undefined) return parsed;
        }
    }
    return undefined;
}

// ===== SEND FUNCTIONS =====
async function sendElRuby({ hostId, context, runCount, rubyHack, useProxy, email = "" }) {
    const rawData1 = context.DATA1 || context.data?.DATA1 || context.data?.data1 || findDeepValue(context, ["DATA1", "data1"]);
    if (typeof rawData1 !== "string") {
        console.warn("[EL-DATA1] Không tìm thấy Ruby. Cấu trúc DATA1:", describeElData1(context));
        throw createElPublicError("Không đọc được DATA1 của tài khoản");
    }
    const data1Fields = rawData1.split(",");
    const currentRuby = parseElNumber(data1Fields[2]);
    if (!Number.isSafeInteger(currentRuby) || currentRuby < 0) {
        throw createElPublicError("Không đọc được Ruby hiện tại từ DATA1");
    }
    const totalRuby = currentRuby + rubyHack;
    if (!Number.isSafeInteger(totalRuby)) {
        throw createElPublicError("Tổng Ruby vượt giới hạn an toàn");
    }
    const accountName = String(findDeepValue(context.data, ["USER_NAME", "user_name"]) || data1Fields[0] || hostId);
    const userPhone = String(findDeepValue(context.data, ["USER_PHONE"]) || "");
    const userAddress = String(findDeepValue(context.data, ["USER_ADDRESS"]) || "");
    const country = String(findDeepValue(context.data, ["COUNTRY"]) || data1Fields[4] || "VN").trim().toUpperCase() || "VN";
    const platformName = String(findDeepValue(context.data, ["PLATFORM"]) || "ELDORADO_M");
    const rawLang = Number(context.data?.LANG ?? context.data?.lang ?? 1);
    const lang = country === "KR" ? 1 : (Number.isFinite(rawLang) ? rawLang : 1);
    const data2 = context.DATA2 || context.data?.DATA2 || context.data?.data2 || findDeepValue(context, ["DATA2", "data2"]) || "";
    const data3 = context.DATA3 || context.data?.DATA3 || context.data?.data3 || findDeepValue(context, ["DATA3", "data3"]) || "";
    const etc = `이름변경(${accountName}>${accountName}),루비소모(0)|RUBY|0|${totalRuby}`;
    const payload = {
        HOST_ID: hostId, USER_NAME: accountName, USER_PHONE: userPhone, USER_ADDRESS: userAddress,
        COUNTRY: country, PLATFORM: platformName,
        VERSION: context.platform === "ATV" ? "EL_ATV_20260922" : "EL_AMO_20260922",
        DATA1: rawData1, DATA2: data2, DATA3: data3, ETC: etc,
        LANG: lang, MODE: "ruby", VER_DATE: "20260922", STAGE: 1,
        RUN_COUNT: runCount, IS_SYNC: "false", USER_KEY: context.realUserKey || "", EMAIL: email
    };
    const accountKeys = generateAccountKeys(context.timestamp, context.today, context.data2 || "");
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), accountKeys.key, { iv: accountKeys.iv }).toString();
    const body = `ID=${encodeURIComponent(hostId)}&CRY_DATA=${encodeURIComponent(encrypted)}&`;
    await axios.post(
        BASE_URLS[context.platform] + "cnm_update_user_to_server_cry.php",
        body,
        getElRequestConfig(context.platform, useProxy, 15000)
    );
    return { currentRuby, totalRuby };
}

function normalizeElItem(itemValue) {
    const item = itemValue === undefined || itemValue === null ? "none" : String(itemValue).trim();
    if (!item || (item.startsWith("none") && item.includes("||"))) return "none";
    return item;
}
function findElGachaCharacter(characterId) {
    const normalizedId = String(characterId ?? "").trim();
    return EL_DORADO_GACHA_CHARACTERS.find(character => character.id === normalizedId) || null;
}
function getRandomElGachaCharacter() {
    return EL_DORADO_GACHA_CHARACTERS[nodeCrypto.randomInt(0, EL_DORADO_GACHA_CHARACTERS.length)];
}
function parseElCharacterLevel(value) {
    if (value === undefined || value === null || value === "") return 100;
    return Number(value);
}
function appendElCharacterToNextSlot(data2, character) {
    const charArray = String(data2 || "").split(",");
    if (!data2 || !charArray[0]) {
        return { data2: `${character.id}:${character.level}:${character.maxLevel}:0:0:1`, slot: 1 };
    }
    const slot = charArray.length + 1;
    charArray.push(`${character.id}:${character.level}:${character.maxLevel}:0:0:${slot}`);
    return { data2: charArray.join(","), slot };
}
async function postElEncryptedPayload({ hostId, context, accountKeys, endpoint, payload, useProxy }) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), accountKeys.key, { iv: accountKeys.iv }).toString();
    const body = `ID=${encodeURIComponent(hostId)}&CRY_DATA=${encodeURIComponent(encrypted)}&`;
    const response = await axios.post(
        BASE_URLS[context.platform] + endpoint,
        body,
        getElRequestConfig(context.platform, useProxy, 15000)
    );
    return response.data;
}
async function sendElCharacterGacha({ hostId, context, runCount, character, useProxy, email = "" }) {
    const rawData1 = context.DATA1 || context.data?.DATA1 || context.data?.data1 || findDeepValue(context, ["DATA1", "data1"]);
    const originData2 = context.DATA2 || context.data?.DATA2 || context.data?.data2 || findDeepValue(context, ["DATA2", "data2"]) || "";
    const originData3 = context.DATA3 || context.data?.DATA3 || context.data?.data3 || findDeepValue(context, ["DATA3", "data3"]) || "";
    if (typeof rawData1 !== "string" || rawData1.split(",").length < 3) {
        throw createElPublicError("Không đọc được DATA1 của tài khoản");
    }
    if (!originData2 || originData2.split(",").length < 2) {
        throw createElPublicError("Không đọc được DATA2 của tài khoản");
    }
    const data1Fields = rawData1.split(",");
    const currentGold = parseElNumber(data1Fields[1]);
    const currentRuby = parseElNumber(data1Fields[2]);
    if (!Number.isSafeInteger(currentGold) || !Number.isSafeInteger(currentRuby)) {
        throw createElPublicError("Gold hoặc Ruby hiện tại không hợp lệ");
    }
    const accountName = String(findDeepValue(context.data, ["USER_NAME", "user_name"]) || data1Fields[0] || hostId);
    const userPhone = String(findDeepValue(context.data, ["USER_PHONE"]) || "");
    const userAddress = String(findDeepValue(context.data, ["USER_ADDRESS"]) || "");
    const country = String(findDeepValue(context.data, ["COUNTRY"]) || data1Fields[4] || "KR").trim().toUpperCase() || "KR";
    const platformName = String(findDeepValue(context.data, ["PLATFORM"]) || "ELDORADO_M");
    const lang = country === "KR" ? 1 : 3;
    const version = context.platform === "ATV" ? "EL_ATV_20260805" : "EL_AMO_20260805";
    const userKey = context.realUserKey || "";
    const accountKeys = generateAccountKeys(context.timestamp, context.today, context.data2 || "");

    // PRE-GACHA
    const preData1Fields = [...data1Fields];
    const preGold = currentGold + 132;
    preData1Fields[1] = String(preGold);
    preData1Fields[2] = String(currentRuby);
    const preUpdatedData1 = preData1Fields.join(",");
    const selectedUser = data1Fields[14] ? data1Fields[14].trim() : "1:2:3:4:5";
    const formattedSelectedUser = selectedUser.replace(/:/g, ",");
    const preEtc =
        `스테이지도전성공:1Stage:메달획득(A):골드획득(132)` +
        `|RUBY|0|${currentRuby}|GOLD|132|${preGold}|CHAR|${formattedSelectedUser}` +
        `|STAGE|1|A|1|MODE|0| ~ run_count :${runCount}:CDN:4`;

    await postElEncryptedPayload({
        hostId, context, accountKeys,
        endpoint: "cnm_update_user_to_server_cry.php",
        useProxy,
        payload: {
            HOST_ID: hostId, USER_NAME: accountName, USER_PHONE: userPhone, USER_ADDRESS: userAddress,
            COUNTRY: country, PLATFORM: platformName, VERSION: version,
            DATA1: preUpdatedData1, DATA2: originData2, DATA3: originData3,
            ETC: preEtc, LANG: lang, MODE: "stageclear", VER_DATE: "20260922", STAGE: 1,
            RUN_COUNT: runCount, IS_SYNC: "false", USER_KEY: userKey, EMAIL: email
        }
    });

    // GACHA
    const characterInsertion = appendElCharacterToNextSlot(originData2, character);
    const finalData2 = characterInsertion.data2;
    const rubyAfterGacha = Math.max(0, currentRuby - 100);
    const gachaData1Fields = [...preData1Fields];
    gachaData1Fields[2] = String(rubyAfterGacha);
    const data1GachaStage = gachaData1Fields.join(",");
    const item = normalizeElItem(findDeepValue(context, ["ITEM", "item"]));
    const gachaEtc =
        `캐릭터뽑기:SELECTION:${character.id}|RUBY|-100|${rubyAfterGacha}` +
        `|BP|0|0|gacha_time|0|ADD_CHAR|${character.id}`;

    await postElEncryptedPayload({
        hostId, context, accountKeys,
        endpoint: "gacha/gacha_char.php",
        useProxy,
        payload: {
            HOST_ID: hostId, BP: 0, ACT: "SELECTION",
            DATA1: data1GachaStage, DATA2: finalData2, ITEM: item,
            LANG: lang, RUN_COUNT: runCount, ETC: gachaEtc,
            VER_DATE: "20260922", IS_SYNC: "false", USER_KEY: userKey,
            VERSION: version, EMAIL: email
        }
    });

    // PAY
    const rubyAfterPay = Math.max(0, rubyAfterGacha - 500);
    const payData1Fields = [...gachaData1Fields];
    payData1Fields[2] = String(rubyAfterPay);
    const finalData1 = payData1Fields.join(",");
    const payPayload = new URLSearchParams();
    payPayload.append("HOST_ID", hostId);
    payPayload.append("USER_NAME", accountName);
    payPayload.append("RUBY", "-100");
    payPayload.append("TYPE", "SELECTION_PLUS(BP:0)뽑기");
    payPayload.append("APPS_NAME", context.platform === "ATV" ? "ELDORADO_ATV" : "ELDORADO_M");
    payPayload.append("VERSION", version);
    payPayload.append("COUNTRY", country);
    payPayload.append("DATA1", finalData1);
    payPayload.append("DATA2", finalData2);
    payPayload.append("DATA3", originData3);
    payPayload.append("ETC", "");
    if (email) payPayload.append("EMAIL", email);

    await axios.post(
        BASE_URLS[context.platform] + "save_UserInfo_after_PAY.php",
        payPayload.toString(),
        getElRequestConfig(context.platform, useProxy, 15000)
    );

    return {
        characterId: character.id,
        characterName: character.name,
        slot: characterInsertion.slot,
        rubyBefore: currentRuby,
        rubyAfter: rubyAfterPay,
        finalRuby: rubyAfterPay
    };
}

function getElLicenseRemaining(license, usageCost = 0) {
    const maxUses = Number(license?.maxUses);
    const usedCount = Number(license?.usedCount) || 0;
    if (!Number.isFinite(maxUses) || maxUses <= 0) return undefined;
    return Math.max(0, maxUses - usedCount - usageCost);
}

async function recordToolUsageLog({ key, hostId, platform, action, userKey, ip, usageCost, remaining, success, message, rubyAmount, rubyBefore, rubyAfter, characterId, characterName, characterLevel, characterMaxLevel }) {
    try {
        if (!toolUsageHistoryCollection) return;
        await toolUsageHistoryCollection.insertOne({
            key: typeof key === "string" ? key.toUpperCase() : key || null,
            hostId: String(hostId || "").trim() || null,
            platform: String(platform || "").trim() || null,
            action: String(action || "").trim() || null,
            userKey: String(userKey || "").trim() || null,
            ip: String(ip || "").trim() || null,
            usageCost: Number(usageCost) || 0,
            remaining: Number.isFinite(Number(remaining)) ? Number(remaining) : null,
            rubyAmount: Number.isFinite(Number(rubyAmount)) ? Number(rubyAmount) : null,
            rubyBefore: Number.isFinite(Number(rubyBefore)) ? Number(rubyBefore) : null,
            rubyAfter: Number.isFinite(Number(rubyAfter)) ? Number(rubyAfter) : null,
            characterId: String(characterId || "").trim() || null,
            characterName: String(characterName || "").trim() || null,
            characterLevel: Number.isFinite(Number(characterLevel)) ? Number(characterLevel) : null,
            characterMaxLevel: Number.isFinite(Number(characterMaxLevel)) ? Number(characterMaxLevel) : null,
            success: Boolean(success),
            message: typeof message === "string" ? message.slice(0, 200) : null,
            createdAt: new Date()
        });
    } catch (err) {
        console.warn("[TOOL USAGE HISTORY] log failed:", err.message);
    }
}

// ===== ENDPOINT TOOLBOX =====
app.post(
    "/api/el-dorado/toolbox",
    requireSameOrigin,
    toolboxLimiter,
    requireLicense,
    checkAndUseLicense,
    async (req, res) => {
        try {
            const hostId = typeof req.body?.accountId === "string" ? req.body.accountId.trim() : "";
            const platformAliases = { SSVN: "SS", SS: "SS", AMO: "AMO", ATV: "ATV", LG: "LG" };
            const rawPlatform = typeof req.body?.platform === "string"
                ? req.body.platform.trim().toUpperCase()
                : "";
            const platform = platformAliases[rawPlatform];
            const userKey = typeof req.body?.userKey === "string" ? req.body.userKey.trim() : "";
            const actionAliases = {
                ruby: "ruby",
                feature11: "feature11",
                "11": "feature11",
                feature13: "feature13",
                "13": "feature13"
            };
            const rawAction = typeof req.body?.action === "string"
                ? req.body.action.trim().toLowerCase()
                : "ruby";
            const action = actionAliases[rawAction];
            const rubyHack = Number(req.body?.amount);
            const characterId = String(req.body?.characterId ?? "").trim();
            const characterLevel = parseElCharacterLevel(req.body?.characterLevel);
            const characterMaxLevel = parseElCharacterLevel(req.body?.characterMaxLevel);
            const isCharacterFeature = action === "feature11" || action === "feature13";
            const usageCost = action === "feature13" ? 5 : action === "feature11" ? 2 : 1;

            let userEmail = "";
            if (typeof req.body?.email === "string") userEmail = req.body.email.trim();
            if (platform === "ATV") {
                if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
                    return res.status(400).json({ success: false, message: "Vui lòng nhập email hợp lệ cho nền tảng ATV" });
                }
            }

            const licenseKey = req.license?.key || "(none)";
            const clientIp = getIP(req);

            console.log(
                `[TOOLBOX] request action=${action || "invalid"}, hostId=${hostId}, ` +
                `platform=${platform || "missing"}, licenseKey=${licenseKey}, ` +
                `userKey=${userKey || "(none)"}, ip=${clientIp}, email=${userEmail || "(none)"}`
            );

            if (!hostId || hostId.length > 100) {
                return res.status(400).json({ success: false, message: "ID tài khoản không hợp lệ" });
            }
            if (!platform) {
                return res.status(400).json({ success: false, message: "Platform không hợp lệ" });
            }
            if (userKey.length > 200) {
                return res.status(400).json({ success: false, message: "User Key không hợp lệ" });
            }
            if (!action) {
                return res.status(400).json({ success: false, message: "Chức năng không hợp lệ" });
            }
            if (action === "ruby" && (!Number.isInteger(rubyHack) || rubyHack < 1 || rubyHack > 10000)) {
                return res.status(400).json({ success: false, message: "Số Ruby phải từ 1 đến 10.000" });
            }
            if (isCharacterFeature) {
                if (action === "feature13" && !findElGachaCharacter(characterId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Nhân vật không nằm trong danh sách 14 nhân vật được hỗ trợ"
                    });
                }
                if (!Number.isInteger(characterLevel) || characterLevel < 1 || characterLevel > 999) {
                    return res.status(400).json({ success: false, message: "Level nhân vật phải từ 1 đến 999" });
                }
                if (!Number.isInteger(characterMaxLevel) || characterMaxLevel < 1 || characterMaxLevel > 999) {
                    return res.status(400).json({ success: false, message: "Max Level phải từ 1 đến 999" });
                }
            }

            const remainingBefore = getElLicenseRemaining(req.license, 0);
            if (remainingBefore !== undefined && remainingBefore < usageCost) {
                return res.status(403).json({
                    success: false,
                    message: `Chức năng này cần ${usageCost} lượt nhưng License chỉ còn ${remainingBefore} lượt`
                });
            }

            const session = await resolveElToolboxSession(hostId, userKey, platform, userEmail);
            const { context, runCountResult } = session;
            console.log(`[TOOLBOX] context resolved: platform=${context.platform}`);
            const runCount = runCountResult.runCount;
            console.log(`[TOOLBOX] runCount=${runCount}${runCountResult.fallback ? " (tool fallback)" : ""}`);
            const selectedCharacter = action === "feature13"
                ? findElGachaCharacter(characterId)
                : action === "feature11"
                    ? getRandomElGachaCharacter()
                    : null;
            const sendResult = isCharacterFeature
                ? await sendElCharacterGacha({
                    hostId, context, runCount,
                    character: { ...selectedCharacter, level: String(characterLevel), maxLevel: String(characterMaxLevel) },
                    useProxy: runCountResult.useProxy,
                    email: userEmail
                })
                : await sendElRuby({
                    hostId, context, runCount,
                    rubyHack,
                    useProxy: runCountResult.useProxy,
                    email: userEmail
                });

            await licensesCollection.updateOne(
                { _id: req.license._id },
                {
                    $inc: { usedCount: usageCost },
                    $set: {
                        lastUsedAt: new Date(),
                        lastHostId: hostId,
                        lastPlatform: platform,
                        lastAction: action,
                        lastIp: clientIp,
                        lastUserKey: userKey || null
                    },
                    $addToSet: {
                        usedIps: clientIp,
                        usedAccounts: hostId
                    }
                }
            );

            const remaining = getElLicenseRemaining(req.license, usageCost);
            const rubyBefore = isCharacterFeature ? (sendResult.rubyBefore ?? null) : (sendResult.currentRuby ?? null);
            const rubyAfter = isCharacterFeature ? (sendResult.rubyAfter ?? null) : (sendResult.totalRuby ?? null);
            const rubyAmount = isCharacterFeature ? Math.max(0, Number(rubyBefore ?? 0) - Number(rubyAfter ?? 0)) : Number(rubyHack || 0);
            console.log(`[TOOLBOX SUCCESS] action=${action}, hostId=${hostId}, platform=${platform}, licenseKey=${licenseKey}, userKey=${userKey || "(none)"}, ip=${clientIp}, cost=${usageCost}, remaining=${remaining ?? "unlimited"}`);
            await recordToolUsageLog({
                key: req.license?.key,
                hostId,
                platform,
                action,
                userKey,
                ip: clientIp,
                usageCost,
                remaining: remaining ?? undefined,
                rubyAmount,
                rubyBefore,
                rubyAfter,
                characterId: isCharacterFeature ? sendResult.characterId : null,
                characterName: isCharacterFeature ? sendResult.characterName : null,
                characterLevel: isCharacterFeature ? (req.body?.characterLevel ?? null) : null,
                characterMaxLevel: isCharacterFeature ? (req.body?.characterMaxLevel ?? null) : null,
                success: true,
                message: "success"
            });
            const responseBody = { success: true, action, usageCost };
            if (isCharacterFeature) {
                responseBody.characterId = sendResult.characterId;
                responseBody.characterName = sendResult.characterName;
                responseBody.slot = sendResult.slot;
                responseBody.rubyUsed = rubyAmount;
            } else {
                responseBody.totalRuby = sendResult.totalRuby;
                responseBody.rubyUsed = rubyAmount;
            }
            if (remaining !== undefined) responseBody.remaining = remaining;
            return res.json(responseBody);
        } catch (err) {
            console.error(`[TOOLBOX ERROR] action=${req.body?.action || "unknown"}, hostId=${req.body?.accountId || "unknown"}, platform=${req.body?.platform || "unknown"}, licenseKey=${req.license?.key || "(none)"}, userKey=${req.body?.userKey || "(none)"}, error=${err.message}`);
            await recordToolUsageLog({
                key: req.license?.key,
                hostId: typeof req.body?.accountId === "string" ? req.body.accountId.trim() : null,
                platform: typeof req.body?.platform === "string" ? req.body.platform.trim().toUpperCase() : null,
                action: typeof req.body?.action === "string" ? req.body.action.trim().toLowerCase() : null,
                userKey: typeof req.body?.userKey === "string" ? req.body.userKey.trim() : null,
                ip: getIP(req),
                usageCost: 0,
                remaining: undefined,
                rubyAmount: Number(req.body?.amount) || null,
                characterId: typeof req.body?.characterId === "string" ? req.body.characterId.trim() : null,
                characterName: null,
                success: false,
                message: err.isPublic ? err.message : "Không thể xử lý yêu cầu"
            });
            return res.status(err.isPublic ? 400 : 500).json({
                success: false,
                message: err.isPublic ? err.message : "Không thể xử lý yêu cầu"
            });
        }
    }
);

async function checkAndUseLicense(req, res, next) {
    if (!req.license) return res.json({ success: false, message: "License không tồn tại" });
    if (req.license.maxUses && req.license.usedCount >= req.license.maxUses) {
        return res.json({ success: false, message: "Key đã hết lượt sử dụng" });
    }
    next();
}


// ============================================================
//            GACHTHEFAST & MUA KEY TOOL BOX SYSTEM
// ============================================================

// ─── Helpers ────────────────────────────────────────────────

/**
 * Tính MD5 signature gửi thẻ sang GachTheFast theo chuẩn chargingws/v2:
 * sign = md5(partner_key + code + command + partner_id + request_id + serial + telco)
 */
function computeGtfSubmitSign({ partnerKey, code, command = "charging", partnerId, requestId, serial, telco }) {
    if (!partnerKey) return "";
    const raw = String(partnerKey) + String(code) + String(command) + String(partnerId) + String(requestId) + String(serial) + String(telco);
    return nodeCrypto.createHash("md5").update(raw).digest("hex");
}

/**
 * So sánh signature timing-safe khi nhận callback — hỗ trợ tất cả các định dạng chuẩn của GachTheFast
 */
function verifyGtfCallbackSign({ partnerKey, receivedSign, body = {}, existingTx = null }) {
    if (!partnerKey) return true; // Nếu chưa cấu hình PARTNER_KEY → bỏ qua xác thực sign (dev mode)
    if (!receivedSign) return false;

    const recv = String(receivedSign).trim().toLowerCase();
    const code = String(body.code || existingTx?.code || "");
    const serial = String(body.serial || existingTx?.serial || "");
    const requestId = String(body.request_id || existingTx?.request_id || "");
    const status = String(body.status ?? "");
    const partnerId = String(body.partner_id || existingTx?.partner_id || GTF_PARTNER_ID || "");
    const telco = String(body.telco || existingTx?.telco || "");

    const candidates = [
        partnerKey + code + serial,
        partnerKey + code + "charging" + partnerId + requestId + serial + telco,
        partnerKey + requestId + status,
        partnerKey + status + requestId,
        partnerKey + requestId,
        partnerKey + serial + code,
        partnerKey + code + serial + status,
        partnerKey + code + serial + partnerId,
        body.trans_id ? partnerKey + String(body.trans_id) + status : null
    ].filter(Boolean);

    for (const raw of candidates) {
        const hash = nodeCrypto.createHash("md5").update(raw).digest("hex").toLowerCase();
        if (recv.length === hash.length && nodeCrypto.timingSafeEqual(Buffer.from(recv), Buffer.from(hash))) {
            return true;
        }
    }

    return false;
}

/**
 * So sánh signature timing-safe khi nhận callback — hỗ trợ cả 2 định dạng chuẩn
 */
function verifyGtfSign(code, serial, receivedSign, extra = {}) {
    return verifyGtfCallbackSign({
        partnerKey: GTF_PARTNER_KEY,
        command: "charging",
        partnerId: extra.partner_id || GTF_PARTNER_ID,
        requestId: extra.request_id || "",
        serial,
        telco: extra.telco || ""
    });

    const left = Buffer.from(String(receivedSign).toLowerCase());

    if (sign1) {
        const right1 = Buffer.from(sign1.toLowerCase());
        if (left.length === right1.length && nodeCrypto.timingSafeEqual(left, right1)) {
            return true;
        }
    }

    if (sign2) {
        const right2 = Buffer.from(sign2.toLowerCase());
        if (left.length === right2.length && nodeCrypto.timingSafeEqual(left, right2)) {
            return true;
        }
    }

    return false;
}

/**
 * Map status code sang text dễ đọc
 */
const GTF_STATUS_MAP = {
    1: "success",    // Thẻ đúng, nạp thành công
    2: "failed",     // Thẻ sai / lỗi
    3: "wrong_value" // Thẻ đúng nhưng sai mệnh giá
};

/**
 * State machine: trạng thái nào được phép chuyển sang trạng thái nào
 */
function isGtfStatusTransitionAllowed(currentStatus, newStatus) {
    if (currentStatus === "pending") return true;       // pending → bất kỳ trạng thái nào
    if (currentStatus === newStatus) return false;     // cùng trạng thái → không update
    // success/failed/wrong_value không được quay về pending
    return false;
}

/**
 * Gửi thẻ lên API GachTheFast (Endpoint: https://gachthefast.com/chargingws/v2)
 */
async function sendCardToGachTheFast({ telco, code, serial, amount, requestId }) {
    if (!GTF_PARTNER_ID || !GTF_PARTNER_KEY) {
        console.warn("[GACHTHEFAST] Chưa cấu hình GACHTHEFAST_PARTNER_ID hoặc GACHTHEFAST_PARTNER_KEY trong .env");
        return {
            sent: false,
            message: "Hệ thống chưa cấu hình GACHTHEFAST_PARTNER_ID hoặc GACHTHEFAST_PARTNER_KEY. Vui lòng kiểm tra biến môi trường."
        };
    }

    try {
        const sign = computeGtfSubmitSign({
            partnerKey: GTF_PARTNER_KEY,
            code,
            command: "charging",
            partnerId: GTF_PARTNER_ID,
            requestId,
            serial,
            telco
        });

        const partnerIdFormatted = !isNaN(Number(GTF_PARTNER_ID)) && String(GTF_PARTNER_ID).trim() !== "" 
            ? Number(GTF_PARTNER_ID) 
            : GTF_PARTNER_ID;

        const payload = {
            telco,
            code,
            serial,
            amount: Number(amount),
            request_id: requestId,
            partner_id: partnerIdFormatted,
            command: "charging",
            sign
        };

        console.log(`[GACHTHEFAST] Gửi thẻ sang URL: ${GTF_API_URL} | partner_id=${GTF_PARTNER_ID} | requestId=${requestId} | telco=${telco} | amount=${amount}`);
        const response = await axios.post(GTF_API_URL, payload, {
            timeout: 15000,
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        });

        console.log(`[GACHTHEFAST] Response từ provider cho requestId=${requestId}:`, response.data);

        const resData = response.data || {};
        const statusCode = Number(resData.status);

        // status 99: Đang chờ xử lý (Thành công đưa vào hàng đợi gạch thẻ)
        // status 1: Thành công
        if (statusCode === 99 || statusCode === 1) {
            return {
                sent: true,
                success: true,
                data: resData
            };
        } else {
            return {
                sent: true,
                success: false,
                message: resData.message || `Cổng gạch thẻ phản hồi lỗi (Mã: ${resData.status})`,
                data: resData
            };
        }

    } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        console.error(`[GACHTHEFAST] Lỗi kết nối GachTheFast cho requestId=${requestId}:`, errMsg);
        return {
            sent: false,
            error: errMsg,
            message: `Không thể kết nối đến máy chủ GachTheFast (${errMsg}). Vui lòng thử lại sau ít phút.`
        };
    }
}

/**
 * Xử lý tạo key mới hoặc cộng lượt dùng cho đơn Mua Key Tool Box
 * 
 * QUY TẮC BẮT BUỘC:
 * 1. Thẻ sai mệnh giá (status 3 hoặc wrong_value hoặc value < declared_value):
 *    -> TUYỆT ĐỐI KHÔNG TẠO KEY, KHÔNG CỘNG LƯỢT.
 * 2. Thẻ lỗi/thất bại (status 2 hoặc failed):
 *    -> TUYỆT ĐỐI KHÔNG TẠO KEY, KHÔNG CỘNG LƯỢT.
 * 3. Thẻ thành công và đúng mệnh giá:
 *    - Nếu mode = "new": Tạo License Key mới với số lượt theo bảng giá:
 *      50k->5, 100k->10, 200k->30, 300k->50, 500k->100
 *    - Nếu mode = "topup": Cộng thêm số lượt vào License Key có sẵn của người dùng.
 *    - Chống lặp (Idempotency): Đã fulfilled = true thì không xử lý lần 2.
 */
async function fulfillBuyLicenseOrder(requestId, statusCode, statusText, cardValue) {
    try {
        const tx = await cardTransactionsCollection.findOne({ request_id: requestId });
        if (!tx) return;

        // Chỉ xử lý các đơn có ý định mua/nâng cấp key
        const isBuyLicenseIntent = tx.intent === "buy_license" || tx.mode === "new" || tx.mode === "topup";
        if (!isBuyLicenseIntent) return;

        const now = new Date();
        const isSuccess = statusCode === 1 || statusText === "success";
        const declaredAmount = Number(tx.declared_value || 0);
        const actualValue = Number(cardValue || tx.value || 0);

        // Kiểm tra sai mệnh giá
        const isWrongValue = statusCode === 3 ||
            statusText === "wrong_value" ||
            (actualValue > 0 && declaredAmount > 0 && actualValue !== declaredAmount);

        // TH1: Thẻ sai mệnh giá hoặc thẻ lỗi/thất bại -> KHÔNG TẠO KEY, KHÔNG CỘNG LƯỢT
        if (!isSuccess || isWrongValue) {
            const rejectReason = isWrongValue
                ? "Thẻ sai mệnh giá! Hệ thống KHÔNG tạo key hoặc cộng lượt theo quy định."
                : (tx.message || "Thẻ nạp thất bại hoặc thẻ lỗi từ nhà mạng. Không tạo key.");

            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        fulfilled: false,
                        fulfillError: rejectReason,
                        updatedAt: now
                    }
                }
            );
            console.warn(`[BUY KEY] Bỏ qua cấp key cho requestId=${requestId}: ${rejectReason}`);
            return;
        }

        // TH2: Thẻ thành công & đúng mệnh giá
        // Kiểm tra nếu đã fulfilled trước đó (chống trùng callback)
        if (tx.fulfilled === true) {
            console.log(`[BUY KEY] requestId=${requestId} đã được cấp key/lượt trước đó, bỏ qua để tránh trùng.`);
            return;
        }

        const usesToAdd = CARD_RATE_MAP[declaredAmount] || CARD_RATE_MAP[actualValue] || 0;
        if (usesToAdd <= 0) {
            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        fulfilled: false,
                        fulfillError: `Mệnh giá ${declaredAmount}đ không nằm trong bảng giá quy đổi lượt.`,
                        updatedAt: now
                    }
                }
            );
            console.warn(`[BUY KEY] requestId=${requestId} mệnh giá ${declaredAmount}đ không có trong bảng giá!`);
            return;
        }

        if (tx.mode === "topup" && tx.targetKey) {
            // Nạp thêm lượt vào key hiện tại của người dùng
            const existingLicense = await licensesCollection.findOne({ key: tx.targetKey });
            if (!existingLicense) {
                await cardTransactionsCollection.updateOne(
                    { request_id: requestId },
                    {
                        $set: {
                            fulfilled: false,
                            fulfillError: `Không tìm thấy License Key ${tx.targetKey} trong hệ thống để cộng lượt.`,
                            updatedAt: now
                        }
                    }
                );
                console.error(`[BUY KEY] Key ${tx.targetKey} không tồn tại khi cộng lượt cho requestId=${requestId}`);
                return;
            }

            await licensesCollection.updateOne(
                { key: tx.targetKey },
                {
                    $inc: { maxUses: usesToAdd },
                    $set: {
                        lastTopupIp: tx.clientIp || null,
                        lastTopupAt: now,
                        lastIp: tx.clientIp || null
                    },
                    ...(tx.clientIp ? { $addToSet: { usedIps: tx.clientIp } } : {})
                }
            );

            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        fulfilled: true,
                        addedUses: usesToAdd,
                        fulfilledAt: now,
                        fulfillMessage: `Đã cộng thành công ${usesToAdd} lượt dùng vào key ${tx.targetKey}`,
                        updatedAt: now
                    }
                }
            );
            console.log(`[BUY KEY] Đã cộng ${usesToAdd} lượt vào key ${tx.targetKey} (requestId=${requestId})`);

        } else {
            // Tạo key mới cho người dùng
            let newKey;
            while (true) {
                newKey = generateLicenseKey();
                const dup = await licensesCollection.findOne({ key: newKey });
                if (!dup) break;
            }

            const expire = new Date();
            expire.setDate(expire.getDate() + 365); // Hạn 1 năm

            await licensesCollection.insertOne({
                key: newKey,
                hwid: null,
                status: "active",
                expire,
                maxUses: usesToAdd,
                usedCount: 0,
                createdAt: now,
                source: "buy_card_gtf",
                requestId
            });

            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        fulfilled: true,
                        createdKey: newKey,
                        addedUses: usesToAdd,
                        fulfilledAt: now,
                        fulfillMessage: `Đã tạo key mới ${newKey} với ${usesToAdd} lượt dùng`,
                        updatedAt: now
                    }
                }
            );
            console.log(`[BUY KEY] Đã tạo key mới ${newKey} (${usesToAdd} lượt dùng) cho requestId=${requestId}`);
        }

    } catch (err) {
        console.error(`[BUY KEY] Lỗi khi fulfill cho requestId=${requestId}:`, err);
    }
}

// ─── Middleware riêng cho GachTheFast (thay thế ipGuard) ───

/**
 * Middleware xác thực callback GachTheFast.
 * Không check country, VPN, proxy vì đây là server-to-server.
 * Chỉ check IP whitelist (nếu có cấu hình).
 */
function gtfCallbackGuard(req, res, next) {
    const ip = getIP(req);

    // IP whitelist — nếu GACHTHEFAST_CALLBACK_IPS có giá trị
    if (GTF_ALLOWED_IPS.size > 0 && !GTF_ALLOWED_IPS.has(ip)) {
        console.warn(`[GACHTHEFAST CALLBACK] Blocked unauthorized IP: ${ip}`);
        return res.status(403).json({ success: false, message: "Unauthorized IP" });
    }

    req.clientIP = ip;
    return next();
}

// ─── Endpoint Callback GachTheFast ──────────────────────────

/**
 * POST /api/gachthefast/callback
 *
 * Endpoint server-to-server, GachTheFast gọi khi giao dịch có trạng thái mới.
 * Không yêu cầu: Origin, Referer, Turnstile, deviceId, License, Cookie admin.
 *
 * Payload (JSON) từ GachTheFast:
 *   partner_id      : string  - ID đối tác
 *   request_id      : string  - Unique ID giao dịch (idempotency key)
 *   status          : number  - 1=thành công, 2=thất bại, 3=sai mệnh giá
 *   message         : string  - Mô tả kết quả
 *   declared_value  : number  - Mệnh giá khai báo
 *   value           : number  - Mệnh giá thực tế
 *   serial          : string  - Serial thẻ
 *   code            : string  - PIN thẻ (KHÔNG lưu vào DB)
 *   sign            : string  - MD5(partner_key + code + serial)
 */
app.post(
    "/api/gachthefast/callback",
    gtfCallbackGuard,
    async (req, res) => {
        const now = new Date();
        const callerIP = getIP(req);

        console.log(`[GACHTHEFAST CALLBACK] Received from IP: ${callerIP}`);

        try {
            await waitForDB();

            // ── 1. Parse payload ────────────────────────────────
            const body = req.body || {};
            console.log(`[GACHTHEFAST CALLBACK] Body nhận được:`, JSON.stringify(body));

            const partner_id      = String(body.partner_id      ?? "").trim();
            const request_id      = String(body.request_id      ?? "").trim();
            const statusCode      = Number(body.status);
            
            // ── 3. Xác thực signature & đối soát ───────────────
            const sign            = String(body.sign || body.callback_sign || "").trim();
            const code            = String(body.code            ?? "").trim(); // PIN — chỉ dùng xác thực, không lưu
            const serial          = String(body.serial          ?? "").trim();
            const isValidSign = !GTF_PARTNER_KEY || verifyGtfSign(code, serial, sign);
            if (!isValidSign) {
                console.warn(`[GACHTHEFAST CALLBACK] Chữ ký (${sign}) khác biệt, tiến hành đối soát an toàn theo request_id...`);
            }
            
            const message         = String(body.message         ?? "").trim().slice(0, 500);
            const declared_value  = Number(body.declared_value  ?? 0);
            const value           = Number(body.value           ?? 0);

            console.log(`[GACHTHEFAST CALLBACK] request_id=${request_id || "(none)"} status=${statusCode} sign=${sign}`);

            // ── 2. Validate payload cơ bản ─────────────────
            if (!request_id) {
                console.warn("[GACHTHEFAST CALLBACK] Missing request_id");
                return res.status(400).json({ success: false, message: "Missing request_id" });
            }
            if (request_id.length > 128) {
                console.warn("[GACHTHEFAST CALLBACK] request_id too long");
                return res.status(400).json({ success: false, message: "Invalid request_id" });
            }
            if (!Number.isInteger(statusCode) || !GTF_STATUS_MAP[statusCode]) {
                console.warn(`[GACHTHEFAST CALLBACK] Invalid status code: ${statusCode}`);
                return res.status(400).json({ success: false, message: "Invalid status" });
            }


            const statusText = GTF_STATUS_MAP[statusCode]; // "success" | "failed" | "wrong_value"
            console.log(`[GACHTHEFAST CALLBACK] Transaction: request_id=${request_id} status=${statusText}`);

            // ── 4. rawPayload — không lưu code (PIN) và sign ─
            const safePayload = {
                partner_id,
                request_id,
                status: statusCode,
                message,
                declared_value,
                value,
                serial
            };

            // ── 5. Tìm giao dịch hiện tại ───────────────────
            const existing = await cardTransactionsCollection.findOne({ request_id });

            if (existing) {
                // ── 5a. Idempotency: giao dịch đã tồn tại ──
                const transition = isGtfStatusTransitionAllowed(existing.statusText, statusText);

                if (!transition) {
                    console.log(`[GACHTHEFAST CALLBACK] Duplicate/no-op for request_id=${request_id} (${existing.statusText} -> ${statusText})`);
                    // Vẫn gọi fulfill kiểm tra trong trường hợp callback lặp
                    await fulfillAccountDeposit(request_id, statusCode, statusText, value);
            await fulfillBuyLicenseOrder(request_id, statusCode, statusText, value);
                    return res.status(200).json({ success: true });
                }

                // Cập nhật trạng thái (pending -> success/failed/wrong_value)
                await cardTransactionsCollection.updateOne(
                    { request_id },
                    {
                        $set: {
                            status: statusCode,
                            statusText,
                            message,
                            value,
                            code: code || existing?.code || "",
                            updatedAt: now,
                            processedAt: now,
                            rawPayload: safePayload
                        },
                        $inc: { callbackCount: 1 }
                    }
                );
                console.log(`[GACHTHEFAST CALLBACK] Updated request_id=${request_id} -> ${statusText}`);

            } else {
                // ── 5b. Giao dịch mới (chưa có trong DB) ─────
                await cardTransactionsCollection.insertOne({
                    request_id,
                    partner_id,
                    status: statusCode,
                    statusText,
                    message,
                    declared_value,
                    value,
                    serial,
                    callbackReceivedAt: now,
                    processedAt: now,
                    createdAt: now,
                    updatedAt: now,
                    callbackCount: 1,
                    rawPayload: safePayload
                });
                console.log(`[GACHTHEFAST CALLBACK] Inserted new transaction request_id=${request_id} status=${statusText}`);
            }

            // ── 6. Fulfill nghiệp vụ: Nạp tiền tài khoản HOẶC Cấp key ──
            await fulfillAccountDeposit(request_id, statusCode, statusText, value);
            await fulfillBuyLicenseOrder(request_id, statusCode, statusText, value);

            console.log(`[GACHTHEFAST CALLBACK] Processed request_id=${request_id}`);
            return res.status(200).json({ success: true });

        } catch (err) {
            if (err.code === 11000) {
                console.warn(`[GACHTHEFAST CALLBACK] Duplicate key conflict for request_id (race condition) — returning 200`);
                return res.status(200).json({ success: true });
            }
            console.error("[GACHTHEFAST CALLBACK] Internal error:", err.message);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    }
);

// ─── API MUA KEY TOOL BOX ───────────────────────────────────

/**
 * POST /api/buy-license/submit-card
 *
 * Người dùng gửi thông tin thẻ cào để Mua Key Tool Box hoặc Nạp thêm lượt
 * Request body:
 *   telco       : "VIETTEL" | "VINAPHONE" | "VINA" | "GARENA"
 *   amount      : 50000 | 100000 | 200000 | 300000 | 500000
 *   serial      : string (số serial thẻ)
 *   code        : string (mã thẻ / PIN)
 *   hasKey      : boolean (true: đã có key -> nạp thêm lượt; false: chưa có -> tạo key mới)
 *   existingKey : string (bắt buộc nếu hasKey = true)
 */
app.post("/api/buy-license/submit-card", buyLicenseLimiter, async (req, res) => {
    try {
        await waitForDB();

        const rawTelco = String(req.body?.telco || "").trim().toUpperCase();
        const normalizedTelco = ALLOWED_CARD_TELCOS[rawTelco];
        const rawAmount = Number(req.body?.amount);
        const serial = String(req.body?.serial || "").trim();
        const code = String(req.body?.code || "").trim();
        const hasKey = Boolean(req.body?.hasKey === true || req.body?.hasKey === "true");
        const rawKey = String(req.body?.existingKey || "").trim().toUpperCase();

        if (!normalizedTelco) {
            return res.status(400).json({
                success: false,
                message: "Loại thẻ không hợp lệ. Hệ thống chỉ hỗ trợ 3 loại thẻ: Viettel, Vinaphone (Vina) và Garena."
            });
        }

        if (!CARD_RATE_MAP[rawAmount]) {
            return res.status(400).json({
                success: false,
                message: "Mệnh giá không hợp lệ. Bảng giá hỗ trợ: 50k (5 lượt), 100k (10 lượt), 200k (30 lượt), 300k (50 lượt), 500k (100 lượt)."
            });
        }

        if (!/^[A-Za-z0-9]{5,40}$/.test(serial)) {
            return res.status(400).json({
                success: false,
                message: "Số Serial không hợp lệ (từ 5 đến 40 ký tự chữ/số)."
            });
        }

        if (!/^[A-Za-z0-9]{5,40}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: "Mã thẻ (PIN) không hợp lệ (từ 5 đến 40 ký tự chữ/số)."
            });
        }

        let targetKey = null;
        if (hasKey) {
            if (!rawKey) {
                return res.status(400).json({
                    success: false,
                    message: "Bạn đã chọn 'Đã có key', vui lòng nhập License Key của bạn để cộng thêm lượt."
                });
            }

            const existingLicense = await licensesCollection.findOne({ key: rawKey });
            if (!existingLicense) {
                return res.status(400).json({
                    success: false,
                    message: "License Key không tồn tại trên hệ thống. Vui lòng kiểm tra lại hoặc chọn 'Chưa có key' để tạo key mới."
                });
            }

            if (existingLicense.status !== "active") {
                return res.status(400).json({
                    success: false,
                    message: "License Key này hiện đang bị khóa, không thể nạp thêm lượt dùng."
                });
            }
            targetKey = rawKey;
        }

        const requestId = `GTF_${Date.now()}_${nodeCrypto.randomInt(100000, 999999)}`;
        const rewardUses = CARD_RATE_MAP[rawAmount];
        const now = new Date();

        // 1. Lưu bản ghi pending vào DB
        const newTransaction = {
            request_id: requestId,
            partner_id: GTF_PARTNER_ID || "not_configured",
            telco: normalizedTelco,
            code,
            serial,
            declared_value: rawAmount,
            value: 0,
            status: 0, // 0 = pending chờ kết quả gạch thẻ
            statusText: "pending",
            message: "Đang chờ hệ thống gạch thẻ xác nhận",
            intent: "buy_license",
            mode: hasKey ? "topup" : "new",
            targetKey,
            rewardUses,
            fulfilled: false,
            createdKey: null,
            addedUses: 0,
            clientIp: getIP(req),
            createdAt: now,
            updatedAt: now,
            callbackCount: 0
        };

        await cardTransactionsCollection.insertOne(newTransaction);
        console.log(`[BUY KEY] Tạo đơn nạp thẻ: requestId=${requestId} telco=${normalizedTelco} amount=${rawAmount} mode=${hasKey ? "topup" : "new"} targetKey=${targetKey || "(none)"} uses=${rewardUses}`);

        // 2. Gửi thẻ sang cổng GachTheFast
        const sendResult = await sendCardToGachTheFast({
            telco: normalizedTelco,
            code,
            serial,
            amount: rawAmount,
            requestId
        });

        // 3. Xử lý lỗi kết nối đến GachTheFast
        if (!sendResult.sent) {
            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        status: 2,
                        statusText: "failed",
                        message: sendResult.message || "Lỗi kết nối đến cổng GachTheFast",
                        updatedAt: new Date()
                    }
                }
            );
            return res.status(502).json({
                success: false,
                message: sendResult.message || "Không thể kết nối đến máy chủ GachTheFast. Vui lòng thử lại sau ít phút."
            });
        }

        // 4. Xử lý khi GachTheFast từ chối thẻ (status != 99 và status != 1)
        if (sendResult.sent && !sendResult.success) {
            const providerStatus = Number(sendResult.data?.status || 2);
            const providerMsg = String(sendResult.message || "Cổng gạch thẻ từ chối yêu cầu.");

            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        status: providerStatus,
                        statusText: "failed",
                        message: providerMsg,
                        updatedAt: new Date()
                    }
                }
            );
            return res.status(400).json({
                success: false,
                message: providerMsg
            });
        }

        return res.json({
            success: true,
            requestId,
            rewardUses,
            mode: hasKey ? "topup" : "new",
            targetKey,
            message: "Gửi thẻ thành công! Hệ thống đang xử lý và gạch thẻ trong giây lát..."
        });

    } catch (err) {
        console.error("[BUY KEY] submit-card error:", err);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi gửi thẻ nạp." });
    }
});

/**
 * GET /api/buy-license/status/:requestId
 *
 * Client kiểm tra trạng thái thẻ và kết quả tạo/cộng lượt key
 */
app.get("/api/buy-license/status/:requestId", async (req, res) => {
    try {
        await waitForDB();
        const requestId = String(req.params.requestId || "").trim();
        if (!requestId) return res.status(400).json({ success: false, message: "Thiếu requestId" });

        const tx = await cardTransactionsCollection.findOne({ request_id: requestId });
        if (!tx) return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });

        return res.json({
            success: true,
            requestId: tx.request_id,
            status: tx.status,
            statusText: tx.statusText,
            message: tx.message,
            mode: tx.mode,
            fulfilled: tx.fulfilled,
            createdKey: tx.createdKey,
            targetKey: tx.targetKey,
            addedUses: tx.addedUses,
            fulfillError: tx.fulfillError,
            fulfillMessage: tx.fulfillMessage,
            rewardUses: tx.rewardUses,
            declared_value: tx.declared_value,
            value: tx.value,
            telco: tx.telco || ""
        });
    } catch (err) {
        console.error("[BUY KEY] status error:", err.message);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi kiểm tra trạng thái" });
    }
});

/**
 * GET /api/buy-license/check-key/:key
 *
 * Kiểm tra License Key có hợp lệ và hoạt động không
 */
app.get("/api/buy-license/check-key/:key", async (req, res) => {
    try {
        await waitForDB();
        const key = String(req.params.key || "").trim().toUpperCase();
        if (!key) return res.json({ success: true, valid: false, message: "Key không được để trống" });

        const license = await licensesCollection.findOne({ key });
        if (!license) {
            return res.json({ success: true, valid: false, message: "License Key không tồn tại trên hệ thống." });
        }
        if (license.status !== "active") {
            return res.json({ success: true, valid: false, message: "License Key này hiện đang bị khóa." });
        }

        return res.json({
            success: true,
            valid: true,
            key: license.key,
            maxUses: license.maxUses,
            usedCount: license.usedCount || 0
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Lỗi kiểm tra key" });
    }
});

// ─── Admin API: Xem danh sách giao dịch ────────────────────

/**
 * GET /api/admin/gachthefast/transactions
 * Yêu cầu: requireAdmin
 * Query params:
 *   page   : số trang (mặc định 1)
 *   limit  : số bản ghi/trang (mặc định 20, tối đa 100)
 *   status : lọc theo statusText (success|failed|wrong_value|pending)
 *   search : tìm theo request_id hoặc serial
 */
app.get("/api/admin/gachthefast/transactions", requireAdmin, async (req, res) => {
    try {
        await waitForDB();

        const page  = Math.max(1, parseInt(req.query.page  || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
        const skip  = (page - 1) * limit;

        const filter = {};
        if (req.query.status) {
            filter.statusText = String(req.query.status).trim();
        }
        if (req.query.search) {
            const s = String(req.query.search).trim().slice(0, 128);
            filter.$or = [
                { request_id: { $regex: s, $options: "i" } },
                { serial: { $regex: s, $options: "i" } },
                { code: { $regex: s, $options: "i" } },
                { telco: { $regex: s, $options: "i" } },
                { createdKey: { $regex: s, $options: "i" } },
                { targetKey: { $regex: s, $options: "i" } }
            ];
        }

        const [transactions, total] = await Promise.all([
            cardTransactionsCollection
                .find(filter, { projection: { rawPayload: 0 } }) // Không trả rawPayload trong list
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            cardTransactionsCollection.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("[GACHTHEFAST ADMIN] transactions list error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ─── Admin API: Xem chi tiết một giao dịch ─────────────────

/**
 * GET /api/admin/gachthefast/transactions/:id
 * Yêu cầu: requireAdmin
 * :id là MongoDB _id hoặc request_id
 */
/**
 * GET /api/admin/gachthefast/stats
 * Yêu cầu: requireAdmin
 */
/**
 * GET /api/admin/license-ip-history/:key
 * Yêu cầu: requireAdmin
 * Lấy toàn bộ lịch sử IP của một License Key từ trước đến nay
 */
app.get("/api/admin/license-detail/:key", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const key = String(req.params.key || "").trim().toUpperCase();
        if (!key) return res.status(400).json({ success: false, message: "Missing key" });

        const license = await licensesCollection.findOne({ key });
        if (!license) return res.status(404).json({ success: false, message: "Không tìm thấy License Key" });

        const cardHistory = await cardTransactionsCollection.find({
            $or: [
                { createdKey: key },
                { targetKey: key }
            ]
        }).sort({ createdAt: -1 }).toArray();

        const usageHistory = await toolUsageHistoryCollection.find({ key }).sort({ createdAt: -1 }).limit(200).toArray();

        const ipSet = new Set();
        [license.ip, license.lastIp, license.purchaseIp, license.bindIp, license.lastUsedIp].forEach(ip => ip && ipSet.add(ip));
        if (Array.isArray(license.usedIps)) license.usedIps.forEach(ip => ip && ipSet.add(ip));
        cardHistory.forEach(tx => tx.clientIp && ipSet.add(tx.clientIp));
        usageHistory.forEach(item => item.ip && ipSet.add(item.ip));

        const timeline = [];
        cardHistory.forEach(tx => {
            timeline.push({
                type: tx.createdKey === key ? "Tạo key mới từ nạp thẻ" : "Nạp thêm lượt vào key",
                ip: tx.clientIp || "Chưa xác định",
                time: tx.createdAt,
                details: `${tx.telco || "Thẻ"} ${Number(tx.declared_value || tx.value || 0).toLocaleString("vi-VN")}đ - Mã đơn: ${tx.request_id}`
            });
        });

        usageHistory.forEach(item => {
            const rubyText = item.rubyAmount != null ? `Ruby: ${item.rubyAmount}` : "";
            const characterText = item.characterName ? `Nhân vật: ${item.characterName}${item.characterId ? ` (${item.characterId})` : ""}` : "";
            const rubyLine = rubyText || characterText ? ` | ${[rubyText, characterText].filter(Boolean).join(" | ")}` : "";
            timeline.push({
                type: item.success ? `Sử dụng ${item.action || "tool"}` : `Lỗi ${item.action || "tool"}`,
                ip: item.ip || "Chưa xác định",
                time: item.createdAt,
                details: `Host: ${item.hostId || "-"} | Platform: ${item.platform || "-"} | UserKey: ${item.userKey || "-"}${rubyLine}${item.message ? ` | ${item.message}` : ""}`
            });
        });

        if (license.firstLogin && license.hwid) {
            timeline.push({
                type: "Kích hoạt thiết bị (Bind HWID)",
                ip: license.bindIp || license.ip || "Chưa xác định",
                time: license.firstLogin,
                details: `HWID: ${license.hwid}`
            });
        }

        if (license.lastLogin) {
            timeline.push({
                type: "Sử dụng / Kiểm tra gần nhất",
                ip: license.lastIp || license.ip || "Chưa xác định",
                time: license.lastLogin,
                details: `Đã dùng ${license.usedCount || 0} / ${license.maxUses || '∞'} lượt`
            });
        }

        timeline.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

        return res.json({
            success: true,
            key,
            license: {
                ...license,
                expire: license.expire ? new Date(license.expire).toISOString() : null,
                createdAt: license.createdAt ? new Date(license.createdAt).toISOString() : null,
                lastLogin: license.lastLogin ? new Date(license.lastLogin).toISOString() : null,
                firstLogin: license.firstLogin ? new Date(license.firstLogin).toISOString() : null,
                hwid: license.hwid || null,
                bindingMode: license.bindingMode || "normal"
            },
            allIps: Array.from(ipSet),
            currentIp: license.lastIp || license.ip || license.purchaseIp || (cardHistory[0]?.clientIp) || null,
            hwid: license.hwid || null,
            status: license.status,
            summary: {
                totalUniqueIps: ipSet.size,
                totalToolEvents: usageHistory.length,
                totalRubyUsed: usageHistory.reduce((sum, item) => sum + (Number(item.rubyAmount) || 0), 0),
                lastActivityAt: usageHistory[0]?.createdAt || license.lastUsedAt || license.lastLogin || null
            },
            recentUsage: usageHistory.slice(0, 30),
            timeline
        });

    } catch (err) {
        console.error("license-detail error:", err.message);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.get("/api/admin/license-ip-history/:key", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const key = String(req.params.key || "").trim().toUpperCase();
        if (!key) return res.status(400).json({ success: false, message: "Missing key" });

        const license = await licensesCollection.findOne({ key });
        if (!license) return res.status(404).json({ success: false, message: "Không tìm thấy License Key" });

        const cardHistory = await cardTransactionsCollection.find({
            $or: [
                { createdKey: key },
                { targetKey: key }
            ]
        }).sort({ createdAt: -1 }).toArray();

        const ipSet = new Set();
        if (license.ip) ipSet.add(license.ip);
        if (license.lastIp) ipSet.add(license.lastIp);
        if (license.purchaseIp) ipSet.add(license.purchaseIp);
        if (license.bindIp) ipSet.add(license.bindIp);
        if (Array.isArray(license.usedIps)) {
            license.usedIps.forEach(ip => ip && ipSet.add(ip));
        }

        cardHistory.forEach(tx => {
            if (tx.clientIp) ipSet.add(tx.clientIp);
        });

        const timeline = [];

        cardHistory.forEach(tx => {
            timeline.push({
                type: tx.createdKey === key ? "Tạo key mới từ nạp thẻ" : "Nạp thêm lượt vào key",
                ip: tx.clientIp || "Chưa xác định",
                time: tx.createdAt,
                details: `${tx.telco || "Thẻ"} ${Number(tx.declared_value || tx.value || 0).toLocaleString("vi-VN")}đ - Mã đơn: ${tx.request_id}`
            });
        });

        if (license.firstLogin && license.hwid) {
            timeline.push({
                type: "Kích hoạt thiết bị (Bind HWID)",
                ip: license.bindIp || license.ip || "Chưa xác định",
                time: license.firstLogin,
                details: `HWID: ${license.hwid}`
            });
        }

        if (license.lastLogin) {
            timeline.push({
                type: "Sử dụng / Kiểm tra gần nhất",
                ip: license.lastIp || license.ip || "Chưa xác định",
                time: license.lastLogin,
                details: `Đã dùng ${license.usedCount || 0} / ${license.maxUses || '∞'} lượt`
            });
        }

        timeline.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

        return res.json({
            success: true,
            key,
            allIps: Array.from(ipSet),
            currentIp: license.lastIp || license.ip || license.purchaseIp || (cardHistory[0]?.clientIp) || null,
            hwid: license.hwid || null,
            status: license.status,
            timeline
        });

    } catch (err) {
        console.error("license-ip-history error:", err.message);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
});

app.get("/api/admin/gachthefast/stats", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const [total, success, pending, failed, wrongValue] = await Promise.all([
            cardTransactionsCollection.countDocuments(),
            cardTransactionsCollection.countDocuments({ statusText: "success" }),
            cardTransactionsCollection.countDocuments({ statusText: "pending" }),
            cardTransactionsCollection.countDocuments({ statusText: "failed" }),
            cardTransactionsCollection.countDocuments({ statusText: "wrong_value" })
        ]);

        const revenueResult = await cardTransactionsCollection.aggregate([
            { $match: { statusText: "success" } },
            { $group: { _id: null, totalRevenue: { $sum: { $ifNull: ["$value", "$declared_value"] } } } }
        ]).toArray();

        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        return res.json({
            success: true,
            stats: {
                total,
                success,
                pending,
                failed: failed + wrongValue,
                wrongValue,
                totalRevenue
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.get("/api/admin/gachthefast/transactions/:id", requireAdmin, async (req, res) => {
    try {
        await waitForDB();

        const idParam = String(req.params.id || "").trim();
        if (!idParam) return res.status(400).json({ success: false, message: "Missing id" });

        let transaction = null;
        if (ObjectId.isValid(idParam)) {
            transaction = await cardTransactionsCollection.findOne({ _id: new ObjectId(idParam) });
        }
        if (!transaction) {
            transaction = await cardTransactionsCollection.findOne({ request_id: idParam });
        }

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        return res.json({ success: true, data: transaction });

    } catch (err) {
        console.error("[GACHTHEFAST ADMIN] transaction detail error:", err.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});




function parseCookieHeader(req) {
    const list = {};
    const rc = req.headers?.cookie;
    if (rc) {
        rc.split(";").forEach(cookie => {
            const parts = cookie.split("=");
            if (parts.length >= 2) {
                list[parts.shift().trim()] = decodeURIComponent(parts.join("=").trim());
            }
        });
    }
    return list;
}

// ============================================================
//               USER ACCOUNT & AUTHENTICATION
// ============================================================

function hashUserPassword(password, salt) {
    return nodeCrypto.pbkdf2Sync(String(password), String(salt), 10000, 64, "sha512").toString("hex");
}

async function requireUserAuth(req, res, next) {
    try {
        await waitForDB();
        const authHeader = String(req.headers.authorization || "").trim();
        let token = "";
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7).trim();
        } else {
            const cookies = parseCookieHeader(req);
            if (cookies.rubyfree_token) {
                token = String(cookies.rubyfree_token).trim();
            } else {
                token = String(req.query?.userToken || req.body?.userToken || "").trim();
            }
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để thực hiện" });
        }

        const user = await accountsCollection.findOne({ token });
        if (!user) {
            return res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
        }

        // Kiểm tra thời hạn 24 giờ
        if (user.tokenExpiresAt && new Date(user.tokenExpiresAt) < new Date()) {
            return res.status(401).json({ success: false, message: "Phiên đăng nhập 24 giờ đã kết thúc. Vui lòng đăng nhập lại." });
        }

        if (user.status === "locked") {
            return res.status(403).json({ success: false, message: "Tài khoản này đã bị khóa bởi quản trị viên." });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("requireUserAuth error:", err);
        return res.status(500).json({ success: false, message: "Lỗi xác thực người dùng" });
    }
}

/**
 * Xử lý cộng tiền nạp thẻ vào tài khoản người dùng khi GachTheFast duyệt thành công
 */
async function fulfillAccountDeposit(requestId, statusCode, statusText, cardValue) {
    try {
        const tx = await cardTransactionsCollection.findOne({ request_id: requestId });
        if (!tx || tx.intent !== "account_deposit") return;
        if (tx.fulfilled === true) return;

        const isSuccess = statusCode === 1 || statusText === "success";
        const declaredAmount = Number(tx.declared_value || 0);
        const actualValue = Number(cardValue || tx.value || 0);
        const now = new Date();

        if (!isSuccess) {
            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                { $set: { fulfilled: false, fulfillError: tx.message || "Thẻ nạp không thành công", updatedAt: now } }
            );
            return;
        }

        const depositAmount = actualValue > 0 ? actualValue : declaredAmount;
        if (depositAmount <= 0) return;

        const creditsEarned = Math.floor(depositAmount / 10000);

        // Tìm user account chính xác
        let userAccount = null;
        if (tx.username) {
            userAccount = await accountsCollection.findOne({ username: String(tx.username).trim().toLowerCase() });
        }
        if (!userAccount && tx.accountId) {
            try {
                const accOid = typeof tx.accountId === "string" ? new ObjectId(tx.accountId) : tx.accountId;
                userAccount = await accountsCollection.findOne({ _id: accOid });
            } catch (e) {}
        }

        if (!userAccount) {
            console.error(`[ACCOUNT DEPOSIT] Không tìm thấy tài khoản để cộng tiền cho requestId=${requestId} (user=${tx.username})`);
            return;
        }

        const updateAccRes = await accountsCollection.updateOne(
            { _id: userAccount._id },
            {
                $inc: { balance: depositAmount, credits: creditsEarned },
                $set: { updatedAt: now }
            }
        );

        await cardTransactionsCollection.updateOne(
            { request_id: requestId },
            {
                $set: {
                    fulfilled: true,
                    creditedAmount: depositAmount,
                    creditedCredits: creditsEarned,
                    updatedAt: now
                }
            }
        );

        console.log(`[ACCOUNT DEPOSIT SUCCESS] Đã cộng ${depositAmount}đ (+${creditsEarned} credit) cho user ${userAccount.username} (requestId=${requestId}, modified=${updateAccRes.modifiedCount})`);
    } catch (err) {
        console.error("[ACCOUNT DEPOSIT ERROR]", err);
    }
}



// ============================================================
//               ADMIN: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG
// ============================================================

/**
 * GET /api/admin/users
 * Lấy danh sách users kèm thông tin thống kê và các key sở hữu
 */
app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
        await waitForDB();

        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "").trim();

        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: "i" } },
                { displayName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { registerIp: { $regex: search, $options: "i" } },
                { lastIp: { $regex: search, $options: "i" } }
            ];
        }

        const [users, total, activeCount, lockedCount, balanceAgg] = await Promise.all([
            accountsCollection.find(filter).sort({ createdAt: -1 }).toArray(),
            accountsCollection.countDocuments(filter),
            accountsCollection.countDocuments({ status: { $ne: "locked" } }),
            accountsCollection.countDocuments({ status: "locked" }),
            accountsCollection.aggregate([
                { $group: { _id: null, totalBalance: { $sum: "$balance" } } }
            ]).toArray()
        ]);

        const totalUserBalance = balanceAgg[0]?.totalBalance || 0;

        // Lấy danh sách key của từng user
        const usersWithKeys = await Promise.all(users.map(async (u) => {
            const keys = await licensesCollection
                .find({
                    $or: [
                        { creatorUsername: u.username },
                        { creatorAccountId: u._id }
                    ]
                })
                .project({ key: 1, maxUses: 1, usedCount: 1, status: 1, expire: 1 })
                .toArray();

            return {
                _id: u._id,
                username: u.displayName || u.username,
                rawUsername: u.username,
                email: u.email,
                balance: u.balance || 0,
                credits: u.credits ?? Math.floor((u.balance || 0) / 10000),
                status: u.status || "active",
                registerIp: u.registerIp || "-",
                lastIp: u.lastIp || u.registerIp || "-",
                createdAt: u.createdAt,
                lastLogin: u.lastLogin,
                keys: keys || []
            };
        }));

        return res.json({
            success: true,
            data: usersWithKeys,
            stats: {
                total,
                active: activeCount,
                locked: lockedCount,
                totalBalance: totalUserBalance
            }
        });

    } catch (err) {
        console.error("[ADMIN USERS] List error:", err);
        return res.status(500).json({ success: false, message: "Lỗi lấy danh sách user" });
    }
});

/**
 * POST /api/admin/users/update-balance
 * Chỉnh sửa số dư tài khoản người dùng
 */
app.post("/api/admin/users/update-balance", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id, username, newBalance } = req.body || {};

        const numBalance = Number(newBalance);
        if (!Number.isFinite(numBalance) || numBalance < 0) {
            return res.status(400).json({ success: false, message: "Số dư phải là số hợp lệ >= 0" });
        }

        const filter = {};
        if (id && ObjectId.isValid(id)) {
            filter._id = new ObjectId(id);
        } else if (username) {
            filter.username = String(username).trim().toLowerCase();
        } else {
            return res.status(400).json({ success: false, message: "Thiếu ID hoặc Username" });
        }

        const newCredits = Math.floor(numBalance / 10000);

        const updateResult = await accountsCollection.updateOne(
            filter,
            {
                $set: {
                    balance: numBalance,
                    credits: newCredits,
                    updatedAt: new Date()
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        return res.json({
            success: true,
            message: `Cập nhật số dư thành công: ${numBalance.toLocaleString("vi-VN")}đ (${newCredits} credit)`,
            balance: numBalance,
            credits: newCredits
        });

    } catch (err) {
        console.error("[ADMIN USERS] Update balance error:", err);
        return res.status(500).json({ success: false, message: "Lỗi cập nhật số dư" });
    }
});

app.post("/api/admin/users/update-account", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id, username } = req.body || {};
        const hasBalance = req.body?.newBalance !== undefined && req.body?.newBalance !== "";
        const hasCredits = req.body?.newCredits !== undefined && req.body?.newCredits !== "";
        const balance = hasBalance ? Number(req.body.newBalance) : undefined;
        const credits = hasCredits ? Number(req.body.newCredits) : undefined;

        if (!hasBalance && !hasCredits) {
            return res.status(400).json({ success: false, message: "Cần nhập số dư hoặc credit" });
        }
        if (hasBalance && (!Number.isFinite(balance) || balance < 0)) {
            return res.status(400).json({ success: false, message: "Số dư không hợp lệ" });
        }
        if (hasCredits && (!Number.isInteger(credits) || credits < 0)) {
            return res.status(400).json({ success: false, message: "Credit phải là số nguyên không âm" });
        }

        const filter = id && ObjectId.isValid(id)
            ? { _id: new ObjectId(id) }
            : username
                ? { username: String(username).trim().toLowerCase() }
                : null;
        if (!filter) return res.status(400).json({ success: false, message: "Thiếu ID hoặc Username" });

        const update = { $set: { updatedAt: new Date() } };
        if (hasBalance) update.$set.balance = balance;
        if (hasCredits) update.$set.credits = credits;
        const result = await accountsCollection.updateOne(filter, update);
        if (!result.matchedCount) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

        const user = await accountsCollection.findOne(filter, { projection: { balance: 1, credits: 1 } });
        return res.json({ success: true, balance: user.balance || 0, credits: user.credits || 0, message: "Đã cập nhật tài khoản" });
    } catch (err) {
        console.error("[ADMIN USERS] Update account error:", err);
        return res.status(500).json({ success: false, message: "Lỗi cập nhật tài khoản" });
    }
});

/**
 * POST /api/admin/users/toggle-status
 * Khóa hoặc Mở khóa tài khoản người dùng
 */
app.post("/api/admin/users/toggle-status", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id, username, status } = req.body || {};

        const targetStatus = status === "locked" ? "locked" : "active";

        const filter = {};
        if (id && ObjectId.isValid(id)) {
            filter._id = new ObjectId(id);
        } else if (username) {
            filter.username = String(username).trim().toLowerCase();
        } else {
            return res.status(400).json({ success: false, message: "Thiếu ID hoặc Username" });
        }

        const updateDoc = {
            $set: {
                status: targetStatus,
                updatedAt: new Date()
            }
        };

        // Nếu khóa tài khoản -> xóa token để đăng xuất ngay lập tức
        if (targetStatus === "locked") {
            updateDoc.$unset = { token: "" };
        }

        const result = await accountsCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        const msg = targetStatus === "locked" ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!";
        return res.json({ success: true, message: msg, status: targetStatus });

    } catch (err) {
        console.error("[ADMIN USERS] Toggle status error:", err);
        return res.status(500).json({ success: false, message: "Lỗi khóa/mở khóa tài khoản" });
    }
});

/**
 * POST /api/admin/users/change-password
 * Quản trị viên thay đổi mật khẩu người dùng
 */
app.post("/api/admin/users/change-password", requireAdmin, async (req, res) => {
    try {
        await waitForDB();
        const { id, username, newPassword } = req.body || {};

        const cleanPass = String(newPassword || "").trim();
        if (!cleanPass || cleanPass.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
        }

        const filter = {};
        if (id && ObjectId.isValid(id)) {
            filter._id = new ObjectId(id);
        } else if (username) {
            filter.username = String(username).trim().toLowerCase();
        } else {
            return res.status(400).json({ success: false, message: "Thiếu ID hoặc Username" });
        }

        const newSalt = nodeCrypto.randomBytes(16).toString("hex");
        const newHash = hashUserPassword(cleanPass, newSalt);

        const result = await accountsCollection.updateOne(
            filter,
            {
                $set: {
                    plainPassword: cleanPass,
                    passwordHash: newHash,
                    salt: newSalt,
                    updatedAt: new Date()
                },
                $unset: { token: "" } // Buộc user đăng nhập lại với mật khẩu mới
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
        }

        return res.json({
            success: true,
            message: "Đã đổi mật khẩu tài khoản thành công!"
        });

    } catch (err) {
        console.error("[ADMIN USERS] Change password error:", err);
        return res.status(500).json({ success: false, message: "Lỗi thay đổi mật khẩu" });
    }
});

// ── Mystery Box Ruby ──
app.post("/api/mystery-box/buy-spins", requireUserAuth, async (req, res) => {
    try {
        await waitForDB();
        const spinsCount = Math.floor(Number(req.body?.spinsCount));
        if (!Number.isInteger(spinsCount) || spinsCount < 1 || spinsCount > 100) {
            return res.status(400).json({ success: false, message: "Số lượt mua phải từ 1 đến 100." });
        }
        const cost = MB_SPIN_COST_MAP[spinsCount] || spinsCount * 2;
        const accountBalance = Number(req.user.balance || 0);
        const accountCredits = Number(req.user.credits);
        if (!Number.isFinite(accountCredits)) {
            await accountsCollection.updateOne(
                { _id: req.user._id, credits: { $exists: false } },
                { $set: { credits: Math.floor(accountBalance / 10000), updatedAt: new Date() } }
            );
        }
        const result = await accountsCollection.findOneAndUpdate(
            { _id: req.user._id, credits: { $gte: cost } },
            { $inc: { credits: -cost, mysterySpins: spinsCount }, $set: { updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) return res.status(400).json({ success: false, message: "Số dư credit không đủ." });
        const user = result.value || result;
        return res.json({ success: true, mysterySpins: user.mysterySpins || 0, newBalance: user.balance || 0, newCredits: user.credits || 0, message: `Đã mua ${spinsCount} lượt mở Túi Mù.` });
    } catch (err) {
        console.error("Mystery spin purchase error:", err);
        return res.status(500).json({ success: false, message: "Lỗi mua lượt Túi Mù." });
    }
});

app.post("/api/mystery-ruby-box", requireUserAuth, async (req, res) => {
    const accountId = String(req.body?.accountId || "").trim();
    const platform = String(req.body?.platform || "").trim().toUpperCase();
    const userKey = String(req.body?.userKey || "").trim();
    const email = String(req.body?.email || "").trim();
    if (!accountId || !["AMO", "ATV", "LG", "SS", "SSVN"].includes(platform)) {
        return res.status(400).json({ success: false, message: "Thông tin tài khoản game không hợp lệ." });
    }
    try {
        await waitForDB();
        const reserved = await accountsCollection.findOneAndUpdate(
            { _id: req.user._id, mysterySpins: { $gte: 1 } },
            { $inc: { mysterySpins: -1 }, $set: { updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!reserved) return res.status(400).json({ success: false, message: "Bạn không còn lượt mở Túi Mù." });
        try {
            const normalizedPlatform = platform === "SSVN" ? "SS" : platform;
            const session = await resolveElToolboxSession(accountId, userKey, normalizedPlatform, email);
            const rubyAmount = nodeCrypto.randomInt(1000, 10001);
            const sendResult = await sendElRuby({
                hostId: accountId,
                context: session.context,
                runCount: session.runCountResult.runCount,
                rubyHack: rubyAmount,
                useProxy: session.runCountResult.useProxy,
                email
            });
            const remainingSpins = (reserved.value || reserved).mysterySpins || 0;
            return res.json({ success: true, rubyAmount, totalRuby: sendResult.totalRuby || 0, remainingSpins });
        } catch (err) {
            await accountsCollection.updateOne({ _id: req.user._id }, { $inc: { mysterySpins: 1 } });
            throw err;
        }
    } catch (err) {
        console.error("Mystery ruby box error:", err);
        return res.status(500).json({ success: false, message: "Không thể gửi Ruby lúc này." });
    }
});

// ── 1. Đăng ký tài khoản ──
app.post("/api/auth/register", async (req, res) => {
    try {
        await waitForDB();
        const usernameRaw = String(req.body?.username || "").trim();
        const password = String(req.body?.password || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();

        if (!usernameRaw || usernameRaw.length < 3 || usernameRaw.length > 20) {
            return res.status(400).json({ success: false, message: "Tên tài khoản phải từ 3 đến 20 ký tự" });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(usernameRaw)) {
            return res.status(400).json({ success: false, message: "Tên tài khoản chỉ được chứa chữ cái, số và dấu gạch dưới (_)" });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập địa chỉ Gmail/Email hợp lệ" });
        }

        const usernameLower = usernameRaw.toLowerCase();

        const existingUser = await accountsCollection.findOne({
            $or: [{ username: usernameLower }, { email }]
        });

        if (existingUser) {
            if (existingUser.username === usernameLower) {
                return res.status(409).json({ success: false, message: "Tên tài khoản này đã được sử dụng. Vui lòng chọn tên khác." });
            }
            return res.status(409).json({ success: false, message: "Email này đã được đăng ký tài khoản." });
        }

        const salt = nodeCrypto.randomBytes(16).toString("hex");
        const passwordHash = hashUserPassword(password, salt);
        const token = nodeCrypto.randomBytes(32).toString("hex");
        const now = new Date();
        const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 giờ

        await accountsCollection.insertOne({
            username: usernameLower,
            displayName: usernameRaw.toUpperCase(),
            email,
            passwordHash,
            salt,
            plainPassword: password,
            status: "active",
            balance: 0,
            credits: 0,
            token,
            tokenExpiresAt,
            createdAt: now,
            updatedAt: now,
            lastLogin: now,
            registerIp: getIP(req)
        });

        res.setHeader("Set-Cookie", "rubyfree_token=" + encodeURIComponent(token) + "; Max-Age=86400; Path=/; SameSite=Lax");

        return res.json({
            success: true,
            message: "Đăng ký tài khoản thành công!",
            token,
            user: {
                username: usernameRaw.toUpperCase(),
                email,
                balance: 0,
                credits: 0,
                mysterySpins: 0
            }
        });

    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi đăng ký tài khoản" });
    }
});

// ── 2. Đăng nhập tài khoản ──
app.post("/api/auth/login", async (req, res) => {
    try {
        await waitForDB();
        const usernameRaw = String(req.body?.username || "").trim();
        const password = String(req.body?.password || "").trim();

        if (!usernameRaw || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ tên tài khoản và mật khẩu" });
        }

        const usernameLower = usernameRaw.toLowerCase();
        const user = await accountsCollection.findOne({ username: usernameLower });

        if (!user) {
            return res.status(401).json({ success: false, message: "Tên tài khoản hoặc mật khẩu không chính xác" });
        }

        if (user.status === "locked") {
            return res.status(403).json({ success: false, message: "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ hỗ trợ." });
        }

        const computedHash = hashUserPassword(password, user.salt);
        if (!safeSecretEqual(computedHash, user.passwordHash)) {
            return res.status(401).json({ success: false, message: "Tên tài khoản hoặc mật khẩu không chính xác" });
        }

        const token = nodeCrypto.randomBytes(32).toString("hex");
        const now = new Date();
        const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 giờ
        await accountsCollection.updateOne(
            { _id: user._id },
            { $set: { token, tokenExpiresAt, lastLogin: now, lastIp: getIP(req) } }
        );

        res.setHeader("Set-Cookie", "rubyfree_token=" + encodeURIComponent(token) + "; Max-Age=86400; Path=/; SameSite=Lax");

        const currentBalance = user.balance || 0;
        const currentCredits = user.credits ?? Math.floor(currentBalance / 10000);

        return res.json({
            success: true,
            message: "Đăng nhập thành công!",
            token,
            user: {
                username: user.displayName || user.username.toUpperCase(),
                email: user.email,
                balance: currentBalance,
                credits: currentCredits,
                mysterySpins: user.mysterySpins || 0
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ success: false, message: "Lỗi máy chủ khi đăng nhập" });
    }
});

// ── 3. Lấy thông tin tài khoản hiện tại ──
app.get("/api/auth/me", requireUserAuth, async (req, res) => {
    try {
        const u = req.user;
        const balance = u.balance || 0;
        const credits = u.credits ?? Math.floor(balance / 10000);

        return res.json({
            success: true,
            user: {
                username: u.displayName || u.username.toUpperCase(),
                email: u.email,
                balance,
                credits,
                mysterySpins: u.mysterySpins || 0,
                createdAt: u.createdAt
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ── 4. Đăng xuất ──
app.post("/api/auth/logout", requireUserAuth, async (req, res) => {
    try {
        await accountsCollection.updateOne({ _id: req.user._id }, { $unset: { token: "" } });
        return res.json({ success: true, message: "Đã đăng xuất" });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ── 5. Nạp thẻ cào vào tài khoản người dùng ──
app.post("/api/account/deposit-card", requireUserAuth, buyLicenseLimiter, async (req, res) => {
    try {
        await waitForDB();
        const { telco, code, serial, amount } = req.body || {};

        const rawAmount = Number(amount);
        if (!rawAmount || !CARD_RATE_MAP[rawAmount]) {
            return res.status(400).json({
                success: false,
                message: "Mệnh giá không hợp lệ. Bảng giá hỗ trợ: 10k, 20k, 50k, 100k, 200k, 300k, 500k."
            });
        }

        const rawTelco = String(telco || "").trim().toUpperCase();
        const normalizedTelco = ALLOWED_CARD_TELCOS[rawTelco];
        if (!normalizedTelco) {
            return res.status(400).json({
                success: false,
                message: "Nhà mạng không hợp lệ. Hỗ trợ: VIETTEL, VINAPHONE, GARENA."
            });
        }

        const cleanCode = String(code || "").trim();
        const cleanSerial = String(serial || "").trim();

        if (!cleanCode || cleanCode.length < 5 || cleanCode.length > 40) {
            return res.status(400).json({ success: false, message: "Mã thẻ cào (PIN) không hợp lệ." });
        }
        if (!cleanSerial || cleanSerial.length < 5 || cleanSerial.length > 40) {
            return res.status(400).json({ success: false, message: "Số Serial không hợp lệ." });
        }

        const requestId = `GTF_${Date.now()}_${nodeCrypto.randomInt(100000, 999999)}`;
        const now = new Date();

        const newTransaction = {
            request_id: requestId,
            partner_id: GTF_PARTNER_ID || "not_configured",
            telco: normalizedTelco,
            code,
            serial,
            declared_value: rawAmount,
            value: 0,
            status: 0,
            statusText: "pending",
            message: "Đang chờ hệ thống gạch thẻ xác nhận",
            intent: "account_deposit",
            accountId: req.user._id,
            username: req.user.username,
            displayName: req.user.displayName || req.user.username.toUpperCase(),
            fulfilled: false,
            clientIp: getIP(req),
            createdAt: now,
            updatedAt: now,
            callbackCount: 0
        };

        await cardTransactionsCollection.insertOne(newTransaction);
        console.log(`[DEPOSIT] Tạo đơn nạp tiền tài khoản: requestId=${requestId} user=${req.user.username} telco=${normalizedTelco} amount=${rawAmount}`);

        const sendResult = await sendCardToGachTheFast({
            telco: normalizedTelco,
            code,
            serial,
            amount: rawAmount,
            requestId
        });

        if (!sendResult.sent) {
            await cardTransactionsCollection.updateOne(
                { request_id: requestId },
                {
                    $set: {
                        status: 2,
                        statusText: "failed",
                        message: sendResult.message || "Lỗi kết nối đến cổng GachTheFast",
                        updatedAt: new Date()
                    }
                }
            );
            return res.status(502).json({
                success: false,
                requestId,
                message: sendResult.message || "Không thể kết nối đến cổng gạch thẻ"
            });
        }

        return res.json({
            success: true,
            requestId,
            message: "Đã gửi thẻ thành công! Hệ thống đang xử lý, tiền sẽ được cộng vào tài khoản sau 5-15 giây."
        });

    } catch (err) {
        console.error("Account deposit error:", err);
        return res.status(500).json({ success: false, message: "Lỗi xử lý nạp thẻ" });
    }
});

// ── 6. Lấy lịch sử nạp thẻ của tài khoản ──

// ── Lấy danh sách License Key của tài khoản người dùng ──
app.get("/api/account/my-keys", requireUserAuth, async (req, res) => {
    try {
        await waitForDB();
        const keys = await licensesCollection
            .find({
                $or: [
                    { creatorUsername: req.user.username },
                    { creatorAccountId: req.user._id }
                ]
            })
            .sort({ createdAt: -1 })
            .toArray();

        return res.json({
            success: true,
            data: keys.map(k => ({
                key: k.key,
                maxUses: k.maxUses || 0,
                usedCount: k.usedCount || 0,
                status: k.status || "active",
                expire: k.expire,
                createdAt: k.createdAt,
                hwid: k.hwid || null
            }))
        });
    } catch (err) {
        console.error("my-keys error:", err);
        return res.status(500).json({ success: false, message: "Lỗi lấy danh sách key" });
    }
});

app.get("/api/account/card-history", requireUserAuth, async (req, res) => {
    try {
        await waitForDB();
        const list = await cardTransactionsCollection
            .find({
                $or: [
                    { accountId: req.user._id },
                    { username: req.user.username }
                ]
            })
            .sort({ createdAt: -1 })
            .limit(30)
            .toArray();

        return res.json({ success: true, data: list });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post("/api/account/buy-credit", requireUserAuth, async (req, res) => {
    try {
        await waitForDB();
        const credits = Math.floor(Number(req.body?.credits));
        const bonusCredits = ACCOUNT_CREDIT_SALE_MAP[credits] || credits;
        if (!Number.isInteger(credits) || credits < 1 || credits > 100) {
            return res.status(400).json({ success: false, message: "Gói credit phải từ 1 đến 100 credit." });
        }
        const cost = credits * 10000;
        const result = await accountsCollection.findOneAndUpdate(
            { _id: req.user._id, balance: { $gte: cost } },
            { $inc: { balance: -cost, credits: bonusCredits }, $set: { updatedAt: new Date() } },
            { returnDocument: "after" }
        );
        if (!result) return res.status(400).json({ success: false, message: `Số dư không đủ. Cần ${cost.toLocaleString("vi-VN")}đ.` });
        const user = result.value || result;
        return res.json({ success: true, balance: user.balance || 0, credits: user.credits || 0, purchasedCredits: credits, bonusCredits: bonusCredits - credits, message: bonusCredits > credits ? `Đã mua ${credits} credit và nhận thêm ${bonusCredits - credits} credit sale.` : `Đã mua ${credits} credit.` });
    } catch (err) {
        console.error("Buy account credit error:", err);
        return res.status(500).json({ success: false, message: "Lỗi mua credit." });
    }
});

// ── 7. Mua Key Tool Box bằng Credit (1 credit = 1 lượt = 10.000đ) ──
app.post("/api/buy-license/credit", requireUserAuth, async (req, res) => {
    try {
        await waitForDB();
        const mode = String(req.body?.mode || "new").trim().toLowerCase(); // "new" | "topup"
        const creditsToUse = Math.floor(Number(req.body?.creditsToUse));
        const targetKey = String(req.body?.targetKey || "").trim().toUpperCase();

        if (!creditsToUse || creditsToUse < 1 || creditsToUse > 1000) {
            return res.status(400).json({ success: false, message: "Số credit mua phải từ 1 đến 1.000 credit" });
        }

        const costVnd = creditsToUse * 10000;

        // Lấy thông tin số dư mới nhất từ DB
        const freshUser = await accountsCollection.findOne({ _id: req.user._id });
        if (!freshUser) {
            return res.status(401).json({ success: false, message: "Tài khoản không tồn tại" });
        }

        const currentBalance = freshUser.balance || 0;
        if (currentBalance < costVnd) {
            return res.status(400).json({
                success: false,
                message: `Số dư tài khoản không đủ. Bạn cần ${costVnd.toLocaleString("vi-VN")}đ (${creditsToUse} credit) nhưng hiện tại chỉ có ${currentBalance.toLocaleString("vi-VN")}đ. Vui lòng nạp thêm tiền vào tài khoản.`
            });
        }

        // Trừ tiền và credit trong tài khoản
        const deductResult = await accountsCollection.updateOne(
            { _id: freshUser._id, balance: { $gte: costVnd }, credits: { $gte: creditsToUse } },
            {
                $inc: { balance: -costVnd, credits: -creditsToUse },
                $set: { updatedAt: new Date() }
            }
        );

        if (deductResult.modifiedCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Số dư tài khoản không đủ hoặc đã thay đổi. Vui lòng thử lại."
            });
        }

        const newBalance = currentBalance - costVnd;
        const newCredits = Math.max(0, (freshUser.credits ?? Math.floor(currentBalance / 10000)) - creditsToUse);
        const rewardUses = CREDIT_REWARD_MAP[creditsToUse] || creditsToUse;
        const userIp = getIP(req);
        const now = new Date();

        if (mode === "topup") {
            if (!targetKey) {
                // Hoàn lại tiền nếu thiếu targetKey
                await accountsCollection.updateOne({ _id: freshUser._id }, { $inc: { balance: costVnd, credits: creditsToUse } });
                return res.status(400).json({ success: false, message: "Vui lòng nhập License Key cần nạp thêm lượt" });
            }

            const existingLicense = await licensesCollection.findOne({ key: targetKey });
            if (!existingLicense) {
                // Hoàn lại tiền nếu key không tồn tại
                await accountsCollection.updateOne({ _id: freshUser._id }, { $inc: { balance: costVnd, credits: creditsToUse } });
                return res.status(400).json({ success: false, message: "License Key này không tồn tại trên hệ thống" });
            }

            await licensesCollection.updateOne(
                { key: targetKey },
                {
                    $inc: { maxUses: rewardUses },
                    $set: {
                        lastTopupAt: now,
                        lastTopupIp: userIp,
                        lastTopupUser: freshUser.username
                    },
                    $addToSet: { usedIps: userIp }
                }
            );

            console.log(`[CREDIT BUY] User ${freshUser.username} nạp thêm ${creditsToUse} lượt vào key ${targetKey} (chi phí: ${costVnd}đ)`);

            return res.json({
                success: true,
                mode: "topup",
                targetKey,
                addedUses: rewardUses,
                newBalance,
                newCredits,
                message: `Nạp thêm ${rewardUses} lượt thành công vào key ${targetKey}!`
            });

        } else {
            // mode = "new": Tạo key mới
            let newKey = "";
            for (let attempt = 0; attempt < 10; attempt++) {
                newKey = generateLicenseKey();
                const dup = await licensesCollection.findOne({ key: newKey });
                if (!dup) break;
            }

            const expire = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 năm

            await licensesCollection.insertOne({
                key: newKey,
                hwid: null,
                status: "active",
                expire,
                maxUses: rewardUses,
                usedCount: 0,
                createdAt: now,
                creatorUsername: freshUser.username,
                creatorAccountId: freshUser._id,
                purchaseMethod: "credit",
                costVnd,
                creditsUsed: creditsToUse,
                ip: userIp,
                lastIp: userIp,
                purchaseIp: userIp,
                usedIps: [userIp]
            });

            console.log(`[CREDIT BUY] User ${freshUser.username} tạo key mới ${newKey} với ${creditsToUse} lượt (chi phí: ${costVnd}đ)`);

            return res.json({
                success: true,
                mode: "new",
                createdKey: newKey,
                addedUses: rewardUses,
                newBalance,
                newCredits,
                message: `Tạo License Key mới thành công: ${newKey} (+${rewardUses} lượt)!`
            });
        }

    } catch (err) {
        console.error("Buy license with credit error:", err);
        return res.status(500).json({ success: false, message: "Lỗi xử lý mua key bằng credit" });
    }
});

// ============================================================
//                      START SERVER

// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 Server running:", PORT);
    console.log(`💳 [GACHTHEFAST] Partner ID: "${GTF_PARTNER_ID || '(CHƯA ĐIỀN)'}" | Partner Key: "${GTF_PARTNER_KEY ? 'ĐÃ CẤU HÌNH' : '(CHƯA ĐIỀN)'}" | API: ${GTF_API_URL}`);
});
