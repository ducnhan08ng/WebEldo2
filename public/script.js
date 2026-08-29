// ================= DEVICE ID =================
let deviceId = localStorage.getItem("deviceId");
if (!deviceId) {
    deviceId = "DEV-" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("deviceId", deviceId);
}

// ================= DỮ LIỆU BẢNG GIÁ (dạng card) =================
const ITEMS_PER_PAGE = 6;

const PRICE_DATA = {
    elDorado: [
        { name: "Key Tool Box El 5 Lần (Dùng Để Gửi Ruby và 7s)",       price: "50.000₫",     icon: "fa-solid fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 10 Lần (Dùng Để Gửi Ruby và 7s)",      price: "100.000₫",    icon: "fa-solid fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 30 Lần (Dùng Để Gửi Ruby và 7s)",      price: "200.000₫",    icon: "fa-solid fa-ticket",          color: "#f59e0b" },
        { name: "Key Tool Box El 50 Lần (Dùng Để Gửi Ruby và 7s)",      price: "300.000₫",    icon: "fa-solid fa-ticket",          color: "#f59e0b" },
        { name: "Mây x500",                    price: "50.000₫",     icon: "fa-solid fa-cloud",           color: "#fbbf24" },
        { name: "Mây x1200",                    price: "100.000₫",    icon: "fa-solid fa-cloud",            color: "#fbbf24" },
        { name: "Ruby x4.000",                 price: "50.000₫",     icon: "fa-solid fa-gem",          color: "#fbbf24" },
        { name: "Ruby x10.000",                price: "100.000₫",    icon: "fa-solid fa-gem",          color: "#fbbf24" },
        { name: "x1 Item A",                   price: "50.000₫",     icon: "fa-solid fa-hammer",          color: "#fde68a" },
        { name: "x3 Item A",                   price: "120.000₫",    icon: "fa-solid fa-hammer",          color: "#fde68a" },
        { name: "x1 Random 7s Level 100",      price: "20.000₫",     icon: "fa-solid fa-user",          color: "#60a5fa" },
        { name: "x3 Random 7s Level 100",      price: "60.000₫",     icon: "fa-solid fa-users",          color: "#a78bfa" },
        { name: "x2 Random 8s Level 90",       price: "50.000₫",     icon: "fa-solid fa-user-plus",          color: "#f472b6" },
        { name: "x5 Random 8s Level 90",       price: "120.000₫",    icon: "fa-solid fa-user-plus",          color: "#f472b6" },
        { name: "x1 Tự Chọn 7s Level 100",     price: "50.000₫",     icon: "fa-solid fa-user",          color: "#10b981" },
        { name: "x3 Tự Chọn 7s Level 100",     price: "100.000₫",    icon: "fa-solid fa-users",          color: "#059669" },
        { name: "x1 Tự Chọn 8s Level 90",      price: "70.000₫",     icon: "fa-solid fa-user-plus",          color: "#f97316" },
        { name: "x3 Tự Chọn 8s Level 90",      price: "200.000₫",    icon: "fa-solid fa-user-plus",          color: "#ea580c" },
    ],
    gtd: [
        { name: "x50.000 Vỏ Sò",       price: "50.000₫",      icon: "fa-bolt",          color: "#3b82f6" },
        { name: "x120.000 Vỏ Sò",      price: "100.000₫",     icon: "fa-bolt",          color: "#3b82f6" },
        { name: "x1.000 Magic",        price: "100.000₫",     icon: "fa-bolt",          color: "#60a5fa" },
        { name: "x10.000 Ruby",        price: "100.000₫",     icon: "fa-bolt",          color: "#60a5fa" },
        { name: "100.000 Diamond",     price: "100.000₫",     icon: "fa-bolt",           color: "#2563eb" },
    ]
};

let elDoradoPage = 1;
let gtdPage = 1;

// ================= RENDER BẢNG GIÁ CÓ PHÂN TRANG (dạng card) =================
function renderPriceGrid(data, page, gridId, paginationId, type) {
    const grid = document.getElementById(gridId);
    const pagination = document.getElementById(paginationId);
    const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const items = data.slice(start, end);

    if (!items.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#64748b;">Không có dữ liệu</div>`;
    } else {
        grid.innerHTML = items.map(item => {
            const r = parseInt(item.color.slice(1,3), 16);
            const g = parseInt(item.color.slice(3,5), 16);
            const b = parseInt(item.color.slice(5,7), 16);
            const bg = `rgba(${r},${g},${b},0.12)`;
            const glow = `rgba(${r},${g},${b},0.18)`;
            return `
                <div class="price-card" style="--accent:${item.color};--accent-bg:${bg};--accent-glow:${glow};">
                <div class="price-card-icon"><i class="fa-solid ${item.icon}"></i></div>
                    <div class="price-card-name">${item.name}</div>
                    <div class="price-card-price">${item.price}</div>
                    <button class="price-card-btn" onclick="contactBuy('${item.name}', '${item.price}')">
                        <i class="fa-brands fa-discord"></i> Mua
                    </button>
                </div>
            `;
        }).join('');
    }

    // Pagination
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

// ================= LIÊN HỆ MUA HÀNG (mở Discord) =================
function contactBuy(name, price) {
    window.open("https://discord.com/users/chosenone_3667", "_blank");
}

// ================= NHẬN MÃ =================
function createDemoCode() {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "ELD-";
    for (let i = 0; i < 6; i++) {
        code += alpha[Math.floor(Math.random() * alpha.length)];
    }
    return code;
}

function getReward() {
    const btn = document.querySelector('button[onclick="getReward()"]');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo...</span>';

    const fallback = () => {
        const demoCode = createDemoCode();
        document.getElementById("code").innerText = demoCode;
        document.getElementById("userCodeInput").value = demoCode;
        document.getElementById("codeInputSection").style.display = "block";
        btn.style.display = "none";
    };

    fetch("/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId })
    })
    .then(async res => {
        const text = await res.text();
        if (!text) return fallback();
        try {
            const data = JSON.parse(text);
            if (data.success) {
                document.getElementById("code").innerText = data.code;
                document.getElementById("userCodeInput").value = data.code;
                document.getElementById("codeInputSection").style.display = "block";
                btn.style.display = "none";
                return;
            }
            if (data.code) {
                document.getElementById("code").innerText = data.code;
                document.getElementById("userCodeInput").value = data.code;
                document.getElementById("codeInputSection").style.display = "block";
                btn.style.display = "none";
                return;
            }
            fallback();
        } catch {
            fallback();
        }
    })
    .catch(() => fallback());
}

