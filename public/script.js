<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SNAKEQUEEN - El Dorado & GTD Center</title>
    <link rel="stylesheet" href="style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Anti-Devtools Optimization -->
    <script>
    (() => {
        "use strict";
        const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 600;
        if (isMobile) {
            document.addEventListener("contextmenu", e => e.preventDefault(), true);
            window.addEventListener("keydown", blockShortcut, true);
            function blockShortcut(e) {
                const key = e.key.toUpperCase();
                if (key === "F12" || (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(key)) || (e.ctrlKey && key === "U")) {
                    e.preventDefault(); e.stopPropagation();
                }
            }
            return;
        }
        function blockShortcut(e) {
            const key = e.key.toUpperCase();
            if (key === "F12" || (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(key)) || (e.ctrlKey && key === "U")) {
                e.preventDefault(); e.stopPropagation();
            }
        }
        window.addEventListener("keydown", blockShortcut, true);
        document.addEventListener("contextmenu", e => e.preventDefault(), true);
    })();
    </script>
</head>
<body>

<!-- ============ TOAST NOTIFICATION CONTAINER ============ -->
<div id="toastContainer" class="toast-container"></div>

<!-- ============ CONTAINER CHÍNH ============ -->
<div class="container">
    
    <!-- TOP BAR TÀI KHOẢN -->
    <div class="user-top-bar" id="userTopBar">
        <div class="guest-nav" id="guestNav">
            <button type="button" class="btn-top-auth" onclick="openAuthModal('login')">
                <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
            </button>
            <button type="button" class="btn-top-auth btn-top-register" onclick="openAuthModal('register')">
                <i class="fa-solid fa-user-plus"></i> Đăng ký
            </button>
        </div>

        <div class="user-nav" id="userNav" style="display: none;">
            <div class="user-balance-badge" onclick="openAccountModal('deposit')" title="Bấm để nạp thêm tiền">
                <i class="fa-solid fa-wallet" style="color: #10b981;"></i>
                <span class="balance-label">Số dư:</span>
                <strong id="userBalanceText" class="balance-value">0đ</strong>
                <span class="credit-pill" id="userCreditsText">0 credit</span>
            </div>
            <button type="button" class="btn-user-profile" id="btnUserProfile" onclick="openAccountModal('info')" title="Quản lý tài khoản">
                <i class="fa-solid fa-user"></i>
                <span id="userDisplayName">USER</span>
            </button>
        </div>
    </div>

    <!-- LOGO & BRANDING -->
    <div class="logo-section">
        <div class="logo-badge">
            <i class="fa-solid fa-gem"></i>
            <span>SNAKEQUEEN</span>
        </div>
        <h1>Nhận Gibong và Azure</h1>
        <p class="subtitle">Tham gia ngay Event 1500 Sub để nhận Gibong và Azure miễn phí</p>
    </div>

    <!-- NÚT NHẬN MÃ -->
    <button onclick="getReward()" class="btn-action btn-primary" id="btnGetReward">
        <i class="fa-solid fa-gift"></i>
        <span>Nhận Mã</span>
    </button>
    <div id="code" class="code-display">— — — —</div>

    <!-- FORM NHẬP THÔNG TIN MÃ -->
    <div id="codeInputSection" class="code-input-section" style="display:none;">
        <p class="sub">Nhập thông tin tài khoản và mã để xác nhận gửi</p>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-user"></i> User ID</label>
                <input id="userIdInput" type="text" class="form-input" placeholder="Nhập ID tài khoản">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-gamepad"></i> Nền tảng</label>
                <select id="platformSelect" class="form-select">
                    <option value="">Chọn nền tảng</option>
                    <option value="AMO">AMO</option>
                    <option value="ATV">ATV</option>
                    <option value="LG">LG</option>
                    <option value="SSVN">SSVN</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-key"></i> Mã của bạn</label>
                <input id="userCodeInput" type="text" class="form-input" placeholder="Mã đã nhận">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fa-solid fa-heart"></i> Quà Lâu Đài Cấp 8
                    <a href="https://www.youtube.com/watch?v=TmG87_sdFdA" target="_blank" class="yt-link">▶ Xem HD</a>
                </label>
                <input id="lucyAnswerInput" type="number" class="form-input" placeholder="Nhập số lượng">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-gem"></i> Số Ruby</label>
                <input id="rubyAnswerInput" type="number" class="form-input" placeholder="Số lượng Ruby">
            </div>
        </div>

        <button onclick="submitCode()" class="btn-action btn-primary submit-btn" id="btnSubmitCode">
            <i class="fa-solid fa-paper-plane"></i>
            <span>Gửi Mã</span>
        </button>
        <div id="submitStatus" class="submit-status"></div>
    </div>

    <!-- CÁC NÚT TÍNH NĂNG CHÍNH -->
    <div class="main-actions-stack">
        <button onclick="openBuyKeyModal()" class="btn-action btn-buykey">
            <i class="fa-solid fa-cart-shopping"></i> Mua Key Tool Box
        </button>
        <button onclick="openElDoradoToolbox()" class="btn-action btn-toolbox">
            <i class="fa-solid fa-bolt"></i> Toolbox El Dorado
        </button>
        <button onclick="openMysteryBox()" class="btn-action btn-mystery-box">
            <i class="fa-solid fa-gift"></i> Túi Mù Ruby
        </button>
        <div class="grid-2-btn">
            <button onclick="openPrice()" class="btn-action btn-secondary">
                <i class="fa-solid fa-tags"></i> Bảng giá El Dorado
            </button>
            <button onclick="openGTDPrice()" class="btn-action btn-secondary">
                <i class="fa-solid fa-tags"></i> Bảng giá GTD
            </button>
        </div>
    </div>

    <!-- SOCIAL BUTTONS -->
    <div class="social-buttons">
        <a class="social-btn youtube" href="https://www.youtube.com/@SnakeGTD" target="_blank">
            <i class="fa-brands fa-youtube"></i> YouTube
        </a>
        <a class="social-btn discord" href="https://discord.com/users/1201014400350429284" target="_blank">
            <i class="fa-brands fa-discord"></i> Discord
        </a>
    </div>
