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
        { name: "Key Tool Box El 5 Lần (Dùng Để Gửi Ruby và 7s)", price: "50.000₫", icon: "fa-solid fa-ticket", color: "#f59e0b" },
        { name: "Key Tool Box El 10 Lần (Dùng Để Gửi Ruby và 7s)", price: "100.000₫", icon: "fa-solid fa-ticket", color: "#f59e0b" },
        { name: "El Dorado Web Player (AMO/LG/ATV/SSVN)", price: "699.000₫", icon: "fa-solid fa-user-plus", color: "#ea580c" },
        { name: "El Dorado Manager 2026", price: "200.000₫", icon: "fa-solid fa-user-plus", color: "#ea580c" },
        { name: "Mây x500", price: "50.000₫", icon: "fa-solid fa-cloud", color: "#fbbf24" },
        { name: "Mây x1200", price: "100.000₫", icon: "fa-solid fa-cloud", color: "#fbbf24" },
        { name: "Ruby x10.000", price: "50.000₫", icon: "fa-solid fa-gem", color: "#fbbf24" },
        { name: "Ruby x22.000", price: "100.000₫", icon: "fa-solid fa-gem", color: "#fbbf24" },
        { name: "Ruby x50.000", price: "200.000₫", icon: "fa-solid fa-gem", color: "#fbbf24" },
        { name: "x1 Item A", price: "50.000₫", icon: "fa-solid fa-hammer", color: "#fde68a" },
        { name: "x3 Item A", price: "120.000₫", icon: "fa-solid fa-hammer", color: "#fde68a" },
        { name: "x1 Random 7s Level 100", price: "20.000₫", icon: "fa-solid fa-user", color: "#60a5fa" },
        { name: "x3 Random 7s Level 100", price: "50.000₫", icon: "fa-solid fa-users", color: "#a78bfa" },
        { name: "x2 Random 8s Level 90", price: "50.000₫", icon: "fa-solid fa-user-plus", color: "#f472b6" },
        { name: "x5 Random 8s Level 90", price: "120.000₫", icon: "fa-solid fa-user-plus", color: "#f472b6" },
        { name: "x1 Tự Chọn 7s Level 100", price: "50.000₫", icon: "fa-solid fa-user", color: "#10b981" },
        { name: "x3 Tự Chọn 7s Level 100", price: "100.000₫", icon: "fa-solid fa-users", color: "#059669" },
        { name: "x1 Tự Chọn 8s Level 90", price: "70.000₫", icon: "fa-solid fa-user-plus", color: "#f97316" },
        { name: "x3 Tự Chọn 8s Level 90", price: "200.000₫", icon: "fa-solid fa-user-plus", color: "#ea580c" },
    ],
    gtd: [
        { name: "GTD Web Player (AMO/ATV/LG/SSVN)", price: "1.199.000₫", icon: "fa-bolt", color: "#3b82f6" },
        { name: "x100.000 Vỏ Sò", price: "100.000₫", icon: "fa-bolt", color: "#3b82f6" },
        { name: "x1.000 Magic", price: "100.000₫", icon: "fa-bolt", color: "#60a5fa" },
        { name: "x10.000 Ruby", price: "100.000₫", icon: "fa-bolt", color: "#60a5fa" },
        { name: "100.000 Diamond", price: "100.000₫", icon: "fa-bolt", color: "#2563eb" },
        { name: "Hero Loki/Hell 150 Souls", price: "150.000₫", icon: "fa-bolt", color: "#2563eb" },
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
            const isAutoKey = item.name.toLowerCase().includes("key tool box") || item.name.toLowerCase().includes("key toolbox") || item.name.toLowerCase().includes("license");
            return `
                <div class="price-card" style="--accent:${item.color};--accent-bg:${bg};--accent-glow:${glow};">
                <div class="price-card-icon"><i class="fa-solid ${item.icon}"></i></div>
                    <div class="price-card-name">${item.name}</div>
                    <div class="price-card-price">${item.price}</div>
                    <button class="price-card-btn" onclick="handlePriceBuy('${item.name.replace(/'/g, "\\'")}', '${item.price}')">
                        ${isAutoKey ? '<i class="fa-solid fa-bolt"></i> Mua Tự Động' : '<i class="fa-brands fa-discord"></i> Mua'}
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

// ================= XỬ LÝ MUA HÀNG TỪ BẢNG GIÁ =================
function handlePriceBuy(name, price) {
    const lowerName = (name || "").toLowerCase();
    // Nếu là Key Tool Box -> Chuyển hướng sang giao diện Mua Key Tự Động
    if (lowerName.includes("key tool box") || lowerName.includes("key toolbox") || lowerName.includes("license")) {
        if (typeof closePrice === "function") closePrice();
        if (typeof closeGTDPrice === "function") closeGTDPrice();

        if (typeof openBuyKeyModal === "function") {
            openBuyKeyModal();
            // Tự động chọn sẵn gói Credit tương ứng
            if (lowerName.includes("5 lần") || price.includes("50.000")) {
                if (typeof selectCreditPackage === "function") selectCreditPackage(5);
            } else if (lowerName.includes("10 lần") || price.includes("100.000")) {
                if (typeof selectCreditPackage === "function") selectCreditPackage(10);
            } else if (lowerName.includes("30 lần") || price.includes("200.000")) {
                if (typeof selectCreditPackage === "function") selectCreditPackage(20);
            } else if (lowerName.includes("50 lần") || price.includes("300.000")) {
                if (typeof selectCreditPackage === "function") selectCreditPackage(30);
            } else {
                if (typeof selectCreditPackage === "function") selectCreditPackage(1);
            }
        }
        return;
    }

    // Các vật phẩm khác -> Chuyển hướng sang Discord
    contactBuy(name, price);
}

// ================= LIÊN HỆ MUA HÀNG (mở Discord) =================
function contactBuy(name, price) {
    window.open("https://discord.com/users/1201014400350429284", "_blank");
}

// ================= NHẬN MÃ =================
function getReward() {
    if (window.__DEVTOOLS_BLOCKED__) return;
    const btn = document.querySelector('button[onclick="getReward()"]');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang tạo...</span>';

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
        } else {
            let msg = "❌ " + data.message;
            if (data.code) {
                msg += " (Mã của bạn: " + data.code + ")";
                document.getElementById("code").innerText = data.code;
            } else {
                document.getElementById("code").innerText = "Lỗi";
            }
            alert(msg);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-gift"></i> <span>Nhận mã</span>';
        }
    })
    .catch(err => {
        alert("Lỗi kết nối: " + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-gift"></i> <span>Nhận mã</span>';
    });
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
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            statusEl.innerText = "✅ Thành công!";
            statusEl.className = "submit-status success";
            document.getElementById("userIdInput").value = "";
            document.getElementById("platformSelect").value = "";
            document.getElementById("userCodeInput").value = "";
            document.getElementById("lucyAnswerInput").value = "";
            document.getElementById("rubyAnswerInput").value = "";
        } else {
            showError("❌ " + data.message);
        }
    })
    .catch(err => showError("❌ Lỗi: " + err.message));

    function showError(msg) {
        statusEl.innerText = msg;
        statusEl.className = "submit-status error";
    }
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
    const response = await fetch("/api/el-dorado/toolbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error("Server trả về dữ liệu không hợp lệ");
    }

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Server xử lý thất bại");
    }
    return data;
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
    if (action === "ruby" && (!Number.isInteger(rubyAmount) || rubyAmount < 1 || rubyAmount > 5000)) {
        return setElDoradoStatus("Số Ruby phải là số nguyên từ 1 đến 5.000.", "error");
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

// ================= TÚI MÙ RUBY (MYSTERY BOX - THEO TÀI KHOẢN) =================
let mysteryBoxOpened = [false, false, false, false, false, false, false, false, false];

function openMysteryBox() {
    const modal = document.getElementById("mysteryBoxModal");
    if (!modal) return;
    modal.style.display = "flex";
    resetMysteryBoxes();
    updateMysteryBoxUI();
    const statusEl = document.getElementById("mysteryBoxStatus");
    if (statusEl) { statusEl.style.display = "none"; statusEl.innerHTML = ""; }
}

function closeMysteryBox() {
    document.getElementById("mysteryBoxModal").style.display = "none";
}

function resetMysteryBoxes() {
    mysteryBoxOpened = [false, false, false, false, false, false, false, false, false];
    const grid = document.getElementById("mysteryGrid");
    if (!grid) return;
    const boxes = grid.querySelectorAll(".mystery-box-item");
    boxes.forEach((box, i) => {
        box.className = "mystery-box-item";
        box.innerHTML = '<div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div>';
    });
}

function updateMysteryBoxUI() {
    const spinsBar = document.getElementById("mbSpinsBar");
    const guestAlert = document.getElementById("mbGuestAlert");
    const userSpinsEl = document.getElementById("mbUserSpins");
    const userCreditsEl = document.getElementById("mbUserCredits");

    if (currentUser) {
        if (spinsBar) spinsBar.style.display = "flex";
        if (guestAlert) guestAlert.style.display = "none";
        const spins = Number(currentUser.mysterySpins || 0);
        const credits = Number(currentUser.credits ?? Math.floor(Number(currentUser.balance || 0) / 10000));
        if (userSpinsEl) userSpinsEl.textContent = spins;
        if (userCreditsEl) userCreditsEl.textContent = credits;
    } else {
        if (spinsBar) spinsBar.style.display = "none";
        if (guestAlert) guestAlert.style.display = "flex";
    }
}

function toggleMbBuyPanel(forceShow = null) {
    const panel = document.getElementById("mbBuyPanel");
    if (!panel) return;
    if (forceShow === true) {
        panel.style.display = "block";
    } else if (forceShow === false) {
        panel.style.display = "none";
    } else {
        panel.style.display = panel.style.display === "none" || !panel.style.display ? "block" : "none";
    }
}

const MB_PACKAGE_COST_MAP = {
    1: 1,    // 1 Lượt -> 1 Credit (10k)
    5: 5,    // 5 Lượt -> 5 Credit (50k)
    10: 10,  // 10 Lượt -> 10 Credit (100k)
    22: 20,  // 22 Lượt -> 20 Credit (200k, tặng +2)
    35: 30,  // 35 Lượt -> 30 Credit (300k, tặng +5)
    65: 50   // 65 Lượt -> 50 Credit (500k, tặng +15)
};

function selectMbPackage(spins, costCredits) {
    const input = document.getElementById("mbCustomSpinsInput");
    if (input) input.value = spins;
    document.querySelectorAll(".mb-package-card").forEach(card => {
        card.classList.toggle("active", card.getAttribute("onclick")?.includes(`(${spins}`));
    });
    updateMbBuyBtn();
}

function updateMbBuyBtn() {
    const input = document.getElementById("mbCustomSpinsInput");
    const btn = document.getElementById("mbConfirmBuyBtn");
    if (!input || !btn) return;
    let spins = Math.floor(Number(input.value));
    if (isNaN(spins) || spins < 1) spins = 1;
    spins = Math.min(100, spins);
    input.value = spins;
    const credits = MB_PACKAGE_COST_MAP[spins] !== undefined ? MB_PACKAGE_COST_MAP[spins] : (spins * 2);
    btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Mua ${spins} Lượt (${credits} Credit)`;
}

async function confirmBuyMbSpins() {
    if (!currentUser) {
        showMysteryStatus('<i class="fa-solid fa-triangle-exclamation"></i> Vui lòng đăng nhập để mua lượt mở túi mù.', 'error');
        openAuthModal('login');
        return;
    }

    const input = document.getElementById("mbCustomSpinsInput");
    let spins = Math.floor(Number(input?.value || 1));
    if (isNaN(spins) || spins < 1) spins = 1;
    spins = Math.min(100, spins);

    const token = getAuthToken();
    if (!token) {
        showMysteryStatus('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
        openAuthModal('login');
        return;
    }

    const btn = document.getElementById("mbConfirmBuyBtn");
    if (btn) btn.disabled = true;
    showMysteryStatus('<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý mua lượt...', 'info');

    try {
        const res = await fetch("/api/mystery-box/buy-spins", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ spinsCount: spins })
        });

        const data = await res.json();
        if (data.success) {
            currentUser.mysterySpins = data.mysterySpins;
            currentUser.balance = data.newBalance;
            currentUser.credits = data.newCredits;
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
            updateTopNavUI();
            updateMysteryBoxUI();
            toggleMbBuyPanel(false);
            showMysteryStatus(`<i class="fa-solid fa-check-circle"></i> ${data.message} (Hiện có: <strong>${data.mysterySpins} lượt</strong>)`, 'success');
        } else {
            showMysteryStatus(`<i class="fa-solid fa-circle-xmark"></i> ${data.message || 'Lỗi khi mua lượt'}`, 'error');
        }
    } catch (err) {
        console.error("confirmBuyMbSpins err:", err);
        showMysteryStatus('Lỗi kết nối máy chủ khi mua lượt', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function toggleMbEmail() {
    const platform = document.getElementById("mbPlatform")?.value;
    const emailRow = document.getElementById("mbEmailRow");
    if (emailRow) emailRow.style.display = platform === "ATV" ? "flex" : "none";
}

async function clickMysteryBox(index) {
    if (mysteryBoxOpened[index]) return;

    if (!currentUser) {
        showMysteryStatus('<i class="fa-solid fa-triangle-exclamation"></i> Vui lòng đăng nhập tài khoản để mở Túi Mù Ruby.', 'error');
        openAuthModal('login');
        return;
    }

    const availableSpins = Number(currentUser.mysterySpins || 0);
    if (availableSpins < 1) {
        showMysteryStatus('<i class="fa-solid fa-triangle-exclamation"></i> Bạn đã hết lượt mở. Vui lòng bấm <strong>"Mua Thêm Lượt"</strong> (1 credit = 1 lượt).', 'error');
        toggleMbBuyPanel(true);
        return;
    }

    const hostId = document.getElementById("mbHostId")?.value.trim();
    const platform = document.getElementById("mbPlatform")?.value;
    const userKey = document.getElementById("mbUserKey")?.value.trim();
    const email = document.getElementById("mbEmail")?.value.trim() || "";

    if (!hostId) { showMysteryStatus("Vui lòng nhập ID tài khoản game.", "error"); return; }
    if (!platform) { showMysteryStatus("Vui lòng chọn Nền tảng game (AMO, ATV, LG, SS).", "error"); return; }
    if (platform === "ATV" && (!email || !email.includes("@"))) {
        showMysteryStatus("Vui lòng nhập email hợp lệ cho nền tảng ATV.", "error");
        return;
    }

    const token = getAuthToken();
    if (!token) {
        showMysteryStatus("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
        openAuthModal("login");
        return;
    }

    const grid = document.getElementById("mysteryGrid");
    const box = grid ? grid.querySelectorAll(".mystery-box-item")[index] : null;
    if (!box) return;

    // Start opening animation
    box.classList.add("opening");
    showMysteryStatus('<i class="fa-solid fa-spinner fa-spin"></i> Đang mở hộp quà bí ẩn...', "info");

    try {
        const res = await fetch("/api/mystery-ruby-box", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ accountId: hostId, platform, userKey, email, boxIndex: index })
        });
        const data = await res.json();

        // Wait for shake animation to finish
        await new Promise(r => setTimeout(r, 700));

        if (data.success) {
            mysteryBoxOpened[index] = true;
            box.className = "mystery-box-item opened";
            box.innerHTML = `<div class="box-inner"><i class="fa-solid fa-gem"></i><div class="ruby-result">+${data.rubyAmount.toLocaleString()}</div><span>Ruby</span></div>`;

            // Update user spins
            if (currentUser) {
                currentUser.mysterySpins = data.remainingSpins;
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
                updateMysteryBoxUI();
            }

            showMysteryStatus(`<i class="fa-solid fa-check-circle"></i> Nhận được <strong>+${data.rubyAmount.toLocaleString()} Ruby</strong>! Tổng Ruby trong game: ${data.totalRuby.toLocaleString()} | Lượt còn lại: ${data.remainingSpins} lượt`, "success");
        } else {
            box.className = "mystery-box-item error-box";
            box.innerHTML = `<div class="box-inner"><i class="fa-solid fa-xmark"></i><span>${data.message || "Lỗi"}</span></div>`;
            showMysteryStatus(`<i class="fa-solid fa-circle-xmark"></i> ${data.message || "Không thể mở hộp quà"}`, "error");
            // Allow retry after 2s
            setTimeout(() => {
                if (!mysteryBoxOpened[index]) {
                    box.className = "mystery-box-item";
                    box.innerHTML = '<div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div>';
                }
            }, 2000);
        }
    } catch (err) {
        await new Promise(r => setTimeout(r, 700));
        box.className = "mystery-box-item error-box";
        box.innerHTML = '<div class="box-inner"><i class="fa-solid fa-xmark"></i><span>Lỗi kết nối</span></div>';
        showMysteryStatus('<i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối máy chủ. Vui lòng thử lại.', "error");
        setTimeout(() => {
            if (!mysteryBoxOpened[index]) {
                box.className = "mystery-box-item";
                box.innerHTML = '<div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div>';
            }
        }, 2000);
    }
}