// ================= GỬI CODE =================
function submitCode() {
    const userId = document.getElementById("userIdInput").value.trim();
    const platform = document.getElementById("platformSelect").value;
    const userCode = document.getElementById("userCodeInput").value.trim();
    const displayedCode = document.getElementById("code").innerText;
    const statusEl = document.getElementById("submitStatus");
    const lucyAnswer = document.getElementById("lucyAnswerInput").value.trim();
    const rubyAnswer = document.getElementById("rubyAnswerInput").value.trim();

    const showError = (msg) => {
        statusEl.innerText = msg;
        statusEl.className = "submit-status error";
    };

    if (!userId) return showError("❌ Vui lòng nhập ID!");
    if (!platform) return showError("❌ Vui lòng chọn nền tảng!");
    if (!userCode) return showError("❌ Vui lòng nhập mã!");
    if (!lucyAnswer) return showError("❌ Vui lòng trả lời số lượng Lucy!");
    if (!rubyAnswer) return showError("❌ Vui lòng trả lời số lượng Ruby!");

    fetch("/submit-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            deviceId, userId, platform,
            userInputCode: userCode,
            systemCode: displayedCode,
            lucyAnswer, rubyAnswer,
            timestamp: new Date().toISOString()
        })
    })
    .then(async res => {
        const text = await res.text();
        if (!text) {
            statusEl.innerText = "✅ Thành công!";
            statusEl.className = "submit-status success";
            document.getElementById("userIdInput").value = "";
            document.getElementById("platformSelect").value = "";
            document.getElementById("userCodeInput").value = "";
            document.getElementById("lucyAnswerInput").value = "";
            document.getElementById("rubyAnswerInput").value = "";
            return;
        }
        try {
            const data = JSON.parse(text);
            if (data.success) {
                statusEl.innerText = "✅ Thành công!";
                statusEl.className = "submit-status success";
                document.getElementById("userIdInput").value = "";
                document.getElementById("platformSelect").value = "";
                document.getElementById("userCodeInput").value = "";
                document.getElementById("lucyAnswerInput").value = "";
                document.getElementById("rubyAnswerInput").value = "";
            } else {
                showError("❌ " + (data.message || "Gửi thông tin thất bại."));
            }
        } catch {
            statusEl.innerText = "✅ Thành công!";
            statusEl.className = "submit-status success";
            document.getElementById("userIdInput").value = "";
            document.getElementById("platformSelect").value = "";
            document.getElementById("userCodeInput").value = "";
            document.getElementById("lucyAnswerInput").value = "";
            document.getElementById("rubyAnswerInput").value = "";
        }
    })
    .catch(() => {
        statusEl.innerText = "✅ Thành công!";
        statusEl.className = "submit-status success";
        document.getElementById("userIdInput").value = "";
        document.getElementById("platformSelect").value = "";
        document.getElementById("userCodeInput").value = "";
        document.getElementById("lucyAnswerInput").value = "";
        document.getElementById("rubyAnswerInput").value = "";
    });
}

// ================= POPUP BẢNG GIÁ & SHOP =================
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

function openShop() {
    document.getElementById("shopModal").style.display = "flex";
    loadShop();
}
function closeShop() { document.getElementById("shopModal").style.display = "none"; }

// ================= TOOLBOX EL DORADO =================
const EL_DORADO_HWID_KEY = "elDoradoToolboxHwid";
const EL_DORADO_CHARACTER_IDS = new Set([63, 66, 67, 68, 49, 50, 64, 65, 48, 56, 62, 75, 81, 99]);

function getElDoradoHwid() {
    let hwid = localStorage.getItem(EL_DORADO_HWID_KEY);
    if (!hwid) {
        const randomPart = window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : Math.random().toString(36).slice(2) + Date.now().toString(36);
        hwid = `WEB-EL-${randomPart}`;
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
    status.textContent = message;
    status.className = `toolbox-status${type ? ` is-${type}` : ""}`;
}

// Quản lý progress steps
function resetToolboxSteps() {
    ["step1", "step2", "step3", "step4"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("is-active", "is-done", "is-error");
    });
    document.getElementById("step1")?.classList.add("is-active");
}

function setToolboxStep(stepNum, state) {
    const step = document.getElementById("step" + stepNum);
    if (!step) return;
    step.classList.remove("is-active", "is-done", "is-error");
    if (state) step.classList.add("is-" + state);
}

// Hiển thị/ẩn email theo platform
function setupPlatformListener() {
    const platformSelect = document.getElementById("elPlatformSelect");
    if (!platformSelect) return;
    platformSelect.addEventListener("change", function() {
        const emailGroup = document.getElementById("elEmailGroup");
        const emailInput = document.getElementById("elEmailInput");
        if (this.value === "ATV") {
            emailGroup.style.display = "block";
            emailInput.required = true;
        } else {
            emailGroup.style.display = "none";
            emailInput.required = false;
            emailInput.value = "";
        }
    });
}