</div>

<!-- ============ MODAL BẢNG GIÁ EL DORADO ============ -->
<div id="priceModal" class="modal">
    <div class="modal-content price-modal-content">
        <span class="close" onclick="closePrice()">&times;</span>
        <div class="modal-header">
            <div class="modal-icon"><i class="fa-solid fa-coins"></i></div>
            <h2>Bảng giá El Dorado</h2>
            <h4>AMO / ATV / SSVN / LG</h4>
            <p>Cập nhật giá các vật phẩm game mới nhất</p>
        </div>
        <div id="priceGrid" class="price-grid"></div>
        <div id="pricePagination" class="pagination"></div>
    </div>
</div>

<!-- ============ MODAL BẢNG GIÁ GTD ============ -->
<div id="gtdPriceModal" class="modal">
    <div class="modal-content price-modal-content">
        <span class="close" onclick="closeGTDPrice()">&times;</span>
        <div class="modal-header">
            <div class="modal-icon gtd"><i class="fa-solid fa-gem"></i></div>
            <h2>Bảng giá GTD</h2>
            <p>Cập nhật giá các gói nạp và vật phẩm GTD</p>
        </div>
        <div id="gtdPriceGrid" class="price-grid"></div>
        <div id="gtdPricePagination" class="pagination"></div>
    </div>
</div>