function showMysteryStatus(html, type) {
    const el = document.getElementById("mysteryBoxStatus");
    if (!el) return;
    el.style.display = "block";
    el.className = "mystery-status " + type;
    el.innerHTML = html;
}

// ================= SẢN PHẨM & THÔNG BÁO =================
const PRODUCT_CATALOG = [
    { id: "web-player", name: "El Dorado Web Player", price: "Từ 699.000đ", icon: "fa-solid fa-display", color: "#38bdf8", summary: "Bản Log Acc El Dorado hỗ trợ 4 server AMO/ATV/LG/SSVN, truy cập nhanh trên trình duyệt.", description: "Bản log web cực vip tin dùng bởi các hacker của game, dùng mượt mà, có thể chỉnh game tùy ý, log mọi account!", features: ["Hỗ Trợ Trọn Đời", "Giao diện đơn giản và dễ dùng", "Tối ưu trải nghiệm game và thao tác", "Trải nghiệm mod/hacks miễn phí"] },
    { id: "web-player-gtd", name: "Gold Tower Defence Web Player", price: "Từ 1.199.000đ", icon: "fa-solid fa-display", color: "#38bdf8", summary: "Bản Log Acc GTD hỗ trợ 4 server AMO/ATV/LG/SSVN, truy cập nhanh trên trình duyệt.", description: "Gold Tower Defence Web Player là giải pháp truy cập game trên nền web, tối ưu cho người dùng muốn mở ngay mà không cần cấu hình phức tạp.", features: ["Hỗ Trợ Trọn Đời", "Giao diện đơn giản và dễ dùng", "Tối ưu trải nghiệm game và thao tác", "Trải nghiệm mod/hacks miễn phí"] },
    { id: "manager", name: "El Dorado Manager 2026", price: "Từ 200.000đ", icon: "fa-solid fa-gear", color: "#a78bfa", summary: "Bản Mod/Hack Cho ElDorado M, Trải Nghiệm Full Cập Nhật Mới Nhất!", description: "Mod/Hack Vô Hạn Ruby, Mây, Full Thần Nạp, Nâng Cấp Level 160, Full 9 Sao và 8 Sao, Anti Ban 100%, Hỗ Trợ PVP, Boss, CloudGarden", features: ["Hỗ Trợ Trọn Đời Đến Khi Game Sập", "Cập nhật tính năng mới liên tục", "Trải Nghiệm Tinh Hoa Của Game", "Hỗ Trợ PVP, Boss, CloudGarden"] },
    { id: "toolbox", name: "Toolbox El Dorado", price: "Từ 20.000đ / lượt", icon: "fa-solid fa-bolt", color: "#f59e0b", summary: "Công cụ gửi Ruby, 7s, quản lý tài khoản nhanh và an toàn trên web.", description: "Toolbox El Dorado hỗ trợ người dùng thực hiện các tác vụ nhanh như gửi Ruby, gửi 7s và xử lý bằng license key. Dễ sử dụng và phù hợp với cả người mới lẫn người dùng có kinh nghiệm.", features: ["Gửi Ruby nhanh và tự động", "Tiện Lợi và An Toàn", "Dùng qua license key và tracking rõ ràng", "Phù hợp cho user và admin"] }
];

