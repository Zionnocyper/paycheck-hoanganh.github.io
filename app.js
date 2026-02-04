// ===== State Management =====
let debts = [];
let editingId = null;
let currentFilter = 'all';

// ===== Authentication =====
const DEFAULT_PASSWORD = '123456';
let isAuthenticated = false;

// Check authentication on page load
function checkAuth() {
    const savedPassword = localStorage.getItem('appPassword') || DEFAULT_PASSWORD;
    const sessionAuth = sessionStorage.getItem('isAuthenticated');

    if (sessionAuth === 'true') {
        isAuthenticated = true;
        showMainApp();
    } else {
        showLoginScreen();
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
}

function login(password) {
    const savedPassword = localStorage.getItem('appPassword') || DEFAULT_PASSWORD;

    if (password === savedPassword) {
        isAuthenticated = true;
        sessionStorage.setItem('isAuthenticated', 'true');
        showMainApp();
        return true;
    }
    return false;
}

function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        isAuthenticated = false;
        sessionStorage.removeItem('isAuthenticated');
        showLoginScreen();
        // Clear form
        debtForm.reset();
        editingId = null;
        cancelBtn.style.display = 'none';
    }
}

function changePassword(currentPassword, newPassword) {
    const savedPassword = localStorage.getItem('appPassword') || DEFAULT_PASSWORD;

    if (currentPassword !== savedPassword) {
        return { success: false, message: 'Mật khẩu hiện tại không đúng!' };
    }

    if (newPassword.length < 4) {
        return { success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự!' };
    }

    localStorage.setItem('appPassword', newPassword);
    return { success: true, message: 'Đổi mật khẩu thành công!' };
}

function showChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('show');
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('show');
    document.getElementById('changePasswordForm').reset();
}

// ===== DOM Elements =====
const debtForm = document.getElementById('debtForm');
const debtsList = document.getElementById('debtsList');
const hasInstallmentCheckbox = document.getElementById('hasInstallment');
const installmentDetails = document.getElementById('installmentDetails');
const installmentMonthsInput = document.getElementById('installmentMonths');
const amountInput = document.getElementById('amount');
const monthlyPaymentSpan = document.getElementById('monthlyPayment');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const filterButtons = document.querySelectorAll('.filter-btn');
const installmentModal = document.getElementById('installmentModal');
const closeModalBtn = document.getElementById('closeModal');

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDebts();
    renderDebts();
    updateStatistics();
    setupEventListeners();
    setupAuthListeners();
    setDefaultDate();
});

function setupAuthListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('loginPassword').value;

        if (login(password)) {
            loginForm.reset();
            loadDebts();
            renderDebts();
            updateStatistics();
        } else {
            alert('❌ Mật khẩu không đúng!');
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        }
    });

    // Change password form
    const changePasswordForm = document.getElementById('changePasswordForm');
    changePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('❌ Mật khẩu mới và xác nhận không khớp!');
            return;
        }

        const result = changePassword(currentPassword, newPassword);
        alert(result.success ? '✅ ' + result.message : '❌ ' + result.message);

        if (result.success) {
            closeChangePasswordModal();
        }
    });
}

// ===== Event Listeners =====
function setupEventListeners() {
    debtForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', cancelEdit);
    hasInstallmentCheckbox.addEventListener('change', toggleInstallmentDetails);
    installmentMonthsInput.addEventListener('input', calculateMonthlyPayment);
    amountInput.addEventListener('input', calculateMonthlyPayment);

    // Add number formatting for amount input
    amountInput.addEventListener('input', formatNumberInput);
    amountInput.addEventListener('blur', formatNumberInput);

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderDebts();
        });
    });

    closeModalBtn.addEventListener('click', closeModal);
    installmentModal.addEventListener('click', (e) => {
        if (e.target === installmentModal) closeModal();
    });
}