<!-- ============ MODAL TÚI MÙ RUBY ============ -->
<div id="mysteryBoxModal" class="modal">
    <div class="modal-content mystery-box-content">
        <span class="close" onclick="closeMysteryBox()">&times;</span>
        
        <div class="toolbox-heading">
            <div class="toolbox-badge badge-red">
                <i class="fa-solid fa-gift"></i> TÚI MÙ RUBY
            </div>
            <h2><i class="fa-solid fa-gem" style="color:#ef4444"></i> Túi Mù Ruby</h2>
            <p>Mở hộp quà bí ẩn để nhận từ <strong>1.000</strong> đến <strong>10.000</strong> Ruby ngẫu nhiên (1 Credit = 1 lượt mở).</p>
            <p class="warn-note">⚠️ Tất cả vật phẩm trong Web đều có tỉ lệ khiến tài khoản bị khóa. Vui lòng cân nhắc trước khi dùng.</p>
        </div>

        <!-- BANNER TÚI MÙ RUBY (ĐÃ TỐI ƯU GIAO DIỆN) -->
        <div class="credit-balance-banner banner-red" id="mbSpinsBar" style="display: flex;">
            <div class="banner-left">
                <span class="sub-label">Lượt mở của bạn:</span>
                <div class="credit-main-val">
                    <strong id="mbUserSpins">0</strong> <span class="unit">Lượt</span>
                    <small id="mbUserCreditsText">(Số dư: <span id="mbUserCredits">0</span> credit)</small>
                </div>
            </div>
            <button type="button" class="btn-deposit-shortcut btn-red" onclick="toggleMbBuyPanel()">
                <i class="fa-solid fa-cart-plus"></i> Mua Thêm Lượt
            </button>
        </div>

        <div id="mbGuestAlert" class="buykey-warning-box flex-between">
            <div class="flex-align-gap">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Vui lòng <strong>Đăng nhập</strong> để lưu lượt mở và nhận Ruby!</span>
            </div>
            <button type="button" class="btn-deposit-shortcut btn-sm" onclick="openAuthModal('login')">Đăng nhập</button>
        </div>

        <div id="mbBuyPanel" class="saved-keys-panel border-red" style="display: none;">
            <div class="saved-keys-panel-header">
                <span><i class="fa-solid fa-coins" style="color: #fbbf24;"></i> Mua lượt mở Túi Mù (1 Credit = 1 Lượt)</span>
                <button type="button" class="btn-clear-all-keys" onclick="toggleMbBuyPanel(false)">Đóng</button>
            </div>
            <div class="mb-packages-grid">
                <div class="mb-package-card" onclick="selectMbPackage(1, 1)">
                    <div class="mb-pkg-spins">1 Lượt</div>
                    <div class="mb-pkg-cost">1 Credit</div>
                    <div class="mb-pkg-vnd">10.000đ</div>
                </div>
                <div class="mb-package-card" onclick="selectMbPackage(5, 5)">
                    <div class="mb-pkg-spins">5 Lượt</div>
                    <div class="mb-pkg-cost">5 Credit</div>
                    <div class="mb-pkg-vnd">50.000đ</div>
                </div>
                <div class="mb-package-card" onclick="selectMbPackage(10, 10)">
                    <div class="mb-pkg-spins">10 Lượt</div>
                    <div class="mb-pkg-cost">10 Credit</div>
                    <div class="mb-pkg-vnd">100.000đ</div>
                </div>
                <div class="mb-package-card" onclick="selectMbPackage(22, 20)">
                    <div class="mb-pkg-spins text-emerald">22 Lượt <span class="bonus-tag">+2</span></div>
                    <div class="mb-pkg-cost">20 Credit</div>
                    <div class="mb-pkg-vnd">200.000đ</div>
                </div>
                <div class="mb-package-card" onclick="selectMbPackage(35, 30)">
                    <div class="mb-pkg-spins text-emerald">35 Lượt <span class="bonus-tag">+5</span></div>
                    <div class="mb-pkg-cost">30 Credit</div>
                    <div class="mb-pkg-vnd">300.000đ</div>
                </div>
                <div class="mb-package-card" onclick="selectMbPackage(65, 50)">
                    <div class="mb-pkg-spins text-emerald">65 Lượt <span class="bonus-tag">+15</span></div>
                    <div class="mb-pkg-cost">50 Credit</div>
                    <div class="mb-pkg-vnd">500.000đ</div>
                </div>
            </div>
            <div class="mb-buy-actions">
                <input id="mbCustomSpinsInput" type="number" class="mb-buy-input" placeholder="Số lượt" min="1" max="100" value="1" oninput="updateMbBuyBtn()">
                <button type="button" id="mbConfirmBuyBtn" class="mb-btn-confirm-buy" onclick="confirmBuyMbSpins()">
                    <i class="fa-solid fa-bolt"></i> Mua 1 Lượt (1 Credit)
                </button>
            </div>
        </div>

        <div class="toolbox-grid">
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-user text-rose"></i> ID Tài Khoản</label>
                <input id="mbHostId" type="text" class="form-input" placeholder="Nhập ID tài khoản game">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-gamepad text-rose"></i> Nền tảng</label>
                <select id="mbPlatform" class="form-select" onchange="toggleMbEmail()">
                    <option value="">Chọn nền tảng</option>
                    <option value="AMO">AMO</option>
                    <option value="ATV">ATV</option>
                    <option value="LG">LG</option>
                    <option value="SS">SS</option>
                </select>
            </div>
            <div class="form-group toolbox-field-wide" id="mbEmailRow" style="display:none;">
                <label class="form-label"><i class="fa-solid fa-envelope text-rose"></i> Email (ATV)</label>
                <input id="mbEmail" type="email" class="form-input" placeholder="email@example.com">
            </div>
            <div class="form-group toolbox-field-wide">
                <label class="form-label"><i class="fa-solid fa-key text-rose"></i> Mã Xác Minh</label>
                <input id="mbUserKey" type="text" class="form-input" placeholder="Mã xác minh (nếu có)">
            </div>
        </div>

        <div class="mystery-grid" id="mysteryGrid">
            <div class="mystery-box-item" onclick="clickMysteryBox(0)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(1)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(2)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(3)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(4)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(5)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(6)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(7)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
            <div class="mystery-box-item" onclick="clickMysteryBox(8)"><div class="box-inner"><i class="fa-solid fa-gift"></i><span>?</span></div></div>
        </div>

        <div id="mysteryBoxStatus" class="toolbox-status" style="display:none;"></div>
    </div>