const SITE_NOTIFICATIONS = [
    { title: "Thông báo từ devs", date: "03/09/2026", body: "Web ToolBox được duy trì bởi Minh Hùng. Nhận Key Free vui lòng liên hệ Discord hoặc Facebook để được hỗ trợ." },
    { title: "Web đã cập nhật bản mới", date: "03/09/2026", body: "Đã cập nhật giao diện mới, đăng nhập tài khoản, nạp tiền, mua Key bằng Credit và Túi Mù Ruby." }
];

function renderFeaturedProducts() {
    const list = document.getElementById("productList");
    if (!list) return;
    list.innerHTML = PRODUCT_CATALOG.map(product => `
        <article class="product-card">
            <div class="product-card-top"><div class="product-card-icon" style="background:${product.color}"><i class="${product.icon}"></i></div><div class="product-card-meta"><div class="product-card-name">${product.name}</div><div class="product-card-price">${product.price}</div></div></div>
            <div class="product-card-summary">${product.summary}</div>
            <div class="product-card-actions"><button type="button" class="product-detail-btn" onclick="openProductDetail('${product.id}')"><i class="fa-solid fa-circle-info"></i> Chi tiết</button><a class="product-btn" href="https://discord.com/users/chosenone_3667" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-discord"></i> Mua Discord</a></div>
        </article>`).join("");
}