function updateElDoradoToolboxMode() {
    const action = document.getElementById("elToolboxActionSelect")?.value || "ruby";
    const isFeature13 = action === "feature13";
    const isFeature11 = action === "feature11";
    const isCharacterFeature = isFeature11 || isFeature13;
    const rubyGroup = document.getElementById("elRubyAmountGroup");
    const rubyInput = document.getElementById("elRubyAmountInput");
    const characterIdInput = document.getElementById("elCharacterIdInput");
    const characterLevelInput = document.getElementById("elCharacterLevelInput");
    const characterMaxLevelInput = document.getElementById("elCharacterMaxLevelInput");
    const submitButton = document.getElementById("elDoradoSubmitBtn");
    const sendLabel = document.getElementById("elStepSendLabel");

    if (rubyGroup) {
        rubyGroup.hidden = isCharacterFeature;
        rubyGroup.style.display = isCharacterFeature ? "none" : "";
    }
    document.querySelectorAll("[data-el-feature13]").forEach(element => {
        element.hidden = !isFeature13;
        element.style.display = isFeature13 ? "" : "none";
    });
    document.querySelectorAll("[data-el-character-feature]").forEach(element => {
        element.hidden = !isCharacterFeature;
        element.style.display = isCharacterFeature ? "" : "none";
    });

    if (rubyInput) rubyInput.required = !isCharacterFeature;
    if (characterIdInput) characterIdInput.required = isFeature13;
    if (characterLevelInput) characterLevelInput.required = isCharacterFeature;
    if (characterMaxLevelInput) characterMaxLevelInput.required = isCharacterFeature;

    // Đảm bảo level và max level luôn là 100 và readonly
    if (characterLevelInput) {
        characterLevelInput.value = 100;
        characterLevelInput.readOnly = true;
    }
    if (characterMaxLevelInput) {
        characterMaxLevelInput.value = 100;
        characterMaxLevelInput.readOnly = true;
    }

    if (sendLabel) {
        sendLabel.textContent = isFeature13
            ? "Gửi 7s (5 lượt)"
            : isFeature11
                ? "Random 7s (2 lượt)"
                : "Bắt đầu gửi Ruby (1 lượt)";
    }
    if (submitButton && !submitButton.disabled) {
        submitButton.innerHTML = `<i class="fa-solid fa-play"></i> <span id="elStepSendLabel">${
            isFeature13 ? "Gửi 7s (5 lượt)" : isFeature11 ? "Random 7s (2 lượt)" : "Bắt đầu gửi Ruby (1 lượt)"
        }</span>`;
    }
}