</div>

<!-- ============ MODAL TOOLBOX EL DORADO ============ -->
<div id="elDoradoToolboxModal" class="modal">
    <div class="modal-content toolbox-content">
        <span class="close" onclick="closeElDoradoToolbox()">&times;</span>

        <div class="toolbox-heading">
            <div class="toolbox-badge">
                <i class="fa-solid fa-shield-halved"></i> SECURE TOOL
            </div>
            <h2><i class="fa-solid fa-bolt" style="color:#fbbf24"></i> El Dorado Toolbox</h2>
            <p>Nhập thông tin tài khoản và license key để gửi Ruby, Random 7s hoặc 7s tự chọn.</p>
            <p class="warn-note">⚠️ Tất cả vật phẩm trong Web đều có tỉ lệ khiến tài khoản bị khóa. Vui lòng cân nhắc trước khi dùng.</p>
        </div>

        <div class="toolbox-progress">
            <div class="toolbox-step is-active" id="step1"><span>1</span>Nhập thông tin</div>
            <div class="toolbox-step" id="step2"><span>2</span>Xác thực</div>
            <div class="toolbox-step" id="step3"><span>3</span>Xử lý</div>
            <div class="toolbox-step" id="step4"><span>4</span>Hoàn tất</div>
        </div>

        <form id="elDoradoToolboxForm" onsubmit="submitElDoradoToolbox(event)">
            <div class="toolbox-grid">
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-user"></i> ID</label>
                    <input id="elHostIdInput" type="text" class="form-input" placeholder="Nhập ID tài khoản">
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-gamepad"></i> Platform</label>
                    <select id="elPlatformSelect" class="form-select">
                        <option value="">Chọn nền tảng</option>
                        <option value="AMO">AMO</option>
                        <option value="ATV">ATV</option>
                        <option value="LG">LG</option>
                        <option value="SS">SS</option>
                    </select>
                </div>

                <div class="form-group toolbox-field-wide" id="elEmailGroup" style="display:none;">
                    <label class="form-label"><i class="fa-solid fa-envelope"></i> Email (ATV)</label>
                    <input id="elEmailInput" type="email" class="form-input" placeholder="email@example.com">
                </div>

                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-key"></i> Mã Xác Minh</label>
                    <input id="elUserKeyInput" type="text" class="form-input" placeholder="Mã Xác Minh">
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fa-solid fa-list-check"></i> Chế độ</label>
                    <select id="elToolboxActionSelect" class="form-select" onchange="updateElDoradoToolboxMode()">
                        <option value="ruby">Gửi Ruby</option>
                        <option value="feature11">Random 7s</option>
                        <option value="feature13">Gửi 7s (Nhân vật cụ thể)</option>
                    </select>
                </div>

                <div class="form-group toolbox-field-wide" id="elRubyAmountGroup">
                    <label class="form-label"><i class="fa-solid fa-gem"></i> Số lượng Ruby</label>
                    <input id="elRubyAmountInput" type="number" class="form-input" placeholder="1 - 5.000" min="1" max="5000">
                </div>

                <div class="form-group" data-el-character-feature style="display:none;">
                    <label class="form-label"><i class="fa-solid fa-user-ninja"></i> Level hiện tại</label>
                    <input id="elCharacterLevelInput" type="number" class="form-input" value="100" readonly>
                </div>
                <div class="form-group" data-el-character-feature style="display:none;">
                    <label class="form-label"><i class="fa-solid fa-crown"></i> Max Level</label>
                    <input id="elCharacterMaxLevelInput" type="number" class="form-input" value="100" readonly>
                </div>
                <div class="form-group toolbox-field-wide" data-el-feature13 style="display:none;">
                    <label class="form-label"><i class="fa-solid fa-id-badge"></i> ID Nhân vật</label>
                    <select id="elCharacterIdInput" class="form-select">
                        <option value="63">Ace</option>
                        <option value="66">Echo</option>
                        <option value="67">Smart</option>
                        <option value="68">Khan</option>
                        <option value="49">Lucy Thiên Thần</option>
                        <option value="50">Lucy Oto</option>
                        <option value="64">Bee</option>
                        <option value="65">Ruby</option>
                        <option value="48">Gold</option>
                        <option value="56">Gin</option>
                        <option value="62">Bensi</option>
                        <option value="75">Jey</option>
                        <option value="81">Koo</option>
                        <option value="99">Thrue</option>
                    </select>
                </div>

                <div class="form-group toolbox-field-wide">
                    <label class="form-label"><i class="fa-solid fa-shield"></i> License Key</label>
                    <input id="elLicenseKeyInput" type="password" class="form-input" placeholder="XXXX-XXXX-XXXX-XXXX">
                </div>
            </div>

            <button type="submit" id="elDoradoSubmitBtn" class="btn-action btn-toolbox toolbox-submit-btn">
                <i class="fa-solid fa-play"></i>
                <span id="elStepSendLabel">Bắt đầu gửi Ruby (1 lượt)</span>
            </button>
        </form>

        <div id="elDoradoToolboxStatus" class="toolbox-status"></div>
    </div>
