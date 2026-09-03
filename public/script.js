// ================= DEVICE ID =================
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("deviceId", deviceId);
}

// ================= TOAST SYSTEM (Thay thế alert/prompt) =================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}" style="font-size: 16px;"></i> <span>${escapeHtml(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

// ================= DỮ LIỆU BẢNG GIÁ =================
const ITEMS_PER_PAGE = 6;

const PRICE_DATA = {
    elDorado: [
        { name: "Key Tool Box El 5 Lần",       price: "50.000₫",     icon: "fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 10 Lần",      price: "100.000₫",    icon: "fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 30 Lần",      price: "200.000₫",    icon: "fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 50 Lần",      price: "300.000₫",    icon: "fa-ticket",          color: "#f59e0b" },
        { name: "Ruby x4.000",                 price: "50.000₫",     icon: "fa-gem",             color: "#fbbf24" },
        { name: "Ruby x10.000",                price: "100.000₫",    icon: "fa-gem",             color: "#fbbf24" },
        { name: "x1 Item A",                   price: "50.000₫",     icon: "fa-hammer",          color: "#fde68a" },
        { name: "x3 Item A",                   price: "120.000₫",    icon: "fa-hammer",          color: "#fde68a" },
        { name: "x1 Random 7s Level 100",      price: "20.000₫",     icon: "fa-user",            color: "#60a5fa" },
        { name: "x3 Random 7s Level 100",      price: "60.000₫",     icon: "fa-users",           color: "#a78bfa" },
        { name: "x1 Tự Chọn 7s Level 100",     price: "50.000₫",     icon: "fa-user",            color: "#10b981" },
        { name: "x3 Tự Chọn 7s Level 100",     price: "100.000₫",    icon: "fa-users",           color: "#059669" },
    ],
    gtd: [
        { name: "x50.000 Vỏ Sò",       price: "50.000₫",      icon: "fa-bolt",           color: "#3b82f6" },
        { name: "x120.000 Vỏ Sò",      price: "100.000₫",     icon: "fa-bolt",           color: "#3b82f6" },
        { name: "x1.000 Magic",        price: "100.000₫",     icon: "fa-bolt",           color: "#60a5fa" },
        { name: "x10.000 Ruby",        price: "100.000₫",     icon: "fa-bolt",           color: "#60a5fa" },
        { name: "100.000 Diamond",     price: "100.000₫",     icon: "fa-bolt",           color: "#2563eb" },
    ]
};

let elDoradoPage = 1;
let gtdPage = 1;