function openProductDetail(productId) {
    const product = PRODUCT_CATALOG.find(item => item.id === productId);
    if (!product) return;
    document.getElementById("productDetailHeader").innerHTML = `<div class="product-detail-icon" style="background:${product.color}"><i class="${product.icon}"></i></div><div><div class="product-detail-name">${product.name}</div><div class="product-detail-price">${product.price}</div></div>`;
    document.getElementById("productDetailBody").innerHTML = `<p>${product.description}</p><ul>${product.features.map(feature => `<li>${feature}</li>`).join("")}</ul>`;
    document.getElementById("productDiscordBtn").href = "https://discord.com/users/chosenone_3667";
    document.getElementById("productFacebookBtn").href = "https://www.facebook.com/minh.hung.63491";
    document.getElementById("productDetailModal").style.display = "flex";
}

function closeProductDetail() { document.getElementById("productDetailModal")?.style.setProperty("display", "none"); }
function renderNotifications() {
    const list = document.getElementById("notificationList");
    const count = SITE_NOTIFICATIONS.length;
    if (!list) return;
    list.innerHTML = SITE_NOTIFICATIONS.map((item, index) => `<button type="button" class="notification-item" onclick="openNotificationDetail(${index})"><div class="notification-item-title">${item.title}</div><div class="notification-item-meta"><span>${item.date}</span><span>Xem chi tiết</span></div><div class="notification-item-body">${item.body}</div></button>`).join("");
    ["notificationBadge", "notificationTextCount"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
    const meta = document.getElementById("notificationMeta");
    if (meta) meta.innerHTML = `Bạn có <strong>${count}</strong> thông báo mới`;
}
function toggleNotificationPanel(force) { const panel = document.getElementById("notificationPanel"); if (panel) panel.style.display = force === false ? "none" : panel.style.display === "block" ? "none" : "block"; }
function openNotificationDetail(index) { const item = SITE_NOTIFICATIONS[index]; if (!item) return; document.getElementById("notificationDetailTitle").textContent = item.title; document.getElementById("notificationDetailDate").textContent = item.date; document.getElementById("notificationDetailBody").textContent = item.body; document.getElementById("notificationDetailModal").style.display = "flex"; toggleNotificationPanel(false); }
function closeNotificationDetail() { document.getElementById("notificationDetailModal")?.style.setProperty("display", "none"); }

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
    initAuthSession();
    setupPlatformListener();
    renderFeaturedProducts();
    renderNotifications();
    document.getElementById("notificationBellBtn")?.addEventListener("click", () => toggleNotificationPanel());

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
function openBuyKeyModal() {
    const modal = document.getElementById("buyKeyModal");
    if (!modal) return;
    modal.style.display = "flex";
    updateTopNavUI();
    selectCreditPackage(1);
    toggleCreditBuyMode("new");
    const resultBox = document.getElementById("buyKeyCreditResultBox");
    if (resultBox) resultBox.style.display = "none";
    if (typeof updateSavedKeysBadge === "function") {
        updateSavedKeysBadge();
    }
}

function closeBuyKeyModal() {
    const modal = document.getElementById("buyKeyModal");
    if (!modal) return;
    modal.style.display = "none";
}

window.addEventListener("click", function(event) {
    const buyKeyModal = document.getElementById("buyKeyModal");
    if (buyKeyModal && event.target === buyKeyModal) {
        closeBuyKeyModal();
    }
    const authModal = document.getElementById("authModal");
    if (authModal && event.target === authModal) {
        closeAuthModal();
    }
    const accountModal = document.getElementById("accountModal");
    if (accountModal && event.target === accountModal) {
        closeAccountModal();
    }
});

// ============================================================
//            USER AUTH & ACCOUNT MANAGEMENT
// ============================================================
const AUTH_TOKEN_KEY = "rubyfree_user_token";
const AUTH_USER_KEY = "rubyfree_user_cached";
let currentUser = null;

function getAuthToken() {
    try {
        const expiresAt = Number(localStorage.getItem(AUTH_TOKEN_KEY + "_expires") || 0);
        if (expiresAt && Date.now() > expiresAt) {
            // Hết hạn 24 giờ
            setAuthToken("");
            return "";
        }
        let token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            // Fallback đọc từ cookie
            const match = document.cookie.match(/rubyfree_token=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1].trim());
                if (token) {
                    localStorage.setItem(AUTH_TOKEN_KEY, token);
                    localStorage.setItem(AUTH_TOKEN_KEY + "_expires", Date.now() + 24 * 60 * 60 * 1000);
                }
            }
        }
        return token || "";
    } catch (e) {
        return localStorage.getItem(AUTH_TOKEN_KEY) || "";
    }
}

function setAuthToken(token, userObj = null) {
    try {
        if (token) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
            // Lưu thời hạn 24 giờ chính xác
            const expires = Date.now() + 24 * 60 * 60 * 1000;
            localStorage.setItem(AUTH_TOKEN_KEY + "_expires", expires);
            document.cookie = "rubyfree_token=" + encodeURIComponent(token) + "; max-age=86400; path=/; SameSite=Lax";
            if (userObj) {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
            }
        } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_TOKEN_KEY + "_expires");
            localStorage.removeItem(AUTH_USER_KEY);
            document.cookie = "rubyfree_token=; max-age=0; path=/;";
        }
    } catch (e) {
        console.warn("setAuthToken error:", e);
    }
}

/**
 * Khởi động phiên đăng nhập 24 Giờ:
 * Hiển thị tức thì (Instant render) từ cache, sau đó refresh từ server ngầm
 */
function initAuthSession() {
    const token = getAuthToken();
    if (!token) {
        currentUser = null;
        updateTopNavUI();
        return;
    }

    // 1. Phục hồi ngay lập tức từ Cache (không delay 1 miligiây nào!)
    try {
        const cachedStr = localStorage.getItem(AUTH_USER_KEY);
        if (cachedStr) {
            currentUser = JSON.parse(cachedStr);
            updateTopNavUI();
        }
    } catch (e) {}

    // 2. Gọi Server để làm mới số dư & trạng thái mới nhất
    checkAuthStatus();
}

