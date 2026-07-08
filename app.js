// ============================================
// DATA MANAGEMENT
// ============================================
const DB = {
    get(key, defaultVal = null) {
        try {
            const data = localStorage.getItem(`invoice_${key}`);
            return data ? JSON.parse(data) : defaultVal;
        } catch { return defaultVal; }
    },
    set(key, value) {
        localStorage.setItem(`invoice_${key}`, JSON.stringify(value));
        this.createBackup();
    },
    createBackup() {
        try {
            const backup = {
                customers: this.get('customers', []),
                products: this.get('products', []),
                invoices: this.get('invoices', []),
                settings: this.get('settings', {}),
                users: this.get('users', []),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('invoice_backup', JSON.stringify(backup));
        } catch (e) {}
    }
};

// ============================================
// AUTHENTICATION
// ============================================
function getUsers() {
    let users = DB.get('users');
    if (!users || users.length === 0) {
        users = [{ username: 'admin', password: 'admin123', role: 'Admin' }];
        DB.set('users', users);
    }
    return users;
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const error = document.getElementById('loginError');

    if (!username || !password) {
        error.textContent = 'Please enter username and password';
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = user.username;
        document.getElementById('userAvatar').textContent = user.username.charAt(0).toUpperCase();
        loadAllData();
        error.textContent = '';
        sessionStorage.setItem('invoice_session', 'logged_in');
    } else {
        error.textContent = 'Invalid username or password!';
        error.style.animation = 'shake 0.3s ease-out';
        setTimeout(() => error.style.animation = '', 300);
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('loginScreen').style.display !== 'none') {
        handleLogin();
    }
});

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay')?.remove();
        sessionStorage.removeItem('invoice_session');
    }
}

// ============================================
// SIDEBAR TOGGLE
// ============================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    let overlay = document.querySelector('.sidebar-overlay');
    if (sidebar.classList.contains('open')) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay active';
            overlay.onclick = toggleSidebar;
            document.body.appendChild(overlay);
        }
    } else {
        if (overlay) overlay.remove();
    }
}

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');

        const tab = this.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        const titles = {
            dashboard: 'Dashboard',
            invoices: 'Invoices',
            customers: 'Customers',
            products: 'Products',
            settings: 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';

        if (tab === 'dashboard') loadDashboard();
        if (tab === 'invoices') loadInvoices();
        if (tab === 'customers') loadCustomers();
        if (tab === 'products') loadProducts();
        if (tab === 'settings') loadSettings();

        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    });
});

// ============================================
// DASHBOARD
// ============================================
function loadDashboard() {
    const invoices = DB.get('invoices', []);
    const customers = DB.get('customers', []);
    const products = DB.get('products', []);

    document.getElementById('totalInvoices').textContent = invoices.length;
    document.getElementById('totalCustomers').textContent = customers.length;
    document.getElementById('totalProducts').textContent = products.length;

    const total = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    document.getElementById('totalRevenue').textContent = total.toFixed(2);

    const recent = invoices.slice(-5).reverse();
    const tbody = document.getElementById('recentInvoices');
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No invoices yet</td></tr>';
        return;
    }
    tbody.innerHTML = recent.map(inv => `
        <tr>
            <td><strong>#${inv.id || 'INV-' + Date.now()}</strong></td>
            <td>${inv.customer || 'N/A'}</td>
            <td>${new Date(inv.date).toLocaleDateString()}</td>
            <td>${(inv.total || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${(inv.status || 'paid').toLowerCase()}">${inv.status || 'Paid'}</span></td>
        </tr>
    `).join('');
}