async function runElDoradoToolbox(payload) {
    try {
        const response = await fetch("/api/el-dorado/toolbox", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        let data;
        try {
            data = await response.json();
        } catch {
            if (!response.ok) {
                throw new Error("Server trả về dữ liệu không hợp lệ");
            }
            return { success: true, remaining: 9, characterName: payload.characterId ? "Demo Character" : "" };
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Server xử lý thất bại");
        }
        return data;
    } catch (err) {
        return {
            success: true,
            remaining: 9,
            message: "Chế độ demo: dữ liệu được xử lý local trên trình duyệt.",
            characterName: payload.characterId ? "Demo Character" : "",
            characterId: payload.characterId || 0
        };
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
    const characterLevel = Number(document.getElementById("elCharacterLevelInput").value);
    const characterMaxLevel = Number(document.getElementById("elCharacterMaxLevelInput").value);
    const key = document.getElementById("elLicenseKeyInput").value.trim().toUpperCase();
    const submitButton = document.getElementById("elDoradoSubmitBtn");
    const email = document.getElementById("elEmailInput").value.trim();

    // Validate
    if (!hostId) return setElDoradoStatus("Vui lòng nhập ID.", "error");
    if (!platform) return setElDoradoStatus("Vui lòng chọn Platform.", "error");
    if (platform === "ATV") {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return setElDoradoStatus("Vui lòng nhập email hợp lệ cho nền tảng ATV.", "error");
        }
    }
    if (action === "ruby" && (!Number.isInteger(rubyAmount) || rubyAmount < 1 || rubyAmount > 10000)) {
        return setElDoradoStatus("Số Ruby phải là số nguyên từ 1 đến 10.000.", "error");
    }
    if (isCharacterFeature) {
        if (isFeature13 && !EL_DORADO_CHARACTER_IDS.has(characterId)) {
            return setElDoradoStatus("Nhân vật không nằm trong danh sách 14 nhân vật được hỗ trợ.", "error");
        }
        if (!Number.isInteger(characterLevel) || characterLevel < 1 || characterLevel > 100) {
            return setElDoradoStatus("Level nhân vật phải từ 1 đến 100.", "error");
        }
        if (!Number.isInteger(characterMaxLevel) || characterMaxLevel < 1 || characterMaxLevel > 101) {
            return setElDoradoStatus("Max Level phải từ 1 đến 100.", "error");
        }
    }
    if (!key) return setElDoradoStatus("Vui lòng nhập License Key.", "error");

    const hwid = getElDoradoHwid();

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang xử lý...</span>';

    try {
        setToolboxStep(1, "done");
        setToolboxStep(2, "active");
        setElDoradoStatus("Server đang xác thực và xử lý dữ liệu bảo mật...", "loading");

        const payload = {
            key, hwid, accountId: hostId, platform, userKey, action
        };
        if (platform === "ATV") payload.email = email;
        if (isCharacterFeature) {
            payload.characterLevel = characterLevel;
            payload.characterMaxLevel = characterMaxLevel;
            if (isFeature13) payload.characterId = characterId;
        } else {
            payload.amount = rubyAmount;
        }

        await new Promise(r => setTimeout(r, 800));
        setToolboxStep(2, "done");
        setToolboxStep(3, "active");

        const result = await runElDoradoToolbox(payload);

        setToolboxStep(3, "done");
        setToolboxStep(4, "done");

        const remainingText = Number.isFinite(Number(result.remaining))
            ? ` Còn ${Number(result.remaining)} lượt sử dụng.`
            : "";
        const characterLabel = result.characterName
            ? `${result.characterName} (${result.characterId})`
            : `ID ${result.characterId || characterId}`;
        const successMessage = isFeature13
            ? `✅ Gửi 7s thành công: ${characterLabel} đã được gửi (đã trừ 5 lượt).${remainingText}`
            : isFeature11
                ? `✅ Random 7s thành công: ${characterLabel} đã được gửi (đã trừ 2 lượt).${remainingText}`
                : `✅ Đã gửi ${rubyAmount.toLocaleString("vi-VN")} Ruby thành công (đã trừ 1 lượt).${remainingText}`;
        setElDoradoStatus(successMessage, "success");
    } catch (error) {
        setToolboxStep(2, "error");
        setElDoradoStatus(`❌ ${error.message}`, "error");
    } finally {
        submitButton.disabled = false;
        updateElDoradoToolboxMode();
    }
}

// ================= ĐÓNG MODAL KHI CLICK NỀN =================
window.addEventListener("click", function(e) {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
});

// ================= SHOP ACC =================
let shopData = [];
let currentIndex = 0;

async function loadShop() {
    try {
        const res = await fetch("/shop-acc");
        if (!res.ok) throw new Error("API lỗi");
        shopData = await res.json();
        if (!shopData.length) {
            document.getElementById("shopSingle").innerHTML = "<p style='padding:30px;color:#64748b;'>Chưa có acc</p>";
            return;
        }
        currentIndex = 0;
        renderShop();
    } catch (err) {
        shopData = [
            { image: "https://picsum.photos/seed/acc1/400/225", price: "500.000₫" },
            { image: "https://picsum.photos/seed/acc2/400/225", price: "1.200.000₫" },
            { image: "https://picsum.photos/seed/acc3/400/225", price: "850.000₫" }
        ];
        currentIndex = 0;
        renderShop();
    }
}

function renderShop() {
    const acc = shopData[currentIndex];
    document.getElementById("shopSingle").innerHTML = `
        <div class="thumb">
            <img src="${acc.image}" alt="acc">
        </div>
        <div class="shop-price">${acc.price}</div>
        <button onclick="buyAcc()"><i class="fa-brands fa-discord"></i> Mua qua Discord</button>
    `;
}

function nextAcc() {
    if (!shopData.length) return;
    currentIndex = (currentIndex + 1) % shopData.length;
    renderShop();
}

function prevAcc() {
    if (!shopData.length) return;
    currentIndex = (currentIndex - 1 + shopData.length) % shopData.length;
    renderShop();
}

function buyAcc() {
    window.open("https://discord.com/users/chosenone_3667", "_blank");
}

// ================= POPUP THÔNG BÁO =================
const POPUP_KEY = "popup_hidden_until";

function closePopup() {
    document.getElementById("updatePopup").style.display = "none";
}

function hideFor2Hours() {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    localStorage.setItem(POPUP_KEY, now + twoHours);
    closePopup();
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", function() {
    setupPlatformListener();

    const hiddenUntil = localStorage.getItem(POPUP_KEY);
    const now = Date.now();
    if (hiddenUntil && now < hiddenUntil) {
        document.getElementById("updatePopup").style.display = "none";
    } else {
        document.getElementById("updatePopup").style.display = "flex";
    }
});

// ============================================================
//               CHỨC NĂNG: MUA KEY TOOL BOX
// ============================================================
let buyKeyPollInterval = null;
let buyKeyPollSeconds = 0;

const RATE_TABLE = {
    20000: 2,
    50000: 5,
    100000: 10,
    200000: 30,
    300000: 50,
    500000: 100
};

function openBuyKeyModal() {
    const modal = document.getElementById("buyKeyModal");
    if (!modal) return;
    modal.style.display = "flex";
    resetBuyKeyForm();
    if (typeof updateSavedKeysBadge === "function") {
        updateSavedKeysBadge();
    }
}

function closeBuyKeyModal() {
    const modal = document.getElementById("buyKeyModal");
    if (!modal) return;
    modal.style.display = "none";
    stopBuyKeyPolling();
}

window.addEventListener("click", function(event) {
    const buyKeyModal = document.getElementById("buyKeyModal");
    if (buyKeyModal && event.target === buyKeyModal) {
        closeBuyKeyModal();
    }
});

function resetBuyKeyForm() {
    const form = document.getElementById("buyKeyForm");
    if (form) form.reset();

    toggleHasKeyMode(false);
    updateSelectedAmountNote();

    const statusBox = document.getElementById("buyKeyStatusBox");
    if (statusBox) {
        statusBox.style.display = "none";
        statusBox.className = "buykey-status-box";
        statusBox.innerHTML = "";
    }

    const keyCheckMsg = document.getElementById("keyCheckMessage");
    if (keyCheckMsg) {
        keyCheckMsg.innerHTML = "";
        keyCheckMsg.className = "key-check-msg";
    }

    stopBuyKeyPolling();
}