async function checkAuthStatus() {
    const token = getAuthToken();
    if (!token) {
        currentUser = null;
        updateTopNavUI();
        return;
    }

    try {
        const res = await fetch("/api/auth/me", {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
            updateTopNavUI();
            // Tự động đồng bộ toàn bộ key của tài khoản từ server về Local Storage
            syncUserKeysFromServer();
        } else if (res.status === 401 || res.status === 403) {
            // Chỉ xóa phiên khi server xác nhận token không hợp lệ hoặc tài khoản bị khóa
            setAuthToken("");
            currentUser = null;
            updateTopNavUI();
        }
    } catch (e) {
        console.warn("checkAuthStatus network error, keeping session alive:", e);
        // Khi mất mạng hoặc gián đoạn kết nối, TUYỆT ĐỐI KHÔNG XÓA PHIÊN!
        if (currentUser) updateTopNavUI();
    }
}

function updateTopNavUI() {
    const guestNav = document.getElementById("guestNav");
    const userNav = document.getElementById("userNav");
    const userDisplayName = document.getElementById("userDisplayName");
    const userBalanceText = document.getElementById("userBalanceText");
    const userCreditsText = document.getElementById("userCreditsText");

    if (currentUser) {
        if (guestNav) guestNav.style.display = "none";
        if (userNav) userNav.style.display = "flex";
        if (userDisplayName) userDisplayName.textContent = currentUser.username || "USER";
        
        const balance = Number(currentUser.balance || 0);
        const credits = Number(currentUser.credits ?? Math.floor(balance / 10000));
        
        if (userBalanceText) userBalanceText.textContent = balance.toLocaleString("vi-VN") + "đ";
        if (userCreditsText) userCreditsText.textContent = "(" + credits + " credit)";

        // Cập nhật trong modal Mua Key
        const buyKeyCurrentCredits = document.getElementById("buyKeyCurrentCredits");
        const buyKeyCurrentVnd = document.getElementById("buyKeyCurrentVnd");
        if (buyKeyCurrentCredits) buyKeyCurrentCredits.textContent = credits;
        if (buyKeyCurrentVnd) buyKeyCurrentVnd.textContent = "(tương đương " + balance.toLocaleString("vi-VN") + "đ / " + credits + " lượt)";

        // Cập nhật trong modal Tài Khoản
        const accInfoUsername = document.getElementById("accInfoUsername");
        const accInfoEmail = document.getElementById("accInfoEmail");
        const accInfoBalance = document.getElementById("accInfoBalance");
        const accInfoCredits = document.getElementById("accInfoCredits");
        if (accInfoUsername) accInfoUsername.textContent = currentUser.username;
        if (accInfoEmail) accInfoEmail.textContent = currentUser.email || "(Chưa có)";
        if (accInfoBalance) accInfoBalance.textContent = balance.toLocaleString("vi-VN") + "đ";
        if (accInfoCredits) accInfoCredits.textContent = credits + " credit (" + credits + " lượt dùng)";
        const accInfoMysterySpins = document.getElementById("accInfoMysterySpins");
        if (accInfoMysterySpins) accInfoMysterySpins.textContent = Number(currentUser.mysterySpins || 0) + " lượt";
    } else {
        if (guestNav) guestNav.style.display = "flex";
        if (userNav) userNav.style.display = "none";
    }
}

// ── Auth Modal ──
function openAuthModal(tab = "login") {
    const modal = document.getElementById("authModal");
    if (!modal) return;
    modal.style.display = "block";
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.style.display = "none";
    const status = document.getElementById("authStatusBox");
    if (status) status.style.display = "none";
}

function switchAuthTab(tab) {
    const tabBtnLogin = document.getElementById("tabBtnLogin");
    const tabBtnRegister = document.getElementById("tabBtnRegister");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const status = document.getElementById("authStatusBox");
    if (status) status.style.display = "none";

    if (tab === "register") {
        tabBtnLogin?.classList.remove("is-active");
        tabBtnRegister?.classList.add("is-active");
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "block";
    } else {
        tabBtnRegister?.classList.remove("is-active");
        tabBtnLogin?.classList.add("is-active");
        if (registerForm) registerForm.style.display = "none";
        if (loginForm) loginForm.style.display = "block";
    }
}

async function submitLogin(event) {
    event.preventDefault();
    const username = document.getElementById("loginUsernameInput")?.value.trim();
    const password = document.getElementById("loginPasswordInput")?.value.trim();
    const status = document.getElementById("authStatusBox");
    const btn = document.getElementById("loginSubmitBtn");

    if (!username || !password) return;

    btn.disabled = true;
    status.style.display = "block";
    status.className = "auth-status-box pending";
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...';

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
            status.className = "auth-status-box success";
            status.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (data.message || "Đăng nhập thành công!");
            updateTopNavUI();
            setTimeout(() => {
                closeAuthModal();
            }, 700);
        } else {
            status.className = "auth-status-box error";
            status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + (data.message || "Đăng nhập thất bại");
        }
    } catch (e) {
        status.className = "auth-status-box error";
        status.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối máy chủ';
    } finally {
        btn.disabled = false;
    }
}

async function submitRegister(event) {
    event.preventDefault();
    const username = document.getElementById("regUsernameInput")?.value.trim();
    const email = document.getElementById("regEmailInput")?.value.trim();
    const password = document.getElementById("regPasswordInput")?.value.trim();
    const confirmPass = document.getElementById("regConfirmPasswordInput")?.value.trim();
    const status = document.getElementById("authStatusBox");
    const btn = document.getElementById("registerSubmitBtn");

    if (password !== confirmPass) {
        status.style.display = "block";
        status.className = "auth-status-box error";
        status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Xác nhận mật khẩu không khớp!';
        return;
    }

    btn.disabled = true;
    status.style.display = "block";
    status.className = "auth-status-box pending";
    status.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo tài khoản...';

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
            setAuthToken(data.token);
            currentUser = data.user;
            status.className = "auth-status-box success";
            status.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + (data.message || "Tạo tài khoản thành công!");
            updateTopNavUI();
            setTimeout(() => {
                closeAuthModal();
            }, 700);
        } else {
            status.className = "auth-status-box error";
            status.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + (data.message || "Đăng ký thất bại");
        }
    } catch (e) {
        status.className = "auth-status-box error";
        status.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối máy chủ';
    } finally {
        btn.disabled = false;
    }
}

async function handleLogout() {
    if (!confirm("Bạn có chắc muốn đăng xuất khỏi tài khoản này?")) return;
    try {
        await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Authorization": "Bearer " + getAuthToken() }
        });
    } catch (e) {}
    setAuthToken("");
    currentUser = null;
    updateTopNavUI();
    closeAccountModal();
}

// ── Account Modal ──
function openAccountModal(tab = "info") {
    if (!currentUser) {
        openAuthModal("login");
        return;
    }
    const modal = document.getElementById("accountModal");
    if (!modal) return;
    modal.style.display = "block";
    switchAccountTab(tab);
}

function closeAccountModal() {
    const modal = document.getElementById("accountModal");
    if (modal) modal.style.display = "none";
}