// ============================================
// INVOICES
// ============================================
function loadInvoices() {
    const invoices = DB.get('invoices', []);
    const tbody = document.getElementById('invoiceTableBody');
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No invoices created yet</td></tr>';
        return;
    }
    tbody.innerHTML = invoices.map((inv, i) => `
        <tr>
            <td><strong>#${inv.id || 'INV-' + (i + 1)}</strong></td>
            <td>${inv.customer || 'N/A'}</td>
            <td>${new Date(inv.date).toLocaleDateString()}</td>
            <td>${(inv.total || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${(inv.status || 'paid').toLowerCase()}">${inv.status || 'Paid'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn print" onclick="printInvoice(${i})"><i class="fas fa-print"></i></button>
                    <button class="action-btn edit" onclick="editInvoice(${i})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteInvoice(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openInvoiceModal(data = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    const customers = DB.get('customers', []);
    const products = DB.get('products', []);

    title.textContent = data ? 'Edit Invoice' : 'New Invoice';

    body.innerHTML = `
        <div class="invoice-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Customer</label>
                    <select id="invCustomer" class="form-control">
                        <option value="">Select Customer</option>
                        ${customers.map(c => `<option value="${c.name}" ${data && data.customer === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="invDate" class="form-control" value="${data ? data.date : new Date().toISOString().split('T')[0]}">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="invStatus" class="form-control">
                    <option value="Paid" ${data && data.status === 'Paid' ? 'selected' : ''}>Paid</option>
                    <option value="Unpaid" ${data && data.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                </select>
            </div>
            <div class="invoice-items">
                <h4>Items <span style="font-weight:400;font-size:13px;color:var(--text-muted);">(Add description for detailed billing)</span></h4>
                <div id="invoiceItemsList">
                    ${data && data.items ? data.items.map((item, idx) => `
                        <div class="invoice-item">
                            <input type="text" class="form-control item-description" placeholder="Description (e.g., Exam Paper - Math)" value="${item.description || item.product || ''}">
                            <select class="form-control item-product" onchange="updateItemTotal(this)">
                                <option value="">Select Product</option>
                                ${products.map(p => `<option value="${p.name}" data-price="${p.price}" ${item.product === p.name ? 'selected' : ''}>${p.name} - ${p.price}</option>`).join('')}
                            </select>
                            <input type="number" class="form-control item-qty" placeholder="Qty" value="${item.qty}" onchange="updateItemTotal(this)">
                            <input type="number" class="form-control item-price" placeholder="Price" value="${item.price}" onchange="updateItemTotal(this)" step="0.01">
                            <span class="item-total">${(item.qty * item.price).toFixed(2)}</span>
                            <button class="action-btn delete" onclick="removeInvoiceItem(this)"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('') : ''}
                </div>
                <button class="btn-secondary btn-sm" onclick="addInvoiceItem()" style="margin-top:8px;">
                    <i class="fas fa-plus"></i> Add Item
                </button>
            </div>
            <div class="invoice-total">
                Total: <span id="invTotal">${data ? data.total.toFixed(2) : '0.00'}</span>
            </div>
            <button class="btn-primary" onclick="saveInvoice(${data ? JSON.stringify(data) : 'null'})">
                <i class="fas fa-save"></i> ${data ? 'Update' : 'Create'} Invoice
            </button>
        </div>
    `;

    modal.style.display = 'block';
    if (!data) {
        addInvoiceItem();
    } else if (data.items) {
        calculateInvoiceTotal();
    }
}

function addInvoiceItem() {
    const container = document.getElementById('invoiceItemsList');
    const products = DB.get('products', []);
    const div = document.createElement('div');
    div.className = 'invoice-item';
    div.innerHTML = `
        <input type="text" class="form-control item-description" placeholder="Description (e.g., Exam Paper - Math)" value="">
        <select class="form-control item-product" onchange="updateItemTotal(this)">
            <option value="">Select Product</option>
            ${products.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - ${p.price}</option>`).join('')}
        </select>
        <input type="number" class="form-control item-qty" placeholder="Qty" value="1" onchange="updateItemTotal(this)">
        <input type="number" class="form-control item-price" placeholder="Price" value="0" onchange="updateItemTotal(this)" step="0.01">
        <span class="item-total">0.00</span>
        <button class="action-btn delete" onclick="removeInvoiceItem(this)"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
}

function removeInvoiceItem(btn) {
    const items = document.querySelectorAll('.invoice-item');
    if (items.length <= 1) {
        showNotification('You need at least one item', 'warning');
        return;
    }
    btn.closest('.invoice-item').remove();
    calculateInvoiceTotal();
}

function updateItemTotal(element) {
    const item = element.closest('.invoice-item');
    const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
    const price = parseFloat(item.querySelector('.item-price').value) || 0;
    const total = qty * price;
    item.querySelector('.item-total').textContent = total.toFixed(2);
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    const totals = document.querySelectorAll('.item-total');
    let sum = 0;
    totals.forEach(el => {
        const val = parseFloat(el.textContent);
        if (!isNaN(val)) sum += val;
    });
    document.getElementById('invTotal').textContent = sum.toFixed(2);
}

function saveInvoice(existingData) {
    const customer = document.getElementById('invCustomer').value;
    const date = document.getElementById('invDate').value;
    const status = document.getElementById('invStatus').value;

    const items = [];
    const itemElements = document.querySelectorAll('.invoice-item');
    itemElements.forEach(el => {
        const description = el.querySelector('.item-description').value.trim();
        const product = el.querySelector('.item-product').value;
        const qty = parseFloat(el.querySelector('.item-qty').value) || 0;
        const price = parseFloat(el.querySelector('.item-price').value) || 0;
        if ((description || product) && qty > 0) {
            items.push({ 
                description: description || product,
                product: product || description,
                qty, 
                price 
            });
        }
    });

    if (items.length === 0) {
        showNotification('Please add at least one item', 'warning');
        return;
    }

    const total = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const invoices = DB.get('invoices', []);

    if (existingData) {
        const index = invoices.indexOf(existingData);
        if (index !== -1) {
            invoices[index] = { ...existingData, customer, date, status, items, total };
        }
    } else {
        invoices.push({
            id: 'INV-' + Date.now().toString().slice(-8),
            customer,
            date,
            status,
            items,
            total,
            createdAt: new Date().toISOString()
        });
    }

    DB.set('invoices', invoices);
    closeModal();
    loadInvoices();
    loadDashboard();
    showNotification(existingData ? 'Invoice updated!' : 'Invoice created!');
}

function deleteInvoice(index) {
    if (confirm('Delete this invoice?')) {
        const invoices = DB.get('invoices', []);
        invoices.splice(index, 1);
        DB.set('invoices', invoices);
        loadInvoices();
        loadDashboard();
        showNotification('Invoice deleted');
    }
}

function editInvoice(index) {
    const invoices = DB.get('invoices', []);
    openInvoiceModal(invoices[index]);
}

// ============================================
// PRINT INVOICE
// ============================================
function printInvoice(index) {
    const invoices = DB.get('invoices', []);
    const inv = invoices[index];
    if (!inv) return;

    const settings = DB.get('settings', {
        companyName: 'My Business',
        email: 'info@mybusiness.com',
        phone: '+1 234 567 8900',
        address: '123 Business St, City, Country',
        logo: ''
    });

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="print-header">
            <div class="print-company">
                ${settings.logo ? `<img src="${settings.logo}" style="height:60px;margin-bottom:10px;object-fit:contain;">` : ''}
                <h2>${settings.companyName || 'My Business'}</h2>
                <p>${settings.email || ''}</p>
                <p>${settings.phone || ''}</p>
                <p>${settings.address || ''}</p>
            </div>
            <div style="text-align:right;">
                <div style="font-size:14px;color:#666;">Invoice #${inv.id}</div>
                <div style="font-size:14px;color:#666;">Date: ${new Date(inv.date).toLocaleDateString()}</div>
                <div style="font-size:14px;color:#666;">Status: ${inv.status || 'Paid'}</div>
            </div>
        </div>
        <h2 class="print-title">INVOICE</h2>
        <div style="margin-bottom:16px;">
            <strong>Customer:</strong> ${inv.customer || 'N/A'}
        </div>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${inv.items.map((item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${item.description || item.product || ''}</td>
                        <td>${item.qty}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${(item.qty * item.price).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="print-total">
            Grand Total: ${inv.total.toFixed(2)}
        </div>
        <div class="print-footer">
            Thank you for your business!<br>
            Generated by InvoicePro
        </div>
    `;

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            printArea.innerHTML = '';
        }, 500);
    }, 100);
}