function setDefaultDate() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// ===== Form Handling =====
function handleFormSubmit(e) {
    e.preventDefault();

    const debtData = {
        id: editingId || Date.now().toString(),
        type: document.getElementById('debtType').value,
        personName: document.getElementById('personName').value.trim(),
        amount: parseFloat(removeCommas(document.getElementById('amount').value)),
        date: document.getElementById('date').value,
        notes: document.getElementById('notes').value.trim(),
        paid: false,
        createdAt: editingId ? debts.find(d => d.id === editingId).createdAt : new Date().toISOString()
    };

    // Handle installment payment
    if (hasInstallmentCheckbox.checked) {
        const months = parseInt(installmentMonthsInput.value);
        debtData.installment = {
            totalMonths: months,
            monthlyAmount: debtData.amount / months,
            payments: editingId && debts.find(d => d.id === editingId)?.installment?.payments
                ? debts.find(d => d.id === editingId).installment.payments
                : Array(months).fill(false)
        };
    } else {
        debtData.installment = null;
    }

    if (editingId) {
        const index = debts.findIndex(d => d.id === editingId);
        debts[index] = debtData;
        editingId = null;
    } else {
        debts.push(debtData);
    }

    saveDebts();
    renderDebts();
    updateStatistics();
    resetForm();
}

function resetForm() {
    debtForm.reset();
    editingId = null;
    submitBtn.querySelector('span').textContent = 'Thêm Khoản Nợ';
    cancelBtn.style.display = 'none';
    hasInstallmentCheckbox.checked = false;
    installmentDetails.style.display = 'none';
    monthlyPaymentSpan.textContent = '0 ₫';
    setDefaultDate();
}

function cancelEdit() {
    resetForm();
}

function toggleInstallmentDetails() {
    if (hasInstallmentCheckbox.checked) {
        installmentDetails.style.display = 'block';
        calculateMonthlyPayment();
    } else {
        installmentDetails.style.display = 'none';
        monthlyPaymentSpan.textContent = '0 ₫';
    }
}

function calculateMonthlyPayment() {
    const amount = parseFloat(removeCommas(amountInput.value)) || 0;
    const months = parseInt(installmentMonthsInput.value) || 1;
    const monthly = amount / months;
    monthlyPaymentSpan.textContent = formatCurrency(monthly);
}

function formatNumberInput(e) {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    const oldLength = oldValue.length;

    // Remove all non-digit characters
    let value = input.value.replace(/[^\d]/g, '');

    // Add thousand separators
    if (value) {
        value = parseInt(value).toLocaleString('vi-VN');
    }

    input.value = value;

    // Restore cursor position
    const newLength = value.length;
    const diff = newLength - oldLength;
    input.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
}

function removeCommas(value) {
    return value.replace(/[,\.]/g, '');
}

function formatCustomAmountInput(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    const oldLength = oldValue.length;

    // Remove all non-digit characters
    let value = input.value.replace(/[^\d]/g, '');

    // Add thousand separators
    if (value) {
        value = parseInt(value).toLocaleString('vi-VN');
    }

    input.value = value;

    // Restore cursor position
    const newLength = value.length;
    const diff = newLength - oldLength;
    input.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
}