function switchAccountTab(tab) {
    const tabBtnAccInfo = document.getElementById("tabBtnAccInfo");
    const tabBtnAccDeposit = document.getElementById("tabBtnAccDeposit");
    const tabBtnAccHistory = document.getElementById("tabBtnAccHistory");
    const accTabInfo = document.getElementById("accTabInfo");
    const accTabDeposit = document.getElementById("accTabDeposit");
    const accTabHistory = document.getElementById("accTabHistory");

    tabBtnAccInfo?.classList.remove("is-active");
    tabBtnAccDeposit?.classList.remove("is-active");
    tabBtnAccHistory?.classList.remove("is-active");

    if (accTabInfo) accTabInfo.style.display = "none";
    if (accTabDeposit) accTabDeposit.style.display = "none";
    if (accTabHistory) accTabHistory.style.display = "none";

    if (tab === "deposit") {
        tabBtnAccDeposit?.classList.add("is-active");
        if (accTabDeposit) accTabDeposit.style.display = "block";
    } else if (tab === "history") {
        tabBtnAccHistory?.classList.add("is-active");
        if (accTabHistory) accTabHistory.style.display = "block";
        loadAccountCardHistory();
    } else {
        tabBtnAccInfo?.classList.add("is-active");
        if (accTabInfo) accTabInfo.style.display = "block";
    }
}

// ── Nạp thẻ vào tài khoản ──
let depositPollTimer = null;

async function submitAccountDeposit(event) {
    event.preventDefault();
    if (!currentUser) {
        openAuthModal("login");
        return;
    }

    const telco = document.getElementById("accDepositTelcoSelect")?.value;
    const amount = Number(document.getElementById("accDepositAmountSelect")?.value);
    const serial = document.getElementById("accDepositSerialInput")?.value.trim();
    const code = document.getElementById("accDepositCodeInput")?.value.trim();
    const statusBox = document.getElementById("accDepositStatusBox");
    const btn = document.getElementById("accDepositSubmitBtn");

    if (!telco || !amount || !serial || !code) {
        alert("Vui lòng điền đầy đủ thông tin thẻ cào.");
        return;
    }

    btn.disabled = true;
    statusBox.style.display = "block";
    statusBox.className = "buykey-status-box pending";
    statusBox.innerHTML = '<div class="status-spinner"></div><h4 style="color:#fbbf24; margin-bottom:6px;">Đang gửi thẻ lên hệ thống...</h4><p style="color:#94a3b8; font-size:13px;">Hệ thống đang kết nối nạp thẻ, vui lòng chờ trong giây lát.</p>';

    try {
        const res = await fetch("/api/account/deposit-card", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getAuthToken()
            },
            body: JSON.stringify({ telco, amount, serial, code })
        });
        const data = await res.json();
        if (!data.success) {
            statusBox.className = "buykey-status-box error";
            statusBox.innerHTML = '<i class="fa-solid fa-circle-xmark" style="font-size:28px; color:#ef4444; margin-bottom:8px;"></i><h4 style="color:#f87171; margin-bottom:6px;">Nạp thẻ thất bại</h4><p style="color:#e2e8f0; font-size:13px;">' + (data.message || "Thẻ không hợp lệ") + '</p>';
            btn.disabled = false;
            return;
        }

        // Bắt đầu theo dõi kết quả nạp thẻ
        startDepositPolling(data.requestId, amount);

    } catch (e) {
        statusBox.className = "buykey-status-box error";
        statusBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="font-size:28px; color:#ef4444; margin-bottom:8px;"></i><h4 style="color:#f87171; margin-bottom:6px;">Lỗi kết nối máy chủ</h4><p style="color:#e2e8f0; font-size:13px;">Vui lòng kiểm tra lại kết nối mạng.</p>';
        btn.disabled = false;
    }
}

function startDepositPolling(requestId, expectedAmount) {
    if (depositPollTimer) clearInterval(depositPollTimer);
    let seconds = 0;
    const statusBox = document.getElementById("accDepositStatusBox");
    const btn = document.getElementById("accDepositSubmitBtn");

    depositPollTimer = setInterval(async () => {
        seconds += 3;
        try {
            const res = await fetch("/api/buy-license/status/" + encodeURIComponent(requestId));
            const data = await res.json();

            if (!data.success || !data.statusText) return;

            const st = data.statusText;
            if (st === "pending") {
                statusBox.className = "buykey-status-box pending";
                statusBox.innerHTML = '<div class="status-spinner"></div><h4 style="color:#fbbf24; margin-bottom:6px;">Đang gạch thẻ trên hệ thống (' + seconds + 's)...</h4><p style="color:#cbd5e1; font-size:12px;">Mã đơn: <code>' + requestId + '</code>. Tiền sẽ cộng vào số dư ngay khi duyệt xong.</p>';
                return;
            }

            clearInterval(depositPollTimer);
            btn.disabled = false;

            if (st === "success") {
                const addVnd = Number(data.value || data.declared_value || expectedAmount);
                const addCredit = Math.floor(addVnd / 10000);
                statusBox.className = "buykey-status-box success";
                statusBox.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i><h3 style="color:#34d399; margin-bottom:6px;">Nạp Tiền Thành Công!</h3><p style="color:#e2e8f0; font-size:14px;">Đã cộng <strong>+' + addVnd.toLocaleString("vi-VN") + 'đ</strong> (+' + addCredit + ' Credit) vào tài khoản của bạn.</p>';
                // Làm mới lại số dư
                checkAuthStatus();
            } else if (st === "wrong_value") {
                statusBox.className = "buykey-status-box error";
                statusBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="font-size:36px; color:#ef4444; margin-bottom:8px;"></i><h3 style="color:#f87171; margin-bottom:6px;">Thẻ Sai Mệnh Giá!</h3><p style="color:#fca5a5; font-size:13px;">Thẻ sai mệnh giá không được cộng tiền theo quy định.</p>';
            } else {
                statusBox.className = "buykey-status-box error";
                statusBox.innerHTML = '<i class="fa-solid fa-circle-xmark" style="font-size:36px; color:#ef4444; margin-bottom:8px;"></i><h3 style="color:#f87171; margin-bottom:6px;">Nạp Thẻ Thất Bại</h3><p style="color:#e2e8f0; font-size:13px;">' + (data.message || "Thẻ sai mã PIN hoặc đã qua sử dụng.") + '</p>';
            }

        } catch (err) {
            console.warn("deposit poll err:", err);
        }
    }, 3000);
}