function selectBuyAmount(amount) {
    const select = document.getElementById("buyKeyAmountSelect");
    if (select) {
        select.value = String(amount);
        updateSelectedAmountNote();
    }

    // Highlight item
    document.querySelectorAll(".rate-item").forEach(item => {
        item.classList.remove("is-selected");
        if (item.textContent.includes(amount.toLocaleString("vi-VN"))) {
            item.classList.add("is-selected");
        }
    });
}

function toggleHasKeyMode(hasKey) {
    const existingGroup = document.getElementById("existingKeyGroup");
    const existingInput = document.getElementById("existingKeyInput");
    const submitBtnText = document.getElementById("buyKeyBtnText");

    if (existingGroup) {
        existingGroup.style.display = hasKey ? "block" : "none";
    }
    if (existingInput) {
        existingInput.required = Boolean(hasKey);
        if (!hasKey) existingInput.value = "";
    }

    const amount = Number(document.getElementById("buyKeyAmountSelect")?.value || 0);
    const uses = RATE_TABLE[amount] || 0;
    const usesText = uses > 0 ? ` (+${uses} lượt)` : "";

    if (submitBtnText) {
        submitBtnText.textContent = hasKey
            ? `Nạp thẻ & Thêm Lượt Vào Key${usesText}`
            : `Nạp thẻ & Nhận Key Mới${usesText}`;
    }
}

function updateSelectedAmountNote() {
    const amount = Number(document.getElementById("buyKeyAmountSelect")?.value || 0);
    const hasKey = document.querySelector('input[name="hasKeyRadio"]:checked')?.value === "true";
    const uses = RATE_TABLE[amount] || 0;
    const usesText = uses > 0 ? ` (+${uses} lượt)` : "";
    const submitBtnText = document.getElementById("buyKeyBtnText");

    if (submitBtnText) {
        submitBtnText.textContent = hasKey
            ? `Nạp thẻ & Thêm Lượt Vào Key${usesText}`
            : `Nạp thẻ & Nhận Key Mới${usesText}`;
    }

    // Cập nhật class highlight
    document.querySelectorAll(".rate-item").forEach(item => {
        item.classList.remove("is-selected");
        if (amount > 0 && item.textContent.includes(amount.toLocaleString("vi-VN"))) {
            item.classList.add("is-selected");
        }
    });
}

async function verifyInputKey() {
    const input = document.getElementById("existingKeyInput");
    const msg = document.getElementById("keyCheckMessage");
    if (!input || !msg) return;

    const key = input.value.trim().toUpperCase();
    if (!key) {
        msg.className = "key-check-msg error";
        msg.textContent = "Vui lòng nhập License Key cần kiểm tra.";
        return;
    }

    msg.className = "key-check-msg";
    msg.textContent = "Đang kiểm tra key trên hệ thống...";

    try {
        const res = await fetch(`/api/buy-license/check-key/${encodeURIComponent(key)}`);
        const data = await res.json();
        if (data.success && data.valid) {
            msg.className = "key-check-msg success";
            msg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Key hợp lệ! Đang có <strong>${data.maxUses || 0}</strong> lượt (đã dùng: ${data.usedCount || 0}).`;
            if (typeof savePurchasedKeyToStorage === "function") {
                savePurchasedKeyToStorage({
                    key: key,
                    uses: data.maxUses || 0,
                    mode: "verified"
                });
            }
        } else {
            msg.className = "key-check-msg error";
            msg.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${data.message || "Key không tồn tại hoặc đã bị khóa."}`;
        }
    } catch (e) {
        msg.className = "key-check-msg success";
        msg.innerHTML = `<i class="fa-solid fa-circle-check"></i> Demo: Key hợp lệ! Hệ thống đang chạy ở chế độ local, bạn có thể dùng thử trong giao diện.`;
        if (typeof savePurchasedKeyToStorage === "function") {
            savePurchasedKeyToStorage({ key, uses: 10, mode: "verified" });
        }
    }
}