</div>

<!-- ============ MODAL ĐĂNG NHẬP / ĐĂNG KÝ ============ -->
<div id="authModal" class="modal">
    <div class="modal-content auth-modal-content">
        <span class="close" onclick="closeAuthModal()">&times;</span>
        
        <div class="auth-tabs">
            <button type="button" class="auth-tab is-active" id="tabBtnLogin" onclick="switchAuthTab('login')">
                <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
            </button>
            <button type="button" class="auth-tab" id="tabBtnRegister" onclick="switchAuthTab('register')">
                <i class="fa-solid fa-user-plus"></i> Đăng ký
            </button>
        </div>

        <form id="loginForm" class="auth-form" onsubmit="submitLogin(event)">
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-user"></i> Tên tài khoản</label>
                <input type="text" id="loginUsernameInput" class="form-input" placeholder="Nhập tên tài khoản" required autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-lock"></i> Mật khẩu</label>
                <input type="password" id="loginPasswordInput" class="form-input" placeholder="Nhập mật khẩu" required autocomplete="current-password">
            </div>
            <button type="submit" id="loginSubmitBtn" class="btn-action btn-primary width-full mt-14">
                <i class="fa-solid fa-right-to-bracket"></i> <span>Đăng nhập</span>
            </button>
            <p class="auth-switch-prompt">Chưa có tài khoản? <a href="javascript:void(0)" onclick="switchAuthTab('register')">Đăng ký ngay</a></p>
        </form>

        <form id="registerForm" class="auth-form" style="display: none;" onsubmit="submitRegister(event)">
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-user"></i> Tên tài khoản</label>
                <input type="text" id="regUsernameInput" class="form-input" placeholder="3-20 ký tự" required autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-envelope"></i> Email / Gmail</label>
                <input type="email" id="regEmailInput" class="form-input" placeholder="vidu@gmail.com" required autocomplete="email">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-lock"></i> Mật khẩu</label>
                <input type="password" id="regPasswordInput" class="form-input" placeholder="Tối thiểu 6 ký tự" required autocomplete="new-password">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-check-double"></i> Xác nhận mật khẩu</label>
                <input type="password" id="regConfirmPasswordInput" class="form-input" placeholder="Nhập lại mật khẩu" required autocomplete="new-password">
            </div>
            <button type="submit" id="registerSubmitBtn" class="btn-action btn-buykey width-full mt-14">
                <i class="fa-solid fa-user-plus"></i> <span>Tạo tài khoản</span>
            </button>
            <p class="auth-switch-prompt">Đã có tài khoản? <a href="javascript:void(0)" onclick="switchAuthTab('login')">Đăng nhập ngay</a></p>
        </form>

        <div id="authStatusBox" class="auth-status-box" style="display: none;"></div>
    </div>
</div>