async function loadAccountCardHistory() {
    const tbody = document.getElementById("accHistoryTableBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải lịch sử...</td></tr>';

    try {
        const res = await fetch("/api/account/card-history", {
            headers: { "Authorization": "Bearer " + getAuthToken() }
        });
        const json = await res.json();
        if (!json.success || !json.data || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:25px; color:#94a3b8;">Bạn chưa nạp thẻ cào nào vào tài khoản này.</td></tr>';
            return;
        }

        tbody.innerHTML = json.data.map(tx => {
            const timeStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("vi-VN") + " " + new Date(tx.createdAt).toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"}) : "N/A";
            const valStr = Number(tx.declared_value || 0).toLocaleString("vi-VN") + "đ";
            let statusHtml = '<span style="color:#fbbf24;">⏳ Chờ duyệt</span>';
            let creditHtml = '-';

            if (tx.statusText === "success" || tx.status === 1) {
                statusHtml = '<span style="color:#22c55e; font-weight:700;">✅ Thành công</span>';
                const credited = tx.creditedAmount || tx.value || tx.declared_value;
                creditHtml = '<strong style="color:#34d399;">+' + Number(credited).toLocaleString("vi-VN") + 'đ</strong>';
            } else if (tx.statusText === "wrong_value" || tx.status === 3) {
                statusHtml = '<span style="color:#fb923c;">⚠️ Sai mệnh giá</span>';
            } else if (tx.statusText === "failed" || tx.status === 2) {
                statusHtml = '<span style="color:#ef4444;">❌ Thất bại</span>';
            }

            return '<tr>' +
                '<td style="white-space:nowrap;">' + timeStr + '</td>' +
                '<td><code style="font-size:11px; color:#94a3b8;">' + tx.request_id + '</code></td>' +
                '<td><strong>' + (tx.telco || "") + '</strong> ' + valStr + '</td>' +
                '<td><span style="font-family:monospace;">' + (tx.serial || "-") + '</span></td>' +
                '<td>' + statusHtml + '</td>' +
                '<td>' + creditHtml + '</td>' +
            '</tr>';
        }).join("");

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">Không thể tải lịch sử nạp thẻ.</td></tr>';
    }
}

// ============================================================
//            CREDIT BUY KEY SYSTEM (1 Credit = 1 Lượt = 10k)
// ============================================================

function toggleCreditBuyMode(mode) {
    const targetKeyGroup = document.getElementById("creditTargetKeyGroup");
    const summaryUsesText = document.getElementById("summaryUsesText");
    const credits = Number(document.getElementById("selectedCreditsInput")?.value || 1);

    if (mode === "topup") {
        if (targetKeyGroup) targetKeyGroup.style.display = "block";
        if (summaryUsesText) summaryUsesText.textContent = "+" + credits + " lượt (vào key có sẵn)";
    } else {
        if (targetKeyGroup) targetKeyGroup.style.display = "none";
        if (summaryUsesText) summaryUsesText.textContent = "+" + credits + " lượt (tạo key mới)";
    }
    updateCreditCheckoutSummary();
}

// Bảng giá quy đổi số lượt thưởng theo Credit chuẩn bảng giá cũ
const CREDIT_REWARD_MAP = {
    1: 1,       // 1 Credit -> 1 Lượt
    2: 2,       // 2 Credit -> 2 Lượt
    5: 5,       // 5 Credit -> 5 Lượt
    10: 10,     // 10 Credit -> 10 Lượt
    20: 30,     // 20 Credit -> 30 Lượt
    30: 50,     // 30 Credit -> 50 Lượt
    50: 100     // 50 Credit -> 100 Lượt
};

function selectCreditPackage(credits) {
    document.querySelectorAll(".credit-pkg-card").forEach(card => {
        card.classList.remove("is-selected");
        if (card.getAttribute("onclick")?.includes("(" + credits + ")")) {
            card.classList.add("is-selected");
        }
    });

    const input = document.getElementById("selectedCreditsInput");
    if (input) input.value = credits;

    updateCreditCheckoutSummary();
}

function updateCreditCheckoutSummary() {
    const credits = Number(document.getElementById("selectedCreditsInput")?.value || 1);
    const costVnd = credits * 10000;
    const mode = document.querySelector('input[name="creditBuyMode"]:checked')?.value || "new";
    const rewardUses = CREDIT_REWARD_MAP[credits] || credits;

    const summaryUsesText = document.getElementById("summaryUsesText");
    const summaryCostText = document.getElementById("summaryCostText");
    const submitBtnText = document.getElementById("buyKeyCreditBtnText");

    if (summaryUsesText) {
        summaryUsesText.textContent = "+" + rewardUses + " lượt dùng (" + (mode === "topup" ? "cộng vào key" : "tạo key mới") + ")";
    }
    if (summaryCostText) {
        summaryCostText.textContent = credits + " Credit (" + costVnd.toLocaleString("vi-VN") + "đ)";
    }
    if (submitBtnText) {
        submitBtnText.textContent = "Thanh toán " + credits + " Credit ➔ Nhận " + rewardUses + " Lượt (" + (mode === "topup" ? "Cộng Lượt" : "Tạo Key Mới") + ")";
    }
}

async function verifyCreditTargetKey() {
    const input = document.getElementById("creditTargetKeyInput");
    const msg = document.getElementById("creditKeyCheckMsg");
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
        const res = await fetch("/api/buy-license/check-key/" + encodeURIComponent(key));
        const data = await res.json();
        if (data.success && data.valid) {
            msg.className = "key-check-msg success";
            msg.innerHTML = '<i class="fa-solid fa-circle-check"></i> Key hợp lệ! Đang có <strong>' + (data.maxUses || 0) + '</strong> lượt (đã dùng: ' + (data.usedCount || 0) + ').';
        } else {
            msg.className = "key-check-msg error";
            msg.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> ' + (data.message || "Key không tồn tại hoặc đã bị khóa.");
        }
    } catch (e) {
        msg.className = "key-check-msg error";
        msg.textContent = "Không thể kiểm tra key lúc này.";
    }
}