// ===== Debt Operations =====
function editDebt(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    editingId = id;
    document.getElementById('debtType').value = debt.type;
    document.getElementById('personName').value = debt.personName;
    document.getElementById('amount').value = debt.amount;
    document.getElementById('date').value = debt.date;
    document.getElementById('notes').value = debt.notes;

    if (debt.installment) {
        hasInstallmentCheckbox.checked = true;
        installmentDetails.style.display = 'block';
        installmentMonthsInput.value = debt.installment.totalMonths;
        calculateMonthlyPayment();
    }

    submitBtn.querySelector('span').textContent = 'Cập Nhật';
    cancelBtn.style.display = 'inline-flex';

    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteDebt(id) {
    if (confirm('Bạn có chắc muốn xóa khoản nợ này?')) {
        debts = debts.filter(d => d.id !== id);
        saveDebts();
        renderDebts();
        updateStatistics();
    }
}

function togglePaid(id) {
    const debt = debts.find(d => d.id === id);
    if (debt) {
        debt.paid = !debt.paid;
        saveDebts();
        renderDebts();
        updateStatistics();
    }
}

// ===== Installment Payment Management =====
function showInstallmentModal(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt || !debt.installment) return;

    const modalBody = document.getElementById('installmentModalBody');

    // Initialize custom amounts if not exists
    if (!debt.installment.customAmounts) {
        debt.installment.customAmounts = Array(debt.installment.totalMonths).fill(debt.installment.monthlyAmount);
    }

    // Calculate totals based on actual payments
    let totalPaid = 0;
    debt.installment.payments.forEach((paid, index) => {
        if (paid) {
            totalPaid += debt.installment.customAmounts[index] || debt.installment.monthlyAmount;
        }
    });

    const remaining = debt.amount - totalPaid;
    const paidMonths = debt.installment.payments.filter(p => p).length;
    const progress = (totalPaid / debt.amount) * 100;

    modalBody.innerHTML = `
        <div class="installment-progress">
            <div class="installment-info">
                <span><strong>Tiến độ thanh toán</strong></span>
                <span>${paidMonths}/${debt.installment.totalMonths} tháng</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="installment-stats">
                <div class="installment-stat">
                    <div class="installment-stat-label">Tổng tiền</div>
                    <div class="installment-stat-value">${formatCurrency(debt.amount)}</div>
                </div>
                <div class="installment-stat">
                    <div class="installment-stat-label">Đã trả</div>
                    <div class="installment-stat-value">${formatCurrency(totalPaid)}</div>
                </div>
                <div class="installment-stat">
                    <div class="installment-stat-label">Còn lại</div>
                    <div class="installment-stat-value">${formatCurrency(remaining)}</div>
                </div>
            </div>
        </div>

        <h4 style="margin-bottom: 16px; color: var(--text-secondary);">Lịch sử thanh toán</h4>
        <div class="payment-timeline">
            ${debt.installment.payments.map((paid, index) => {
        const customAmount = debt.installment.customAmounts[index] || debt.installment.monthlyAmount;
        const formattedAmount = Math.round(customAmount).toLocaleString('vi-VN');
        // Tính tháng thực tế từ ngày nợ - bắt đầu từ tháng SAU ngày nợ
        const debtDate = new Date(debt.date);
        const paymentDate = new Date(debtDate.getFullYear(), debtDate.getMonth() + 1 + index, 1);
        const monthLabel = `Tháng ${paymentDate.getMonth() + 1}/${paymentDate.getFullYear()}`;
        return `
                <div class="payment-item">
                    <input 
                        type="checkbox" 
                        class="payment-checkbox" 
                        ${paid ? 'checked' : ''} 
                        onchange="togglePayment('${id}', ${index})"
                    >
                    <div class="payment-info">
                        <div class="payment-month">${monthLabel}</div>
                        <div class="payment-amount-input">
                            <input 
                                type="text" 
                                class="custom-amount-input" 
                                value="${formattedAmount}"
                                inputmode="numeric"
                                onchange="updateCustomAmount('${id}', ${index}, this.value)"
                                oninput="formatCustomAmountInput(this)"
                                placeholder="Nhập số tiền"
                            >
                            <small>₫</small>
                        </div>
                    </div>
                    <span class="payment-status ${paid ? 'paid' : 'unpaid'}">
                        ${paid ? '✓ Đã trả' : 'Chưa trả'}
                    </span>
                </div>
            `;
    }).join('')}
        </div>
        
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="resetToEqualPayments('${id}')">
                ↻ Đặt lại chia đều
            </button>
        </div>
    `;

    installmentModal.classList.add('show');
}

function closeModal() {
    installmentModal.classList.remove('show');
}

function updateCustomAmount(debtId, monthIndex, value) {
    const debt = debts.find(d => d.id === debtId);
    if (debt && debt.installment) {
        const amount = parseFloat(removeCommas(value)) || 0;

        // Initialize customAmounts if not exists
        if (!debt.installment.customAmounts) {
            debt.installment.customAmounts = Array(debt.installment.totalMonths).fill(debt.installment.monthlyAmount);
        }

        debt.installment.customAmounts[monthIndex] = amount;

        saveDebts();
        renderDebts();
        updateStatistics();
        showInstallmentModal(debtId); // Refresh modal to update totals
    }
}