// ================= RENDER BẢNG GIÁ =================
function renderPriceGrid(data, page, gridId, paginationId, type) {
    const grid = document.getElementById(gridId);
    const pagination = document.getElementById(paginationId);
    if (!grid || !pagination) return;

    const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const start = (page - 1) * ITEMS_PER_PAGE;
    const items = data.slice(start, start + ITEMS_PER_PAGE);

    if (!items.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">Không có dữ liệu</div>`;
    } else {
        grid.innerHTML = items.map(item => {
            const isAutoKey = item.name.toLowerCase().includes("key tool box") || item.name.toLowerCase().includes("license");
            return `
                <div class="price-card" style="--accent:${item.color};">
                    <div class="price-card-icon"><i class="fa-solid ${item.icon}"></i></div>
                    <div class="price-card-name">${escapeHtml(item.name)}</div>
                    <div class="price-card-price">${item.price}</div>
                    <button class="price-card-btn" onclick="handlePriceBuy('${item.name.replace(/'/g, "\\'")}', '${item.price}')">
                        ${isAutoKey ? '<i class="fa-solid fa-bolt"></i> Mua Tự Động' : '<i class="fa-brands fa-discord"></i> Mua'}
                    </button>
                </div>
            `;
        }).join('');
    }

    let dotsHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        dotsHTML += `<div class="page-dot ${i === page ? 'active' : ''}" onclick="goToPage('${type}', ${i})"></div>`;
    }

    pagination.innerHTML = `
        <button class="page-btn" onclick="changePage('${type}', -1)" ${page === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="page-info">Trang ${page} / ${totalPages}</div>
        <div class="page-dots">${dotsHTML}</div>
        <button class="page-btn" onclick="changePage('${type}', 1)" ${page === totalPages ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
}

function changePage(type, delta) {
    if (type === 'elDorado') {
        elDoradoPage += delta;
        renderPriceGrid(PRICE_DATA.elDorado, elDoradoPage, 'priceGrid', 'pricePagination', 'elDorado');
    } else if (type === 'gtd') {
        gtdPage += delta;
        renderPriceGrid(PRICE_DATA.gtd, gtdPage, 'gtdPriceGrid', 'gtdPricePagination', 'gtd');
    }
}

function goToPage(type, page) {
    if (type === 'elDorado') {
        elDoradoPage = page;
        renderPriceGrid(PRICE_DATA.elDorado, elDoradoPage, 'priceGrid', 'pricePagination', 'elDorado');
    } else if (type === 'gtd') {
        gtdPage = page;
        renderPriceGrid(PRICE_DATA.gtd, gtdPage, 'gtdPriceGrid', 'gtdPricePagination', 'gtd');
    }
}

function handlePriceBuy(name, price) {
    const lowerName = (name || "").toLowerCase();
    if (lowerName.includes("key tool box") || lowerName.includes("license")) {
        closePrice(); closeGTDPrice();
        openBuyKeyModal();
        if (lowerName.includes("5 lần") || price.includes("50.000")) selectCreditPackage(5);
        else if (lowerName.includes("10 lần") || price.includes("100.000")) selectCreditPackage(10);
        else if (lowerName.includes("30 lần") || price.includes("200.000")) selectCreditPackage(20);
        else if (lowerName.includes("50 lần") || price.includes("300.000")) selectCreditPackage(30);
        else selectCreditPackage(1);
        return;
    }
    window.open("https://discord.com/users/1201014400350429284", "_blank");
}

// ================= NHẬN MÃ =================
function getReward() {
    if (window.__DEVTOOLS_BLOCKED__) return;
    const btn = document.getElementById("btnGetReward");
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo mã...</span>';

    fetch("/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            document.getElementById("code").innerText = data.code;
            document.getElementById("userCodeInput").value = data.code;
            document.getElementById("codeInputSection").style.display = "block";
            btn.style.display = "none";
            showToast("Đã tạo mã thành công!", "success");
        } else {
            showToast(data.message || "Không thể tạo mã", "error");
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-gift"></i> <span>Nhận Mã</span>';
        }
    })
    .catch(err => {
        showToast("Lỗi kết nối: " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-gift"></i> <span>Nhận Mã</span>';
    });
}

function submitCode() {
    const userId = document.getElementById("userIdInput").value.trim();
    const platform = document.getElementById("platformSelect").value;
    const userCode = document.getElementById("userCodeInput").value.trim();
    const displayedCode = document.getElementById("code").innerText;
    const lucyAnswer = document.getElementById("lucyAnswerInput").value.trim();
    const rubyAnswer = document.getElementById("rubyAnswerInput").value.trim();

    if (!userId) return showToast("Vui lòng nhập ID!", "error");
    if (!platform) return showToast("Vui lòng chọn nền tảng!", "error");
    if (!userCode) return showToast("Vui lòng nhập mã!", "error");
    if (!lucyAnswer) return showToast("Vui lòng trả lời câu hỏi Lâu Đài!", "error");
    if (!rubyAnswer) return showToast("Vui lòng trả lời số lượng Ruby!", "error");

    const btn = document.getElementById("btnSubmitCode");
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang gửi...</span>';

    fetch("/submit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            deviceId, userId, platform,
            userInputCode: userCode, systemCode: displayedCode,
            lucyAnswer, rubyAnswer, timestamp: new Date().toISOString()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast("Gửi mã thành công!", "success");
            document.getElementById("userIdInput").value = "";
            document.getElementById("platformSelect").value = "";
            document.getElementById("userCodeInput").value = "";
            document.getElementById("lucyAnswerInput").value = "";
            document.getElementById("rubyAnswerInput").value = "";
        } else {
            showToast(data.message || "Gửi thất bại", "error");
        }
    })
    .catch(err => showToast("Lỗi: " + err.message, "error"))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Gửi Mã</span>';
    });
}

// ================= MODAL OPEN/CLOSE =================
function openPrice() {
    elDoradoPage = 1;
    renderPriceGrid(PRICE_DATA.elDorado, elDoradoPage, 'priceGrid', 'pricePagination', 'elDorado');
    document.getElementById("priceModal").style.display = "flex";
}
function closePrice() { document.getElementById("priceModal").style.display = "none"; }

function openGTDPrice() {
    gtdPage = 1;
    renderPriceGrid(PRICE_DATA.gtd, gtdPage, 'gtdPriceGrid', 'gtdPricePagination', 'gtd');
    document.getElementById("gtdPriceModal").style.display = "flex";
}
function closeGTDPrice() { document.getElementById("gtdPriceModal").style.display = "none"; }

// ================= TOOLBOX EL DORADO =================
const EL_DORADO_HWID_KEY = "elDoradoToolboxHwid";
const EL_DORADO_CHARACTER_IDS = new Set([63, 66, 67, 68, 49, 50, 64, 65, 48, 56, 62, 75, 81, 99]);

function getElDoradoHwid() {
    let hwid = localStorage.getItem(EL_DORADO_HWID_KEY);
    if (!hwid) {
        hwid = `WEB-EL-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem(EL_DORADO_HWID_KEY, hwid);
    }
    return hwid;
}