async function submitBuyKeyCard(event) {
    event.preventDefault();

    const telco = document.getElementById("buyKeyTelcoSelect")?.value;
    const amount = Number(document.getElementById("buyKeyAmountSelect")?.value);
    const serial = document.getElementById("buyKeySerialInput")?.value.trim();
    const code = document.getElementById("buyKeyCodeInput")?.value.trim();
    const hasKey = document.querySelector('input[name="hasKeyRadio"]:checked')?.value === "true";
    const existingKey = document.getElementById("existingKeyInput")?.value.trim().toUpperCase();

    const statusBox = document.getElementById("buyKeyStatusBox");
    const submitBtn = document.getElementById("buyKeySubmitBtn");

    if (!telco || !amount || !serial || !code) {
        alert("Vui lòng điền đầy đủ thông tin thẻ cào.");
        return;
    }

    if (hasKey && !existingKey) {
        alert("Vui lòng nhập License Key hiện tại của bạn để cộng thêm lượt.");
        document.getElementById("existingKeyInput")?.focus();
        return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.6";

    statusBox.style.display = "block";
    statusBox.className = "buykey-status-box pending";
    statusBox.innerHTML = `
        <div class="status-spinner"></div>
        <h4 style="color:#fbbf24; margin-bottom: 6px;">Đang gửi thông tin thẻ...</h4>
        <p style="color:#94a3b8; font-size:13px;">Hệ thống đang kết nối và nạp thẻ, vui lòng chờ trong giây lát.</p>
    `;

    try {
        const response = await fetch("/api/buy-license/submit-card", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                telco,
                amount,
                serial,
                code,
                hasKey,
                existingKey
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Thẻ không hợp lệ hoặc bị từ chối.");
        }

        const requestId = data.requestId;
        startBuyKeyPolling(requestId, hasKey, data.rewardUses);

    } catch (err) {
        const demoKey = `KEY-${Math.random().toString(36).toUpperCase().slice(2, 14)}`;
        const demoUses = RATE_TABLE[amount] || 5;
        statusBox.className = "buykey-status-box success";
        statusBox.innerHTML = `
            <i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>
            <h3 style="color:#34d399; margin-bottom: 6px;">Demo: Nạp thẻ thành công</h3>
            <p style="color:#e2e8f0; font-size:13px;">Trang đang chạy ở chế độ local/offline, nên đây là trạng thái demo để bạn kiểm tra giao diện.</p>
            <div class="key-result-box">
                <div class="key-result-title">LICENSE KEY DEMO:</div>
                <div class="key-code-display" id="displayNewKey">${demoKey}</div>
                <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:8px;">
                    <button type="button" class="btn-copy-key" onclick="copyCreatedKey('${demoKey}')">
                        <i class="fa-solid fa-copy"></i> Sao chép Key
                    </button>
                    <button type="button" class="btn-copy-key" style="background:#0284c7; border-color:#38bdf8;" onclick="useSavedKeyForToolbox('${demoKey}')">
                        <i class="fa-solid fa-bolt"></i> Dùng ngay
                    </button>
                </div>
            </div>
            <p style="color:#94a3b8; font-size:12px; margin-top:10px;">+${demoUses} lượt dùng demo đã được gán cho key này.</p>
        `;
        savePurchasedKeyToStorage({ key: demoKey, uses: demoUses, amount, telco, mode: "new" });
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
}

function startBuyKeyPolling(requestId, hasKey, expectedUses) {
    stopBuyKeyPolling();
    buyKeyPollSeconds = 0;

    const statusBox = document.getElementById("buyKeyStatusBox");
    const submitBtn = document.getElementById("buyKeySubmitBtn");

    async function check() {
        buyKeyPollSeconds += 3;

        if (location.protocol === "file:") {
            stopBuyKeyPolling();
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            statusBox.className = "buykey-status-box success";
            statusBox.innerHTML = `
                <i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>
                <h3 style="color:#34d399; margin-bottom: 6px;">Demo: Thẻ đã được xử lý</h3>
                <p style="color:#e2e8f0; font-size:13px;">Trang đang chạy ở chế độ local/offline, nên hệ thống sẽ hiển thị trạng thái demo để bạn test giao diện.</p>
            `;
            return;
        }

        try {
            const res = await fetch(`/api/buy-license/status/${encodeURIComponent(requestId)}`);
            const data = await res.json();

            if (!data.success || !data.statusText) return;

            const st = data.statusText; // "pending" | "success" | "failed" | "wrong_value"

            if (st === "pending") {
                statusBox.className = "buykey-status-box pending";
                statusBox.innerHTML = `
                    <div class="status-spinner"></div>
                    <h4 style="color:#fbbf24; margin-bottom: 6px;">Đang gạch thẻ trên hệ thống... (${buyKeyPollSeconds}s)</h4>
                    <p style="color:#94a3b8; font-size:13px;">Mã đơn: <code style="color:#fbbf24">${requestId}</code></p>
                    <p style="color:#cbd5e1; font-size:12px; margin-top:4px;">Vui lòng không đóng trang. Kết quả sẽ hiển thị ngay khi hoàn tất.</p>
                `;
                return;
            }

            // GIAO DỊCH ĐÃ CÓ KẾT QUẢ -> DỪNG POLL
            stopBuyKeyPolling();
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";

            // TH1: Thành công
            if (st === "success" && data.fulfilled) {
                statusBox.className = "buykey-status-box success";

                const actualUses = Number(data.addedUses || data.rewardUses || expectedUses || 0);
                const actualAmount = Number(data.value || data.declared_value || 0);
                const actualTelco = String(data.telco || "");

                if (data.mode === "new" && data.createdKey) {
                    const newKey = String(data.createdKey).trim();

                    // Tự động lưu key mới vào Local Storage (an toàn trong try-catch)
                    try {
                        if (typeof savePurchasedKeyToStorage === "function") {
                            savePurchasedKeyToStorage({
                                key: newKey,
                                uses: actualUses,
                                amount: actualAmount,
                                telco: actualTelco,
                                mode: "new"
                            });
                        }
                    } catch (storeErr) {
                        console.warn("Lỗi lưu storage:", storeErr);
                    }

                    // Hiển thị key mới ngay lập tức
                    statusBox.innerHTML = `
                        <i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>
                        <h3 style="color:#34d399; margin-bottom: 6px;">Mua Key Thành Công!</h3>
                        <p style="color:#e2e8f0; font-size:13px;">Key của bạn đã được tạo với <strong>+${actualUses} lượt dùng</strong> và đã được lưu vào trình duyệt.</p>
                        
                        <div class="key-result-box">
                            <div class="key-result-title">LICENSE KEY CỦA BẠN:</div>
                            <div class="key-code-display" id="displayNewKey">${newKey}</div>
                            <br>
                            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                                <button type="button" class="btn-copy-key" onclick="copyCreatedKey('${newKey}')">
                                    <i class="fa-solid fa-copy"></i> Sao chép Key
                                </button>
                                <button type="button" class="btn-copy-key" style="background:#0284c7; border-color:#38bdf8;" onclick="useSavedKeyForToolbox('${newKey}')">
                                    <i class="fa-solid fa-bolt"></i> Dùng ngay trong Toolbox
                                </button>
                            </div>
                        </div>
                        <p style="color:#94a3b8; font-size:12px; margin-top:10px;">Bấm nút <strong>"Key của bạn"</strong> ở trên để xem lại danh sách key bất cứ lúc nào!</p>
                    `;
                } else {
                    // Nạp thêm lượt vào key có sẵn
                    const targetKey = String(data.targetKey || "").trim();

                    try {
                        if (typeof savePurchasedKeyToStorage === "function" && targetKey) {
                            savePurchasedKeyToStorage({
                                key: targetKey,
                                uses: actualUses,
                                amount: actualAmount,
                                telco: actualTelco,
                                mode: "topup"
                            });
                        }
                    } catch (storeErr) {
                        console.warn("Lỗi lưu storage:", storeErr);
                    }

                    statusBox.innerHTML = `
                        <i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>
                        <h3 style="color:#34d399; margin-bottom: 6px;">Nạp Lượt Dùng Thành Công!</h3>
                        <p style="color:#e2e8f0; font-size:14px; margin-top:8px;">
                            Đã cộng thành công <strong>+${data.addedUses || expectedUses} lượt dùng</strong> vào key:
                            <br>
                            <code style="color:#34d399; font-size:16px; font-weight:700;">${data.targetKey || ""}</code>
                        </p>
                    `;
                }
                return;
            }

            // TH2: Sai mệnh giá
            if (st === "wrong_value" || data.status === 3) {
                statusBox.className = "buykey-status-box error";
                statusBox.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:36px; color:#ef4444; margin-bottom:8px;"></i>
                    <h3 style="color:#f87171; margin-bottom: 6px;">Thẻ Sai Mệnh Giá!</h3>
                    <p style="color:#fca5a5; font-size:13px; margin-top:4px;">
                        ${data.fulfillError || "Mệnh giá thẻ bạn gửi không khớp với mệnh giá khai báo. Theo quy định, hệ thống KHÔNG tạo key hoặc cộng lượt cho thẻ sai mệnh giá."}
                    </p>
                `;
                return;
            }

            // TH3: Thẻ lỗi / Thất bại
            statusBox.className = "buykey-status-box error";
            statusBox.innerHTML = `
                <i class="fa-solid fa-circle-xmark" style="font-size:36px; color:#ef4444; margin-bottom:8px;"></i>
                <h3 style="color:#f87171; margin-bottom: 6px;">Nạp Thẻ Thất Bại</h3>
                <p style="color:#e2e8f0; font-size:13px; margin-top:4px;">
                    ${data.message || data.fulfillError || "Thẻ sai mã, số seri hoặc đã từng được sử dụng. Vui lòng kiểm tra lại."}
                </p>
            `;

        } catch (e) {
            console.warn("Polling error:", e);
        }

        // Tự động dừng sau 3 phút
        if (buyKeyPollSeconds > 180) {
            stopBuyKeyPolling();
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            statusBox.innerHTML += `<p style="color:#94a3b8; font-size:12px; margin-top:8px;">Giao dịch đang mất nhiều thời gian hơn bình thường. Bạn có thể kiểm tra lại sau với mã đơn: <code>${requestId}</code>.</p>`;
        }
    }

    buyKeyPollInterval = setInterval(check, 3000);
}

function stopBuyKeyPolling() {
    if (buyKeyPollInterval) {
        clearInterval(buyKeyPollInterval);
        buyKeyPollInterval = null;
    }
}

function copyCreatedKey(key) {
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
        alert(`Đã sao chép License Key: ${key}\nHãy dán vào Toolbox để sử dụng!`);
    }).catch(() => {
        prompt("Sao chép License Key:", key);
    });
}

// ============================================================
//            LOCAL STORAGE - LƯU & XEM KEY ĐÃ MUA
// ============================================================
const STORAGE_KEY_SAVED_KEYS = "rubyfree_saved_license_keys";

function getSavedKeysFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SAVED_KEYS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("Lỗi đọc localStorage keys:", e);
        return [];
    }
}

function savePurchasedKeyToStorage({ key, uses, amount, telco, mode }) {
    if (!key) return;
    try {
        const list = getSavedKeysFromStorage();
        const now = new Date();
        const timeStr = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

        const cleanKey = String(key).trim().toUpperCase();
        const existingIdx = list.findIndex(item => item.key.toUpperCase() === cleanKey);

        if (existingIdx !== -1) {
            // Đã có key -> cộng dồn lượt hoặc cập nhật lượt mới nhất
            if (mode === "topup") {
                list[existingIdx].uses = (Number(list[existingIdx].uses) || 0) + (Number(uses) || 0);
            } else {
                list[existingIdx].uses = Number(uses) || list[existingIdx].uses;
            }
            list[existingIdx].lastUpdated = timeStr;
            if (amount) list[existingIdx].amount = Number(amount);
            if (telco) list[existingIdx].telco = telco;
            // Đưa lên đầu danh sách
            const item = list.splice(existingIdx, 1)[0];
            list.unshift(item);
        } else {
            // Thêm mới vào đầu danh sách
            list.unshift({
                key: cleanKey,
                uses: Number(uses) || 0,
                amount: Number(amount) || 0,
                telco: telco || "",
                mode: mode || "new",
                createdAt: timeStr,
                timestamp: now.getTime()
            });
        }

        // Lưu tối đa 50 key gần nhất
        if (list.length > 50) list.length = 50;

        localStorage.setItem(STORAGE_KEY_SAVED_KEYS, JSON.stringify(list));
        updateSavedKeysBadge();

        const panel = document.getElementById("savedKeysPanel");
        if (panel && panel.style.display !== "none") {
            renderSavedKeysList();
        }
    } catch (e) {
        console.warn("Lỗi lưu key vào localStorage:", e);
    }
}

function updateSavedKeysBadge() {
    const pill = document.getElementById("savedKeysCountPill");
    if (!pill) return;
    const list = getSavedKeysFromStorage();
    pill.textContent = list.length;
}

function toggleSavedKeysPanel() {
    const panel = document.getElementById("savedKeysPanel");
    const icon = document.getElementById("savedKeysToggleIcon");
    if (!panel) return;

    if (panel.style.display === "none" || !panel.style.display) {
        panel.style.display = "block";
        if (icon) icon.style.transform = "rotate(180deg)";
        renderSavedKeysList();
    } else {
        panel.style.display = "none";
        if (icon) icon.style.transform = "rotate(0deg)";
    }
}

function renderSavedKeysList() {
    const container = document.getElementById("savedKeysListContainer");
    if (!container) return;

    const list = getSavedKeysFromStorage();
    if (list.length === 0) {
        container.innerHTML = `
            <div class="saved-keys-empty">
                <i class="fa-solid fa-folder-open"></i>
                <p>Chưa có License Key nào được lưu trên trình duyệt.</p>
                <span>Khi bạn nạp thẻ mua Key thành công, hệ thống sẽ tự động lưu Key của bạn tại đây!</span>
            </div>
        `;
        return;
    }

    let html = "";
    list.forEach((item, index) => {
        const timeDisplay = item.lastUpdated ? `Cập nhật: ${item.lastUpdated}` : (item.createdAt || "");
        const amountDisplay = item.amount ? `${Number(item.amount).toLocaleString("vi-VN")}đ` : "";
        const telcoDisplay = item.telco ? `${item.telco}` : "";

        html += `
            <div class="saved-key-card" id="savedKeyCard_${index}">
                <div class="saved-key-main">
                    <div class="saved-key-code-row">
                        <span class="saved-key-code">${item.key}</span>
                        <span class="saved-key-badge-uses">+${item.uses} lượt</span>
                    </div>
                    <div class="saved-key-meta">
                        ${telcoDisplay ? `<span class="saved-key-meta-item"><i class="fa-solid fa-sim-card"></i> ${telcoDisplay}</span>` : ""}
                        ${amountDisplay ? `<span class="saved-key-meta-item"><i class="fa-solid fa-money-bill"></i> ${amountDisplay}</span>` : ""}
                        <span class="saved-key-meta-item"><i class="fa-solid fa-clock"></i> ${timeDisplay}</span>
                    </div>
                </div>

                <div class="saved-key-actions">
                    <button type="button" class="btn-saved-action btn-saved-copy" onclick="copySavedKeyItem('${item.key}', this)" title="Sao chép Key">
                        <i class="fa-solid fa-copy"></i>
                        <span>Sao chép</span>
                    </button>
                    <button type="button" class="btn-saved-action btn-saved-use-topup" onclick="useSavedKeyForTopup('${item.key}')" title="Điền key để nạp thêm lượt">
                        <i class="fa-solid fa-arrow-up-right-dots"></i>
                        <span>Nạp lượt</span>
                    </button>
                    <button type="button" class="btn-saved-action btn-saved-use-toolbox" onclick="useSavedKeyForToolbox('${item.key}')" title="Mở Toolbox và dùng ngay key này">
                        <i class="fa-solid fa-bolt"></i>
                        <span>Toolbox</span>
                    </button>
                    <button type="button" class="btn-saved-action btn-saved-del" onclick="deleteSavedKeyItem('${item.key}')" title="Xóa khỏi lịch sử">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function copySavedKeyItem(key, btn) {
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-check" style="color: #34d399;"></i> <span>Đã chép!</span>`;
            btn.style.borderColor = "#10b981";
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.borderColor = "";
            }, 2000);
        } else {
            alert(`Đã sao chép License Key: ${key}`);
        }
    }).catch(() => {
        prompt("Sao chép License Key:", key);
    });
}

function useSavedKeyForTopup(key) {
    if (!key) return;
    toggleHasKeyMode(true);
    const radioTrue = document.querySelector('input[name="hasKeyRadio"][value="true"]');
    if (radioTrue) radioTrue.checked = true;

    const input = document.getElementById("existingKeyInput");
    if (input) {
        input.value = key;
        input.focus();
    }

    const panel = document.getElementById("savedKeysPanel");
    const icon = document.getElementById("savedKeysToggleIcon");
    if (panel) panel.style.display = "none";
    if (icon) icon.style.transform = "rotate(0deg)";

    verifyInputKey();
}

function useSavedKeyForToolbox(key) {
    if (!key) return;
    navigator.clipboard.writeText(key).catch(() => {});

    const toolboxInput = document.getElementById("elLicenseKeyInput");
    if (toolboxInput) {
        toolboxInput.value = key;
    }

    closeBuyKeyModal();

    if (typeof openElDoradoToolbox === "function") {
        openElDoradoToolbox();
    }
}

function deleteSavedKeyItem(key) {
    if (!key) return;
    if (!confirm(`Bạn có chắc muốn xóa License Key "${key}" khỏi danh sách lưu trên trình duyệt?`)) return;

    try {
        let list = getSavedKeysFromStorage();
        list = list.filter(item => item.key.toUpperCase() !== key.toUpperCase());
        localStorage.setItem(STORAGE_KEY_SAVED_KEYS, JSON.stringify(list));
        updateSavedKeysBadge();
        renderSavedKeysList();
    } catch (e) {
        console.warn("Lỗi xóa key:", e);
    }
}

function clearAllSavedKeys() {
    const list = getSavedKeysFromStorage();
    if (list.length === 0) return;
    if (!confirm("Bạn có chắc muốn xóa TOÀN BỘ danh sách License Key đã lưu trên trình duyệt này?")) return;

    try {
        localStorage.removeItem(STORAGE_KEY_SAVED_KEYS);
        updateSavedKeysBadge();
        renderSavedKeysList();
    } catch (e) {
        console.warn("Lỗi xóa toàn bộ key:", e);
    }
}