function resetToEqualPayments(debtId) {
    const debt = debts.find(d => d.id === debtId);
    if (debt && debt.installment) {
        debt.installment.customAmounts = Array(debt.installment.totalMonths).fill(debt.installment.monthlyAmount);

        saveDebts();
        renderDebts();
        updateStatistics();
        showInstallmentModal(debtId); // Refresh modal
    }
}

function togglePayment(debtId, monthIndex) {
    const debt = debts.find(d => d.id === debtId);
    if (debt && debt.installment) {
        debt.installment.payments[monthIndex] = !debt.installment.payments[monthIndex];

        // Auto-mark as paid if all months are paid
        const allPaid = debt.installment.payments.every(p => p);
        if (allPaid) {
            debt.paid = true;
        } else {
            debt.paid = false;
        }

        saveDebts();
        renderDebts();
        updateStatistics();
        showInstallmentModal(debtId); // Refresh modal
    }
}

// ===== Rendering =====
function renderDebts() {
    const filteredDebts = filterDebts();

    if (filteredDebts.length === 0) {
        debtsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p>Không tìm thấy khoản nợ nào</p>
                <small>Thử thay đổi bộ lọc hoặc thêm khoản nợ mới</small>
            </div>
        `;
        return;
    }

    debtsList.innerHTML = filteredDebts.map(debt => {
        const typeClass = debt.type === 'owedToMe' ? 'owed-to-me' : 'i-owe';
        const typeLabel = debt.type === 'owedToMe' ? 'Người khác nợ tôi' : 'Tôi nợ người khác';
        const paidClass = debt.paid ? 'paid' : '';

        let installmentHTML = '';
        if (debt.installment) {
            // Initialize custom amounts if not exists
            if (!debt.installment.customAmounts) {
                debt.installment.customAmounts = Array(debt.installment.totalMonths).fill(debt.installment.monthlyAmount);
            }

            // Calculate totals based on actual custom payments
            let totalPaid = 0;
            debt.installment.payments.forEach((paid, index) => {
                if (paid) {
                    totalPaid += debt.installment.customAmounts[index] || debt.installment.monthlyAmount;
                }
            });

            const paidMonths = debt.installment.payments.filter(p => p).length;
            const remaining = debt.amount - totalPaid;
            const progress = (totalPaid / debt.amount) * 100;

            installmentHTML = `
                <div class="installment-progress">
                    <div class="installment-info">
                        <span><strong>Trả góp ${debt.installment.totalMonths} tháng</strong></span>
                        <span>${paidMonths}/${debt.installment.totalMonths} tháng</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="installment-stats">
                        <div class="installment-stat">
                            <div class="installment-stat-label">Mỗi tháng</div>
                            <div class="installment-stat-value">${formatCurrency(debt.installment.monthlyAmount)}</div>
                        </div>
                        <div class="installment-stat">
                            <div class="installment-stat-label">Đã trả</div>
                            <div class="installment-stat-value">${formatCurrency(totalPaid)}</div>
                        </div>
                        <div class="installment-stat">
                            <div class="installment-stat-label">Còn lại</div>
                            <div class="installment-stat-value">${formatCurrency(remaining)}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="debt-card ${typeClass} ${paidClass}">
                <div class="debt-header">
                    <div class="debt-info">
                        <span class="debt-type ${typeClass}">${typeLabel}</span>
                        <h3>${debt.personName}</h3>
                    </div>
                    <div class="debt-amount">${formatCurrency(debt.amount)}</div>
                </div>

                ${installmentHTML}

                <div class="debt-details">
                    <div class="debt-detail-item">
                        <span>📅</span>
                        <span>Ngày nợ: ${formatDate(debt.date)}</span>
                    </div>
                    ${debt.notes ? `
                        <div class="debt-detail-item">
                            <span>📝</span>
                            <span>${debt.notes}</span>
                        </div>
                    ` : ''}
                    <div class="debt-detail-item">
                        <span>${debt.paid ? '✅' : '⏳'}</span>
                        <span>${debt.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span>
                    </div>
                </div>

                <div class="debt-actions">
                    <button class="btn btn-small ${debt.paid ? 'btn-danger' : 'btn-success'}" onclick="togglePaid('${debt.id}')">
                        ${debt.paid ? '↩️ Đánh dấu chưa trả' : '✓ Đánh dấu đã trả'}
                    </button>
                    ${debt.installment ? `
                        <button class="btn btn-small btn-info" onclick="showInstallmentModal('${debt.id}')">
                            📅 Chi tiết trả góp
                        </button>
                    ` : ''}
                    <button class="btn btn-small btn-edit" onclick="editDebt('${debt.id}')">
                        ✏️ Sửa
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteDebt('${debt.id}')">
                        🗑️ Xóa
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterDebts() {
    return debts.filter(debt => {
        switch (currentFilter) {
            case 'owedToMe':
                return debt.type === 'owedToMe';
            case 'iOwe':
                return debt.type === 'iOwe';
            case 'paid':
                return debt.paid;
            case 'unpaid':
                return !debt.paid;
            default:
                return true;
        }
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ===== Statistics =====
function updateStatistics() {
    const owedToMe = debts
        .filter(d => d.type === 'owedToMe' && !d.paid)
        .reduce((sum, d) => {
            if (d.installment) {
                // Initialize custom amounts if not exists
                if (!d.installment.customAmounts) {
                    d.installment.customAmounts = Array(d.installment.totalMonths).fill(d.installment.monthlyAmount);
                }

                // Calculate based on actual custom payments
                let totalPaid = 0;
                d.installment.payments.forEach((paid, index) => {
                    if (paid) {
                        totalPaid += d.installment.customAmounts[index] || d.installment.monthlyAmount;
                    }
                });
                const remaining = d.amount - totalPaid;
                return sum + remaining;
            }
            return sum + d.amount;
        }, 0);

    const iOwe = debts
        .filter(d => d.type === 'iOwe' && !d.paid)
        .reduce((sum, d) => {
            if (d.installment) {
                // Initialize custom amounts if not exists
                if (!d.installment.customAmounts) {
                    d.installment.customAmounts = Array(d.installment.totalMonths).fill(d.installment.monthlyAmount);
                }

                // Calculate based on actual custom payments
                let totalPaid = 0;
                d.installment.payments.forEach((paid, index) => {
                    if (paid) {
                        totalPaid += d.installment.customAmounts[index] || d.installment.monthlyAmount;
                    }
                });
                const remaining = d.amount - totalPaid;
                return sum + remaining;
            }
            return sum + d.amount;
        }, 0);

    const netBalance = owedToMe - iOwe;

    document.getElementById('totalOwedToMe').textContent = formatCurrency(owedToMe);
    document.getElementById('totalIOwe').textContent = formatCurrency(iOwe);
    document.getElementById('netBalance').textContent = formatCurrency(Math.abs(netBalance));

    // Update net balance color
    const netBalanceEl = document.getElementById('netBalance');
    if (netBalance > 0) {
        netBalanceEl.style.color = '#4facfe';
    } else if (netBalance < 0) {
        netBalanceEl.style.color = '#f5576c';
    } else {
        netBalanceEl.style.color = 'var(--text-primary)';
    }
}

// ===== Local Storage =====
function saveDebts() {
    localStorage.setItem('debts', JSON.stringify(debts));
}

function loadDebts() {
    const stored = localStorage.getItem('debts');
    if (stored) {
        debts = JSON.parse(stored);
    }
}

// ===== Utility Functions =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// ===== Make functions globally accessible =====
window.editDebt = editDebt;
window.deleteDebt = deleteDebt;
window.togglePaid = togglePaid;
window.showInstallmentModal = showInstallmentModal;
window.togglePayment = togglePayment;
window.updateCustomAmount = updateCustomAmount;
window.resetToEqualPayments = resetToEqualPayments;
window.formatCustomAmountInput = formatCustomAmountInput;
window.logout = logout;
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