function openElDoradoToolbox() {
    setElDoradoStatus("");
    updateElDoradoToolboxMode();
    resetToolboxSteps();
    document.getElementById("elDoradoToolboxModal").style.display = "flex";
}

function closeElDoradoToolbox() {
    document.getElementById("elDoradoToolboxModal").style.display = "none";
}

function setElDoradoStatus(message, type = "") {
    const status = document.getElementById("elDoradoToolboxStatus");
    if (!status) return;
    status.textContent = message;
    status.className = `toolbox-status${type ? ` is-${type}` : ""}`;
}

function resetToolboxSteps() {
    ["step1", "step2", "step3", "step4"].forEach(id => {
        document.getElementById(id)?.classList.remove("is-active", "is-done", "is-error");
    });
    document.getElementById("step1")?.classList.add("is-active");
}

function setToolboxStep(stepNum, state) {
    const step = document.getElementById("step" + stepNum);
    if (!step) return;
    step.classList.remove("is-active", "is-done", "is-error");
    if (state) step.classList.add("is-" + state);
}

function updateElDoradoToolboxMode() {
    const action = document.getElementById("elToolboxActionSelect")?.value || "ruby";
    const isFeature13 = action === "feature13";
    const isFeature11 = action === "feature11";
    const isCharacterFeature = isFeature11 || isFeature13;

    const rubyGroup = document.getElementById("elRubyAmountGroup");
    if (rubyGroup) rubyGroup.style.display = isCharacterFeature ? "none" : "";

    document.querySelectorAll("[data-el-feature13]").forEach(el => el.style.display = isFeature13 ? "" : "none");
    document.querySelectorAll("[data-el-character-feature]").forEach(el => el.style.display = isCharacterFeature ? "" : "none");

    const sendLabel = document.getElementById("elStepSendLabel");
    if (sendLabel) {
        sendLabel.textContent = isFeature13 ? "Gửi 7s (5 lượt)" : isFeature11 ? "Random 7s (2 lượt)" : "Bắt đầu gửi Ruby (1 lượt)";
    }
}