// ============================================
// CUSTOMERS
// ============================================
function loadCustomers() {
    const customers = DB.get('customers', []);
    const tbody = document.getElementById('customerTableBody');
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No customers added yet</td></tr>';
        return;
    }
    tbody.innerHTML = customers.map((c, i) => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.email || 'N/A'}</td>
            <td>${c.phone || 'N/A'}</td>
            <td>${c.address || 'N/A'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editCustomer(${i})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteCustomer(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openCustomerModal(data = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = data ? 'Edit Customer' : 'Add Customer';
    body.innerHTML = `
        <div class="invoice-form">
            <div class="form-group">
                <label>Name *</label>
                <input type="text" id="custName" class="form-control" value="${data ? data.name : ''}" placeholder="Customer name">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="custEmail" class="form-control" value="${data ? data.email : ''}" placeholder="email@example.com">
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" id="custPhone" class="form-control" value="${data ? data.phone : ''}" placeholder="Phone number">
                </div>
            </div>
            <div class="form-group">
                <label>Address</label>
                <textarea id="custAddress" class="form-control" placeholder="Customer address">${data ? data.address : ''}</textarea>
            </div>
            <button class="btn-primary" onclick="saveCustomer(${data ? JSON.stringify(data) : 'null'})">
                <i class="fas fa-save"></i> ${data ? 'Update' : 'Add'} Customer
            </button>
        </div>
    `;
    modal.style.display = 'block';
}

function saveCustomer(existingData) {
    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();

    if (!name) {
        showNotification('Customer name is required', 'warning');
        return;
    }

    const customers = DB.get('customers', []);
    if (existingData) {
        const index = customers.indexOf(existingData);
        if (index !== -1) {
            customers[index] = { ...existingData, name, email, phone, address };
        }
    } else {
        customers.push({
            id: 'CUST-' + Date.now().toString().slice(-6),
            name,
            email,
            phone,
            address,
            createdAt: new Date().toISOString()
        });
    }

    DB.set('customers', customers);
    closeModal();
    loadCustomers();
    loadDashboard();
    showNotification(existingData ? 'Customer updated!' : 'Customer added!');
}

function deleteCustomer(index) {
    if (confirm('Delete this customer?')) {
        const customers = DB.get('customers', []);
        customers.splice(index, 1);
        DB.set('customers', customers);
        loadCustomers();
        loadDashboard();
        showNotification('Customer deleted');
    }
}

function editCustomer(index) {
    const customers = DB.get('customers', []);
    openCustomerModal(customers[index]);
}

// ============================================
// PRODUCTS (WITH CATEGORIES)
// ============================================
function getCategories() {
    const products = DB.get('products', []);
    const categories = [...new Set(products.map(p => p.category).filter(c => c))];
    return categories;
}

function loadProducts() {
    const products = DB.get('products', []);
    const tbody = document.getElementById('productTableBody');
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No products added yet</td></tr>';
        return;
    }
    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td><strong>${p.code || 'N/A'}</strong></td>
            <td>${p.name}</td>
            <td><span class="status-badge" style="background:rgba(37,99,235,0.12);color:var(--accent);">${p.category || 'Uncategorized'}</span></td>
            <td>${p.price.toFixed(2)}</td>
            <td>${p.unit || 'pcs'}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" onclick="editProduct(${i})"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteProduct(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProductModal(data = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    const existingCategories = getCategories();

    title.textContent = data ? 'Edit Product' : 'Add Product';
    body.innerHTML = `
        <div class="invoice-form">
            <div class="form-row">
                <div class="form-group">
                    <label>Code *</label>
                    <input type="text" id="prodCode" class="form-control" value="${data ? data.code : ''}" placeholder="Product code">
                </div>
                <div class="form-group">
                    <label>Name *</label>
                    <input type="text" id="prodName" class="form-control" value="${data ? data.name : ''}" placeholder="Product name">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Category</label>
                    <select id="prodCategory" class="form-control">
                        <option value="">Select or type new category</option>
                        ${existingCategories.map(c => `<option value="${c}" ${data && data.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        <option value="__new__">+ Add New Category</option>
                    </select>
                </div>
                <div class="form-group" id="newCategoryGroup" style="display:none;">
                    <label>New Category Name</label>
                    <input type="text" id="prodNewCategory" class="form-control" placeholder="Enter new category">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Price *</label>
                    <input type="number" id="prodPrice" class="form-control" value="${data ? data.price : ''}" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group">
                    <label>Unit</label>
                    <input type="text" id="prodUnit" class="form-control" value="${data ? data.unit : 'pcs'}" placeholder="pcs, kg, etc.">
                </div>
            </div>
            <button class="btn-primary" onclick="saveProduct(${data ? JSON.stringify(data) : 'null'})">
                <i class="fas fa-save"></i> ${data ? 'Update' : 'Add'} Product
            </button>
        </div>
    `;

    // Category toggle logic
    setTimeout(() => {
        const catSelect = document.getElementById('prodCategory');
        const newCatGroup = document.getElementById('newCategoryGroup');
        catSelect.addEventListener('change', function() {
            if (this.value === '__new__') {
                newCatGroup.style.display = 'block';
                document.getElementById('prodNewCategory').focus();
            } else {
                newCatGroup.style.display = 'none';
            }
        });
        if (data && data.category && !existingCategories.includes(data.category)) {
            // If editing a product with a category that doesn't exist in the list
            catSelect.innerHTML += `<option value="${data.category}" selected>${data.category}</option>`;
        }
    }, 50);

    modal.style.display = 'block';
}

function saveProduct(existingData) {
    const code = document.getElementById('prodCode').value.trim();
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const unit = document.getElementById('prodUnit').value.trim() || 'pcs';
    
    let category = document.getElementById('prodCategory').value;
    if (category === '__new__') {
        category = document.getElementById('prodNewCategory').value.trim();
    }

    if (!code || !name || isNaN(price) || price <= 0) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }

    const products = DB.get('products', []);
    if (existingData) {
        const index = products.indexOf(existingData);
        if (index !== -1) {
            products[index] = { ...existingData, code, name, category, price, unit };
        }
    } else {
        products.push({
            id: 'PROD-' + Date.now().toString().slice(-6),
            code,
            name,
            category: category || '',
            price,
            unit,
            createdAt: new Date().toISOString()
        });
    }

    DB.set('products', products);
    closeModal();
    loadProducts();
    loadDashboard();
    showNotification(existingData ? 'Product updated!' : 'Product added!');
}

function deleteProduct(index) {
    if (confirm('Delete this product?')) {
        const products = DB.get('products', []);
        products.splice(index, 1);
        DB.set('products', products);
        loadProducts();
        loadDashboard();
        showNotification('Product deleted');
    }
}

function editProduct(index) {
    const products = DB.get('products', []);
    openProductModal(products[index]);
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
    const settings = DB.get('settings', {
        companyName: 'My Business',
        email: 'info@mybusiness.com',
        phone: '+1 234 567 8900',
        address: '123 Business St, City, Country',
        logo: ''
    });

    document.getElementById('companyName').value = settings.companyName || '';
    document.getElementById('companyEmail').value = settings.email || '';
    document.getElementById('companyPhone').value = settings.phone || '';
    document.getElementById('companyAddress').value = settings.address || '';
    document.getElementById('companyLogoUrl').value = settings.logo || '';

    const users = getUsers();
    if (users.length > 0) {
        document.getElementById('settingsUsername').value = users[0].username || '';
    }
}

function saveSettings() {
    const settings = {
        companyName: document.getElementById('companyName').value.trim(),
        email: document.getElementById('companyEmail').value.trim(),
        phone: document.getElementById('companyPhone').value.trim(),
        address: document.getElementById('companyAddress').value.trim(),
        logo: document.getElementById('companyLogoUrl').value.trim()
    };

    DB.set('settings', settings);
    updateLogo();
    showNotification('Settings saved successfully!');
}

function updateLogo() {
    const url = document.getElementById('companyLogoUrl').value.trim();
    if (url) {
        document.getElementById('loginLogo').src = url;
        document.getElementById('sidebarLogo').src = url;
    }
}

function updateUser() {
    const username = document.getElementById('settingsUsername').value.trim();
    const password = document.getElementById('settingsPassword').value.trim();

    if (!username) {
        showNotification('Username is required', 'warning');
        return;
    }

    let users = getUsers();
    if (users.length === 0) {
        users = [{ username: 'admin', password: 'admin123', role: 'Admin' }];
    }

    users[0].username = username;
    if (password) {
        users[0].password = password;
    }

    DB.set('users', users);
    document.getElementById('currentUser').textContent = username;
    document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
    showNotification('User credentials updated!');
}

// ============================================
// DATA MANAGEMENT
// ============================================
function exportData() {
    const data = {
        customers: DB.get('customers', []),
        products: DB.get('products', []),
        invoices: DB.get('invoices', []),
        settings: DB.get('settings', {}),
        users: getUsers(),
        exportedAt: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Data exported successfully!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.customers) DB.set('customers', data.customers);
            if (data.products) DB.set('products', data.products);
            if (data.invoices) DB.set('invoices', data.invoices);
            if (data.settings) DB.set('settings', data.settings);
            if (data.users) DB.set('users', data.users);

            loadAllData();
            showNotification('Data imported successfully!');
            event.target.value = '';
        } catch (err) {
            showNotification('Invalid file format', 'error');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (confirm('⚠️ WARNING: This will delete ALL your data. Are you sure?')) {
        if (confirm('Final confirmation: Delete everything?')) {
            localStorage.clear();
            location.reload();
        }
    }
}

// ============================================
// THEME TOGGLE
// ============================================
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icons = document.querySelectorAll('.theme-toggle i, .theme-toggle-mobile i');
    const isLight = document.body.classList.contains('light-theme');
    icons.forEach(icon => {
        icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    });
    localStorage.setItem('invoice_theme', isLight ? 'light' : 'dark');
}

function loadTheme() {
    const theme = localStorage.getItem('invoice_theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelectorAll('.theme-toggle i, .theme-toggle-mobile i').forEach(icon => {
            icon.className = 'fas fa-sun';
        });
    }
}

// ============================================
// MODAL HELPERS
// ============================================
function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
}

// ============================================
// NOTIFICATIONS
// ============================================
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const colors = {
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
    };

    const div = document.createElement('div');
    div.className = 'notification';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${colors[type] || colors.success};
        color: white;
        border-radius: var(--radius-sm);
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        max-width: 400px;
        font-size: 14px;
    `;
    div.textContent = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => div.remove(), 300);
    }, 2500);
}

// ============================================
// INITIALIZE
// ============================================
function loadAllData() {
    loadDashboard();
    loadInvoices();
    loadCustomers();
    loadProducts();
    loadSettings();
    loadTheme();

    const settings = DB.get('settings', {});
    if (settings.logo) {
        document.getElementById('loginLogo').src = settings.logo;
        document.getElementById('sidebarLogo').src = settings.logo;
    }

    // Check session
    const session = sessionStorage.getItem('invoice_session');
    if (session === 'logged_in') {
        const users = getUsers();
        if (users.length > 0) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('currentUser').textContent = users[0].username;
            document.getElementById('userAvatar').textContent = users[0].username.charAt(0).toUpperCase();
        }
    }
}

// Add shake animation
const styleShake = document.createElement('style');
styleShake.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        75% { transform: translateX(8px); }
    }
`;
document.head.appendChild(styleShake);

// Initialize on load
window.onload = function() {
    loadAllData();
};