async function submitBuyKeyWithCredit(event) {
    event.preventDefault();
    if (!currentUser) {
        closeBuyKeyModal();
        openAuthModal("login");
        return;
    }

    const mode = document.querySelector('input[name="creditBuyMode"]:checked')?.value || "new";
    const creditsToUse = Number(document.getElementById("selectedCreditsInput")?.value || 1);
    const targetKey = document.getElementById("creditTargetKeyInput")?.value.trim().toUpperCase();
    const resultBox = document.getElementById("buyKeyCreditResultBox");
    const btn = document.getElementById("buyKeyCreditSubmitBtn");

    if (mode === "topup" && !targetKey) {
        alert("Vui lòng nhập License Key bạn muốn nạp thêm lượt.");
        document.getElementById("creditTargetKeyInput")?.focus();
        return;
    }

    btn.disabled = true;
    resultBox.style.display = "block";
    resultBox.className = "buykey-status-box pending";
    resultBox.innerHTML = '<div class="status-spinner"></div><h4 style="color:#fbbf24; margin-bottom:6px;">Đang xử lý thanh toán Credit...</h4>';

    try {
        const res = await fetch("/api/buy-license/credit", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + getAuthToken()
            },
            body: JSON.stringify({ mode, creditsToUse, targetKey })
        });

        const data = await res.json();

        if (!data.success) {
            resultBox.className = "buykey-status-box error";
            resultBox.innerHTML = '<i class="fa-solid fa-circle-xmark" style="font-size:32px; color:#ef4444; margin-bottom:8px;"></i><h4 style="color:#f87171; margin-bottom:6px;">Giao dịch không thành công</h4><p style="color:#e2e8f0; font-size:13px;">' + (data.message || "Không thể thực hiện") + '</p>' +
                (data.message && data.message.includes("Số dư") ? '<div style="margin-top:12px;"><button type="button" class="btn-primary" onclick="openAccountModal(\'deposit\')" style="font-size:12px; padding:8px 14px;"><i class="fa-solid fa-wallet"></i> Nạp thêm tiền ngay</button></div>' : '');
            btn.disabled = false;
            return;
        }

        // Cập nhật số dư mới của user
        if (currentUser) {
            currentUser.balance = data.newBalance;
            currentUser.credits = data.newCredits;
            updateTopNavUI();
        }

        btn.disabled = false;
        resultBox.className = "buykey-status-box success";

        if (mode === "new" && data.createdKey) {
            const newKey = data.createdKey;
            try {
                savePurchasedKeyToStorage({
                    key: newKey,
                    uses: data.addedUses,
                    amount: data.addedUses * 10000,
                    mode: "credit_new"
                });
            } catch (e) {}

            // Cập nhật huy hiệu và danh sách key ngay lập tức
            updateSavedKeysBadge();
            renderSavedKeysList();
            resultBox.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>' +
                '<h3 style="color:#34d399; margin-bottom:6px;">Mua Key Thành Công!</h3>' +
                '<p style="color:#e2e8f0; font-size:13px;">Key của bạn đã được tạo với <strong>+' + data.addedUses + ' lượt dùng</strong> và đã lưu vào danh sách.</p>' +
                '<div class="key-result-box">' +
                    '<div class="key-result-title">LICENSE KEY CỦA BẠN:</div>' +
                    '<div class="key-code-display" id="displayNewKey">' + newKey + '</div>' +
                    '<br>' +
                    '<div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">' +
                        '<button type="button" class="btn-copy-key" onclick="copyCreatedKey(\'' + newKey + '\')"><i class="fa-solid fa-copy"></i> Sao chép Key</button>' +
                        '<button type="button" class="btn-copy-key" style="background:#0284c7; border-color:#38bdf8;" onclick="useSavedKeyForToolbox(\'' + newKey + '\')"><i class="fa-solid fa-bolt"></i> Dùng trong Toolbox</button>' +
                    '</div>' +
                '</div>' +
                '<p style="color:#94a3b8; font-size:12px; margin-top:10px;">Bấm nút <strong>"Key của bạn"</strong> ở trên để xem lại danh sách key bất kỳ lúc nào!</p>';
        } else {
            // Nạp thêm lượt
            try {
                savePurchasedKeyToStorage({
                    key: data.targetKey,
                    uses: data.addedUses,
                    amount: data.addedUses * 10000,
                    mode: "credit_topup"
                });
            } catch (e) {}

            resultBox.innerHTML = '<i class="fa-solid fa-circle-check" style="font-size:36px; color:#10b981; margin-bottom:8px;"></i>' +
                '<h3 style="color:#34d399; margin-bottom:6px;">Nạp Lượt Thành Công!</h3>' +
                '<p style="color:#e2e8f0; font-size:14px; margin-top:8px;">Đã cộng thành công <strong>+' + data.addedUses + ' lượt dùng</strong> vào key:<br><code style="color:#34d399; font-size:16px; font-weight:700;">' + data.targetKey + '</code></p>';
        }

    } catch (e) {
        resultBox.className = "buykey-status-box error";
        resultBox.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="font-size:32px; color:#ef4444; margin-bottom:8px;"></i><h4 style="color:#f87171; margin-bottom:6px;">Lỗi kết nối máy chủ</h4>';
        btn.disabled = false;
    }
}

// ============================================================
//         LƯU & ĐỒNG BỘ KEY CỦA BẠN (LOCAL STORAGE + SERVER)
// ============================================================
const STORAGE_KEY_SAVED_KEYS = "rubyfree_saved_license_keys";

function getSavedKeysFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_SAVED_KEYS);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function savePurchasedKeyToStorage(keyData) {
    if (!keyData || !keyData.key) return;
    try {
        const keyUpper = String(keyData.key).trim().toUpperCase();
        let list = getSavedKeysFromStorage();
        const existingIdx = list.findIndex(k => k.key.toUpperCase() === keyUpper);
        const now = new Date();
        const timeStr = now.toLocaleDateString("vi-VN") + " " + now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

        if (existingIdx !== -1) {
            if (keyData.mode === "topup" || keyData.mode === "credit_topup") {
                list[existingIdx].uses = (list[existingIdx].uses || 0) + Number(keyData.uses || 0);
            } else if (keyData.uses) {
                list[existingIdx].uses = Number(keyData.uses);
            }
            list[existingIdx].lastUpdated = timeStr;
        } else {
            list.unshift({
                key: keyUpper,
                uses: Number(keyData.uses || 0),
                amount: keyData.amount || (Number(keyData.uses || 0) * 10000),
                telco: keyData.telco || "CREDIT",
                createdAt: timeStr,
                lastUpdated: timeStr,
                mode: keyData.mode || "credit_new"
            });
        }

        localStorage.setItem(STORAGE_KEY_SAVED_KEYS, JSON.stringify(list));
        updateSavedKeysBadge();
        renderSavedKeysList();
    } catch (e) {
        console.warn("Lỗi lưu key vào Local Storage:", e);
    }
}

function updateSavedKeysBadge() {
    const list = getSavedKeysFromStorage();
    const pill = document.getElementById("savedKeysCountPill");
    if (pill) {
        pill.textContent = list.length;
        pill.style.display = list.length > 0 ? "inline-flex" : "none";
    }
}

/**
 * Tự động đồng bộ toàn bộ key của tài khoản từ Database về Local Storage
 */
async function syncUserKeysFromServer() {
    const token = getAuthToken();
    if (!token) return;

    try {
        const res = await fetch("/api/account/my-keys", {
            headers: { "Authorization": "Bearer " + token }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            let list = getSavedKeysFromStorage();
            json.data.forEach(srvKey => {
                const upper = String(srvKey.key).trim().toUpperCase();
                const existing = list.find(k => k.key.toUpperCase() === upper);
                const timeStr = srvKey.createdAt 
                    ? new Date(srvKey.createdAt).toLocaleDateString("vi-VN") + " " + new Date(srvKey.createdAt).toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"})
                    : "-";

                if (!existing) {
                    list.push({
                        key: upper,
                        uses: srvKey.maxUses || 1,
                        amount: (srvKey.maxUses || 1) * 10000,
                        telco: "CREDIT",
                        createdAt: timeStr,
                        lastUpdated: timeStr,
                        mode: "credit_new"
                    });
                } else {
                    existing.uses = srvKey.maxUses || existing.uses;
                }
            });
            localStorage.setItem(STORAGE_KEY_SAVED_KEYS, JSON.stringify(list));
            updateSavedKeysBadge();
            renderSavedKeysList();
        }
    } catch (err) {
        console.warn("syncUserKeysFromServer error:", err);
    }
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

// Khởi chạy cập nhật badge và đồng bộ key ngay khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    try {
        const currentKeys = getSavedKeysFromStorage();
        if (!currentKeys.some(k => k.key === "GB8K-BAL3-WSRA")) {
            savePurchasedKeyToStorage({
                key: "GB8K-BAL3-WSRA",
                uses: 2,
                amount: 20000,
                telco: "GARENA",
                mode: "new"
            });
        }
    } catch (e) {}

    if (typeof updateSavedKeysBadge === "function") {
        updateSavedKeysBadge();
    }
});

// Khởi chạy ngay phiên Auth 24h
initAuthSession();