async function submitElDoradoToolbox(event) {
    event.preventDefault();

    const hostId = document.getElementById("elHostIdInput").value.trim();
    const platform = document.getElementById("elPlatformSelect").value.trim().toUpperCase();
    const userKey = document.getElementById("elUserKeyInput").value.trim();
    const action = document.getElementById("elToolboxActionSelect").value;
    const isFeature13 = action === "feature13";
    const isFeature11 = action === "feature11";
    const isCharacterFeature = isFeature11 || isFeature13;
    const rubyAmount = Number(document.getElementById("elRubyAmountInput").value);
    const characterId = Number(document.getElementById("elCharacterIdInput").value);
    const key = document.getElementById("elLicenseKeyInput").value.trim().toUpperCase();
    const submitBtn = document.getElementById("elDoradoSubmitBtn");

    if (!hostId) return setElDoradoStatus("Vui lòng nhập ID.", "error");
    if (!platform) return setElDoradoStatus("Vui lòng chọn Platform.", "error");
    if (action === "ruby" && (!Number.isInteger(rubyAmount) || rubyAmount < 1 || rubyAmount > 5000)) {
        return setElDoradoStatus("Số Ruby phải từ 1 đến 5.000.", "error");
    }
    if (isFeature13 && !EL_DORADO_CHARACTER_IDS.has(characterId)) {
        return setElDoradoStatus("Nhân vật không thuộc danh sách hỗ trợ.", "error");
    }
    if (!key) return setElDoradoStatus("Vui lòng nhập License Key.", "error");

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xử lý...</span>';

    try {
        setToolboxStep(1, "done"); setToolboxStep(2, "active");
        setElDoradoStatus("Đang xác thực bảo mật...", "loading");

        const payload = { key, hwid: getElDoradoHwid(), accountId: hostId, platform, userKey, action };
        if (isCharacterFeature) {
            payload.characterLevel = 100; payload.characterMaxLevel = 100;
            if (isFeature13) payload.characterId = characterId;
        } else {
            payload.amount = rubyAmount;
        }

        const response = await fetch("/api/el-dorado/toolbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok || !data.success) throw new Error(data.message || "Xử lý thất bại");

        setToolboxStep(2, "done"); setToolboxStep(3, "done"); setToolboxStep(4, "done");
        setElDoradoStatus("Thao tác thành công! " + (data.remaining ? `Còn ${data.remaining} lượt.` : ""), "success");
        showToast("Thao tác thành công!", "success");
    } catch (err) {
        setToolboxStep(2, "error");
        setElDoradoStatus("Lỗi: " + err.message, "error");
        showToast(err.message, "error");
    } finally {
        submitBtn.disabled = false;
        updateElDoradoToolboxMode();
    }
}

// ================= AUTH SESSION =================
const AUTH_TOKEN_KEY = "rubyfree_user_token";
const AUTH_USER_KEY = "rubyfree_user_cached";
let currentUser = null;

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function setAuthToken(token, userObj = null) {
    if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        if (userObj) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
    } else {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }
}

function initAuthSession() {
    const token = getAuthToken();
    if (!token) { updateTopNavUI(); return; }

    try {
        const cached = localStorage.getItem(AUTH_USER_KEY);
        if (cached) { currentUser = JSON.parse(cached); updateTopNavUI(); }
    } catch (e) {}
    checkAuthStatus();
}

async function checkAuthStatus() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch("/api/auth/me", { headers: { "Authorization": "Bearer " + token } });
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
            updateTopNavUI();
        } else if (res.status === 401 || res.status === 403) {
            setAuthToken(""); currentUser = null; updateTopNavUI();
        }
    } catch (e) {}
}

function updateTopNavUI() {
    const guestNav = document.getElementById("guestNav");
    const userNav = document.getElementById("userNav");

    if (currentUser) {
        if (guestNav) guestNav.style.display = "none";
        if (userNav) userNav.style.display = "flex";
        document.getElementById("userDisplayName").textContent = currentUser.username || "USER";
        
        const balance = Number(currentUser.balance || 0);
        const credits = Number(currentUser.credits ?? Math.floor(balance / 10000));
        
        document.getElementById("userBalanceText").textContent = balance.toLocaleString("vi-VN") + "đ";
        document.getElementById("userCreditsText").textContent = credits + " credit";
        document.getElementById("buyKeyCurrentCredits").textContent = credits;
    } else {
        if (guestNav) guestNav.style.display = "flex";
        if (userNav) userNav.style.display = "none";
    }
}