<!-- ============ MODAL QUẢN LÝ TÀI KHOẢN & NẠP TIỀN ============ -->
<div id="accountModal" class="modal">
    <div class="modal-content account-modal-content">
        <span class="close" onclick="closeAccountModal()">&times;</span>
        
        <div class="toolbox-heading">
            <div class="toolbox-badge badge-emerald">
                <i class="fa-solid fa-circle-user"></i> TÀI KHOẢN
            </div>
            <h2><i class="fa-solid fa-wallet" style="color:#10b981"></i> Quản Lý Tài Khoản</h2>
            <p>Xem số dư, nạp tiền bằng thẻ cào 24/7 và kiểm tra lịch sử nạp.</p>
        </div>

        <div class="account-tabs">
            <button type="button" class="account-tab is-active" id="tabBtnAccInfo" onclick="switchAccountTab('info')">
                <i class="fa-solid fa-id-card"></i> Thông tin
            </button>
            <button type="button" class="account-tab" id="tabBtnAccDeposit" onclick="switchAccountTab('deposit')">
                <i class="fa-solid fa-money-bill-transfer"></i> Nạp thẻ cào
            </button>
            <button type="button" class="account-tab" id="tabBtnAccHistory" onclick="switchAccountTab('history')">
                <i class="fa-solid fa-clock-rotate-left"></i> Lịch sử nạp
            </button>
        </div>

        <div id="accTabInfo" class="acc-tab-pane">
            <div class="account-info-card">
                <div class="acc-info-row">
                    <span class="label"><i class="fa-solid fa-user"></i> Tên người dùng:</span>
                    <strong class="value" id="accInfoUsername">-</strong>
                </div>
                <div class="acc-info-row">
                    <span class="label"><i class="fa-solid fa-envelope"></i> Gmail:</span>
                    <strong class="value" id="accInfoEmail">-</strong>
                </div>
                <div class="acc-info-row highlight">
                    <span class="label"><i class="fa-solid fa-wallet"></i> Số dư hiện tại:</span>
                    <strong class="value balance-green" id="accInfoBalance">0đ</strong>
                </div>
                <div class="acc-info-row highlight">
                    <span class="label"><i class="fa-solid fa-coins"></i> Credit khả dụng:</span>
                    <strong class="value credit-blue" id="accInfoCredits">0 credit</strong>
                </div>
                <div class="acc-info-row highlight">
                    <span class="label"><i class="fa-solid fa-gift text-purple"></i> Lượt Túi Mù Ruby:</span>
                    <strong class="value text-purple" id="accInfoMysterySpins">0 lượt</strong>
                </div>
                <div class="acc-info-note">
                    <i class="fa-solid fa-circle-info"></i> <strong>Quy đổi:</strong> Mỗi 10.000đ nạp vào tài khoản = <strong>1 Credit</strong> = <strong>1 lượt dùng Tool</strong>.
                </div>
            </div>

            <div class="acc-actions-row">
                <button type="button" class="btn-action btn-buykey" onclick="switchAccountTab('deposit')">
                    <i class="fa-solid fa-circle-dollar-to-slot"></i> Nạp tiền
                </button>
                <button type="button" class="btn-action btn-secondary" onclick="openBuyKeyModal()">
                    <i class="fa-solid fa-key"></i> Dùng Credit Mua Key
                </button>
                <button type="button" class="btn-danger-outline" onclick="handleLogout()">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
                </button>
            </div>
        </div>

        <div id="accTabDeposit" class="acc-tab-pane" style="display: none;">
            <div class="deposit-rate-banner">
                <i class="fa-solid fa-bolt" style="color: #fbbf24;"></i>
                <span>Tỷ lệ: <strong>10.000đ = 1 Credit = 1 lượt dùng Tool</strong> (Duyệt tự động 24/7)</span>
            </div>

            <form id="accDepositForm" onsubmit="submitAccountDeposit(event)">
                <div class="toolbox-grid">
                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-sim-card"></i> Loại thẻ</label>
                        <select id="accDepositTelcoSelect" class="form-select" required>
                            <option value="">Chọn loại thẻ</option>
                            <option value="VIETTEL">Viettel</option>
                            <option value="VINAPHONE">Vinaphone (Vina)</option>
                            <option value="GARENA">Garena</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-money-bill-wave"></i> Mệnh giá</label>
                        <select id="accDepositAmountSelect" class="form-select" required>
                            <option value="">Chọn mệnh giá</option>
                            <option value="10000">10.000đ (+1 credit)</option>
                            <option value="20000">20.000đ (+2 credit)</option>
                            <option value="50000">50.000đ (+5 credit)</option>
                            <option value="100000">100.000đ (+10 credit)</option>
                            <option value="200000">20.000đ (+20 credit)</option>
                            <option value="300000">300.000đ (+30 credit)</option>
                            <option value="500000">500.000đ (+50 credit)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-barcode"></i> Số Serial</label>
                        <input id="accDepositSerialInput" type="text" class="form-input" placeholder="Nhập số seri" required autocomplete="off">
                    </div>

                    <div class="form-group">
                        <label class="form-label"><i class="fa-solid fa-lock"></i> Mã thẻ (PIN)</label>
                        <input id="accDepositCodeInput" type="text" class="form-input" placeholder="Nhập mã thẻ cào" required autocomplete="off">
                    </div>
                </div>

                <div class="buykey-warning-box mt-12">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span><strong>LƯU Ý:</strong> Chọn đúng mệnh giá thẻ! Thẻ sai mệnh giá sẽ KHÔNG được cộng tiền.</span>
                </div>

                <button type="submit" id="accDepositSubmitBtn" class="btn-action btn-buykey width-full mt-14">
                    <i class="fa-solid fa-paper-plane"></i>
                    <span id="accDepositBtnText">Nạp thẻ ngay</span>
                </button>
            </form>

            <div id="accDepositStatusBox" class="buykey-status-box" style="display: none;"></div>
        </div>

        <div id="accTabHistory" class="acc-tab-pane" style="display: none;">
            <div class="acc-history-wrapper">
                <table class="acc-history-table">
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Mã đơn</th>
                            <th>Thẻ & Giá</th>
                            <th>Seri</th>
                            <th>Trạng thái</th>
                            <th>Cộng tiền</th>
                        </tr>
                    </thead>
                    <tbody id="accHistoryTableBody">
                        <tr><td colspan="6" class="text-muted p-20">Đang tải lịch sử nạp...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- ============ MODAL MUA KEY TOOL BOX BẰNG CREDIT ============ -->