function openAuthModal(tab = "login") {
    document.getElementById("authModal").style.display = "flex";
    switchAuthTab(tab);
}
function closeAuthModal() { document.getElementById("authModal").style.display = "none"; }

function switchAuthTab(tab) {
    document.getElementById("tabBtnLogin")?.classList.toggle("is-active", tab === "login");
    document.getElementById("tabBtnRegister")?.classList.toggle("is-active", tab === "register");
    document.getElementById("loginForm").style.display = tab === "login" ? "block" : "none";
    document.getElementById("registerForm").style.display = tab === "register" ? "block" : "none";
}

async function submitLogin(e) {
    e.preventDefault();
    const username = document.getElementById("loginUsernameInput")?.value.trim();
    const password = document.getElementById("loginPasswordInput")?.value.trim();
    if (!username || !password) return;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
            setAuthToken(data.token, data.user);
            currentUser = data.user;
            updateTopNavUI();
            closeAuthModal();
            showToast("Đăng nhập thành công!", "success");
        } else {
            showToast(data.message || "Đăng nhập thất bại", "error");
        }
    } catch (err) {
        showToast("Lỗi kết nối máy chủ", "error");
    }
}

async function submitRegister(e) {
    e.preventDefault();
    const username = document.getElementById("regUsernameInput")?.value.trim();
    const email = document.getElementById("regEmailInput")?.value.trim();
    const password = document.getElementById("regPasswordInput")?.value.trim();
    const confirmPass = document.getElementById("regConfirmPasswordInput")?.value.trim();

    if (password !== confirmPass) return showToast("Mật khẩu không khớp!", "error");

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
            setAuthToken(data.token, data.user);
            currentUser = data.user;
            updateTopNavUI();
            closeAuthModal();
            showToast("Tạo tài khoản thành công!", "success");
        } else {
            showToast(data.message || "Đăng ký thất bại", "error");
        }
    } catch (err) {
        showToast("Lỗi kết nối máy chủ", "error");
    }
}

function handleLogout() {
    setAuthToken(""); currentUser = null; updateTopNavUI(); closeAccountModal();
    showToast("Đã đăng xuất tài khoản", "info");
}

// ================= BUY KEY SYSTEM =================
function openBuyKeyModal() {
    document.getElementById("buyKeyModal").style.display = "flex";
    updateTopNavUI();
}
function closeBuyKeyModal() { document.getElementById("buyKeyModal").style.display = "none"; }

function openAccountModal(tab = "info") {
    if (!currentUser) return openAuthModal("login");
    document.getElementById("accountModal").style.display = "flex";
    switchAccountTab(tab);
}
function closeAccountModal() { document.getElementById("accountModal").style.display = "none"; }

function switchAccountTab(tab) {
    document.getElementById("tabBtnAccInfo")?.classList.toggle("is-active", tab === "info");
    document.getElementById("tabBtnAccDeposit")?.classList.toggle("is-active", tab === "deposit");
    document.getElementById("tabBtnAccHistory")?.classList.toggle("is-active", tab === "history");

    document.getElementById("accTabInfo").style.display = tab === "info" ? "block" : "none";
    document.getElementById("accTabDeposit").style.display = tab === "deposit" ? "block" : "none";
    document.getElementById("accTabHistory").style.display = tab === "history" ? "block" : "none";
}

// Global Window Modal Closer
window.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
});

// POPUP ANNOUNCEMENT
function closePopup() { document.getElementById("updatePopup").style.display = "none"; }
function hideFor2Hours() {
    localStorage.setItem("popup_hidden_until", Date.now() + 2 * 60 * 60 * 1000);
    closePopup();
}

document.addEventListener("DOMContentLoaded", () => {
    initAuthSession();
    const hiddenUntil = localStorage.getItem("popup_hidden_until");
    if (!hiddenUntil || Date.now() > hiddenUntil) {
        document.getElementById("updatePopup").style.display = "flex";
    }
});