<div id="buyKeyModal" class="modal">
    <div class="modal-content buykey-content">
        <span class="close" onclick="closeBuyKeyModal()">&times;</span>

        <div class="toolbox-heading">
            <div class="toolbox-badge badge-emerald">
                <i class="fa-solid fa-coins"></i> DÙNG CREDIT
            </div>
            <h2><i class="fa-solid fa-key" style="color:#10b981"></i> Mua Key Tool Box</h2>
            <p>Sử dụng số dư Credit trong tài khoản để Tạo Key mới hoặc Nạp thêm lượt dùng (1 Credit = 1 Lượt dùng = 10.000đ).</p>
            
            <div class="saved-keys-toggle-wrapper">
                <button type="button" class="btn-saved-keys-toggle" onclick="toggleSavedKeysPanel()">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>Key của bạn</span>
                    <span class="saved-keys-count-pill" id="savedKeysCountPill">0</span>
                    <i class="fa-solid fa-chevron-down" id="savedKeysToggleIcon"></i>
                </button>
            </div>
        </div>

        <div id="savedKeysPanel" class="saved-keys-panel" style="display: none;">
            <div class="saved-keys-panel-header">
                <span><i class="fa-solid fa-wallet" style="color: #10b981;"></i> Key đã lưu trên trình duyệt</span>
                <button type="button" class="btn-clear-all-keys" onclick="clearAllSavedKeys()">
                    <i class="fa-solid fa-trash-can"></i> Xóa tất cả
                </button>
            </div>
            <div id="savedKeysListContainer" class="saved-keys-list"></div>
        </div>

        <!-- BANNER SỐ DƯ MUA KEY (ĐÃ TỐI ƯU GIAO DIỆN) -->
        <div class="credit-balance-banner" id="buyKeyCreditBanner">
            <div class="banner-left">
                <span class="sub-label">Số dư của bạn:</span>
                <div class="credit-main-val">
                    <strong id="buyKeyCurrentCredits">0</strong> <span class="unit">Credit</span>
                    <small id="buyKeyCurrentVnd">(tương đương 0đ / 0 lượt)</small>
                </div>
            </div>
            <button type="button" class="btn-deposit-shortcut" onclick="openAccountModal('deposit')">
                <i class="fa-solid fa-plus-circle"></i> Nạp thêm tiền
            </button>
        </div>

        <form id="buyKeyCreditForm" onsubmit="submitBuyKeyWithCredit(event)">
            <div class="toolbox-grid">
                <div class="form-group toolbox-field-wide">
                    <label class="form-label"><i class="fa-solid fa-circle-question"></i> Bạn muốn:</label>
                    <div class="has-key-options">
                        <label class="radio-label">
                            <input type="radio" name="creditBuyMode" value="new" checked onchange="toggleCreditBuyMode('new')">
                            <span><i class="fa-solid fa-circle-plus"></i> Tạo License Key mới</span>
                        </label>
                        <label class="radio-label">
                            <input type="radio" name="creditBuyMode" value="topup" onchange="toggleCreditBuyMode('topup')">
                            <span><i class="fa-solid fa-arrow-up-right-dots"></i> Nạp thêm lượt vào Key có sẵn</span>
                        </label>
                    </div>
                </div>

                <div class="form-group toolbox-field-wide" id="creditTargetKeyGroup" style="display: none;">
                    <label class="form-label"><i class="fa-solid fa-key"></i> License Key cần nạp thêm lượt</label>
                    <div class="flex-gap-8">
                        <input id="creditTargetKeyInput" type="text" class="form-input text-uppercase" placeholder="Nhập key của bạn (VD: XXXX-XXXX-XXXX)">
                        <button type="button" class="btn-check-key" onclick="verifyCreditTargetKey()">Kiểm tra</button>
                    </div>
                    <div id="creditKeyCheckMsg" class="key-check-msg"></div>
                </div>

                <div class="form-group toolbox-field-wide">
                    <label class="form-label"><i class="fa-solid fa-layer-group"></i> Chọn gói lượt muốn mua</label>
                    <div class="credit-package-grid">
                        <div class="credit-pkg-card is-selected" onclick="selectCreditPackage(1)">
                            <div class="pkg-uses">1 Lượt</div>
                            <div class="pkg-cost">1 Credit (10k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(2)">
                            <div class="pkg-uses">2 Lượt</div>
                            <div class="pkg-cost">2 Credit (20k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(5)">
                            <div class="pkg-uses">5 Lượt</div>
                            <div class="pkg-cost">5 Credit (50k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(10)">
                            <div class="pkg-uses">10 Lượt</div>
                            <div class="pkg-cost">10 Credit (100k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(20)">
                            <div class="pkg-uses text-emerald">30 Lượt <span class="bonus-tag">+10</span></div>
                            <div class="pkg-cost">20 Credit (200k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(30)">
                            <div class="pkg-uses text-emerald">50 Lượt <span class="bonus-tag">+20</span></div>
                            <div class="pkg-cost">30 Credit (300k)</div>
                        </div>
                        <div class="credit-pkg-card" onclick="selectCreditPackage(50)">
                            <div class="pkg-uses text-emerald">100 Lượt <span class="bonus-tag">+50</span></div>
                            <div class="pkg-cost">50 Credit (500k)</div>
                        </div>
                    </div>
                    <input type="hidden" id="selectedCreditsInput" value="1">
                </div>
            </div>

            <div class="credit-checkout-summary">
                <div class="summary-line">
                    <span>Số lượt nhận được:</span>
                    <strong id="summaryUsesText">+1 lượt dùng</strong>
                </div>
                <div class="summary-line">
                    <span>Chi phí thanh toán:</span>
                    <strong id="summaryCostText" class="text-sky">1 Credit (10.000đ)</strong>
                </div>
            </div>

            <button type="submit" id="buyKeyCreditSubmitBtn" class="btn-action btn-buykey width-full mt-14">
                <i class="fa-solid fa-circle-check"></i>
                <span id="buyKeyCreditBtnText">Thanh toán 1 Credit & Nhận Key</span>
            </button>
        </form>

        <div id="buyKeyCreditResultBox" class="buykey-status-box" style="display: none;"></div>
    </div>
</div>

<!-- ============ POPUP ANNOUNCEMENT ============ -->
<div id="updatePopup" class="popup-overlay">
    <div class="popup-box">
        <h2><i class="fa-solid fa-circle-info" style="color:#3b82f6"></i> Thông báo</h2>
        <p>Cập nhật Acc Mới trong Shop Acc</p>
        <p>Cập nhật Bảng giá và Giao diện Web mượt mà hơn</p>
        <div class="popup-buttons">
            <button class="btn-action btn-primary" onclick="hideFor2Hours()">Ẩn 2 giờ</button>
            <button class="btn-action btn-secondary" onclick="closePopup()">Đóng</button>
        </div>
    </div>
</div>

<script src="script.js"></script>
</body>
</html>
