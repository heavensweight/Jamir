// -----------------------------
// IndexedDB Setup
// -----------------------------
let db;
const request = indexedDB.open("JamirTradingDB", 1);

request.onerror = (event) => {
    console.error("IndexedDB error:", event.target.errorCode);
};

request.onsuccess = (event) => {
    db = event.target.result;
    loadProductsFromDB();
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("orders")) {
        db.createObjectStore("orders", { keyPath: "id", autoIncrement: true }); 
    }
};

// -----------------------------
// Variables
// -----------------------------
let products = [];
let cart = [];
let adminLoggedIn = false;
let invoiceCounter = 1000;
let currentQty = {}; // To store the quantity chosen before adding to cart

// -----------------------------
// Load Products from IndexedDB
// -----------------------------
function loadProductsFromDB() {
    const transaction = db.transaction("products", "readonly");
    const store = transaction.objectStore("products");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        products = getAll.result.length ? getAll.result : [
            { name: 'Qora (Cow Feed)', price: 25.00, stock: 50, id: Date.now() + 1, imageUrl: 'https://via.placeholder.com/250x150?text=Qora', details: 'High-quality feed.' },
            { name: 'Vushi (Protein Mix)', price: 35.00, stock: 30, id: Date.now() + 2, imageUrl: 'https://via.placeholder.com/250x150?text=Vushi', details: 'Protein-rich supplement.' },
            { name: 'Cow Supplement', price: 15.00, stock: 20, id: Date.now() + 3, imageUrl: 'https://via.placeholder.com/250x150?text=Cow+Supplement', details: 'Vitamin mix for cows.' }
        ];
        
        // Initialize currentQty map for all products
        products.forEach(p => { currentQty[p.id] = 1; });
        displayProducts();
    };
}

// -----------------------------
// Display Products (MODIFIED for +/- buttons)
// -----------------------------
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        const inStock = product.stock > 0;
        const buttonText = inStock ? 'Add to Cart' : 'Out of Stock';
        const buttonDisabled = inStock ? '' : 'disabled';
        
        // Ensure quantity doesn't exceed available stock
        if (currentQty[product.id] > product.stock) {
            currentQty[product.id] = product.stock > 0 ? product.stock : 1;
        }

        // Check if item is already in cart to display remaining stock correctly
        const itemInCart = cart.find(c => c.id === product.id);
        const effectiveStock = product.stock; 
        
        // Structure ADDED: + and - buttons instead of a direct number input
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p class="price">$${product.price.toFixed(2)} per bag</p>
            <p class="stock">Stock: ${effectiveStock}</p>
            
            <div style="display:flex; justify-content: center; align-items: center; gap: 10px; margin-top: 15px;">
                <button onclick="updateProductQtyInput(${product.id}, -1)" ${buttonDisabled} style="padding: 5px 10px;">-</button>
                <span id="productQty_${product.id}" style="width: 30px; text-align: center; font-weight: bold;">${currentQty[product.id]}</span>
                <button onclick="updateProductQtyInput(${product.id}, 1)" ${buttonDisabled} style="padding: 5px 10px;">+</button>
            </div>
                       
            <button onclick="addToCart(${product.id})" ${buttonDisabled} style="margin-top: 10px;">${buttonText}</button>
            <button onclick="viewDetails(${product.id})" 
                    style="margin-top: 10px; background-color: #6c757d; color: white;">Details</button>
        `;
        productList.appendChild(productCard);
    });

    displayAdminProducts();
}

// NEW FUNCTION: Updates the visible quantity input on the product card
function updateProductQtyInput(id, change) {
    const product = products.find(p => p.id === id);
    if (!product || !currentQty[id]) return;

    let newQty = currentQty[id] + change;
    const qtySpan = document.getElementById(`productQty_${id}`);

    if (newQty < 1) { newQty = 1; }
    
    // Check against available stock
    if (newQty > product.stock) {
        alert("Cannot select more than available stock.");
        newQty = product.stock;
    }
    
    currentQty[id] = newQty;
    if (qtySpan) {
        qtySpan.textContent = newQty;
    }
}

// -----------------------------
// View Product Details (unchanged)
// -----------------------------
function viewDetails(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    document.getElementById('detailsContent').innerHTML = `
        <h2>${product.name}</h2>
        <img src="${product.imageUrl}" style="width:100%; margin-bottom:10px;">
        <p>Price: $${product.price.toFixed(2)}</p>
        <p>Stock: ${product.stock}</p>
        <p>Details: ${product.details || 'No details added'}</p>
    `;
    document.getElementById('detailsModal').style.display = 'block';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// -----------------------------
// Add to Cart
// -----------------------------
function addToCart(id) {
    const product = products.find(p => p.id === id);
    // Get quantity from currentQty map
    let qty = currentQty[id];
    
    if (!product || qty <= 0 || qty > product.stock) {
        alert("Invalid quantity or out of stock.");
        return;
    }

    const cartItem = cart.find(c => c.id === id);
    if (cartItem) {
        if (cartItem.qty + qty > product.stock) {
            alert("Not enough stock.");
            return;
        }
        cartItem.qty += qty;
    } else {
        cart.push({ 
            id: product.id, 
            name: product.name, 
            price: product.price, 
            qty: qty 
        }); 
    }

    product.stock -= qty;
    
    // Reset quantity input selection to 1 for the next item/click
    currentQty[id] = 1; 

    displayProducts();
    updateCartSidebar();
    showSuccessModal(); // NEW: Show centered success modal
    saveProductsToDB();
}

// -----------------------------
// Show Success Modal (NEW)
// -----------------------------
function showSuccessModal() {
    document.getElementById('successModal').style.display = 'block';
}

function closeSuccessModal() {
    document.getElementById('successModal').style.display = 'none';
}

// -----------------------------
// Cart Sidebar (unchanged from last full version)
// -----------------------------
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    updateCartSidebar();
}

function updateCartSidebar() {
    const cartItemsList = document.getElementById('cartItemsList');
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<p>Your cart is empty.</p>';
        return;
    }
    
    let total = 0;

    cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        total += lineTotal;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div>
                <span>${item.name} ($${item.price.toFixed(2)})</span>
                <div style="display:flex; align-items:center; gap: 5px; margin-top: 5px;">
                    <button onclick="updateCartItemQty(${item.id}, -1)" 
                            style="background-color:#ccc; color:#333; padding: 3px 8px; border-radius: 3px; font-weight: bold;">-</button>
                    <span>Qty: ${item.qty}</span>
                    <button onclick="updateCartItemQty(${item.id}, 1)" 
                            style="background-color:#007A3D; color:white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">+</button>
                </div>
            </div>
            <span>$${lineTotal.toFixed(2)}</span>
            <button onclick="removeFromCart(${item.id})">Remove</button>
        `;
        cartItemsList.appendChild(div);
    });
    
    cartItemsList.innerHTML += `<hr><strong>Grand Total: $${total.toFixed(2)}</strong>`;
}

function updateCartItemQty(id, change) {
    const cartItem = cart.find(c => c.id === id);
    const product = products.find(p => p.id === id);

    if (!cartItem || !product) return;

    const newQty = cartItem.qty + change;

    if (newQty < 1) {
        removeFromCart(id);
        return;
    }

    if (change > 0) {
        if (product.stock < change) {
            alert("Cannot add more, insufficient stock.");
            return;
        }
        product.stock -= change;
        cartItem.qty += change;
    } else if (change < 0) {
        product.stock -= change; 
        cartItem.qty += change;
    }

    displayProducts();
    updateCartSidebar();
    saveProductsToDB();
}

function removeFromCart(id) {
    const index = cart.findIndex(c => c.id === id);
    if (index > -1) {
        products.find(p => p.id === id).stock += cart[index].qty;
        // Also ensure currentQty selection is valid
        currentQty[id] = 1; 
        
        cart.splice(index, 1);
        displayProducts();
        updateCartSidebar();
        saveProductsToDB();
    }
}

// -----------------------------
// Receipt Preview & Print (MODIFIED: Added Cancel Button)
// -----------------------------
function printCart() {
    if (cart.length === 0) {
        alert("Your cart is empty! Cannot proceed to checkout.");
        return;
    }
    
    let total = 0;
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let receipt = "";
    receipt += "       JAMIR TRADING\n";
    receipt += "     Cow Feed & Supplies\n";
    receipt += "-----------------------------\n";
    receipt += `Invoice #: ${invoiceCounter}\n`;
    receipt += `Date: ${dateStr} Time: ${timeStr}\n`;
    receipt += "-----------------------------\n";

    cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        total += lineTotal;
        receipt += `${item.name.padEnd(15)} $${item.price.toFixed(2).padEnd(5)} x${item.qty.toString().padEnd(2)} = $${lineTotal.toFixed(2)}\n`;
    });

    receipt += "-----------------------------\n";
    receipt += `Grand Total: $${total.toFixed(2)}\n`;
    receipt += "-----------------------------\n";

    document.getElementById("receiptContent").textContent = receipt;
    document.getElementById("receiptModal").style.display = "block";
    
    // IMPORTANT: Save the order to DB before clearing the cart
    saveOrder(cart, now.getTime(), total, invoiceCounter); 
    
    // Clear cart after 'checkout' (assuming user will finalize/cancel later)
    cart = [];
    updateCartSidebar();
    
    invoiceCounter++;
    
    // MODIFICATION: Add Cancel button next to Print Invoice in the modal content
    const modalContent = document.querySelector('#receiptModal .modal-content');
    let buttonsDiv = modalContent.querySelector('.receipt-buttons');
    if (!buttonsDiv) {
        buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'receipt-buttons';
        buttonsDiv.style.marginTop = '15px';
        buttonsDiv.style.display = 'flex';
        buttonsDiv.style.justifyContent = 'space-between';
        
        // Remove existing button if it was added without the container
        const existingPrintBtn = modalContent.querySelector('button[onclick="printReceipt()"]');
        if(existingPrintBtn) existingPrintBtn.remove();
        
        modalContent.appendChild(buttonsDiv);
    }
    buttonsDiv.innerHTML = `
        <button onclick="printReceipt()">Print Invoice</button>
        <button onclick="closeReceiptModal()" style="background-color: #dc3545;">Cancel</button>
    `;

    // Ensure only one close button remains
    const closeSpan = modalContent.querySelector('.close');
    if(closeSpan) closeSpan.remove();
}

// Print actual invoice from modal
function printReceipt() {
    const content = document.getElementById("receiptContent").textContent;
    const printWindow = window.open("", "", "width=400,height=600");
    printWindow.document.write("<pre>" + content + "</pre>");
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
    closeReceiptModal();
}

// Close modal
function closeReceiptModal() {
    document.getElementById("receiptModal").style.display = "none";
}

// -----------------------------
// Admin functions (unchanged)
// -----------------------------
function adminLogin() {
    const pass = document.getElementById('adminPassword').value;
    if (pass === "jamirjeda") { 
        adminLoggedIn = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        displayAdminProducts();
    } else {
        alert("Incorrect password!");
    }
}

function displayAdminProducts() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '';
    products.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = product.name;
        select.appendChild(option);
    });
}

function addProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const details = document.getElementById('productDetails').value;
    const imageFile = document.getElementById('productImage').files[0];
    let imageUrl = imageFile ? URL.createObjectURL(imageFile) : "https://via.placeholder.com/250x150?text=No+Image";

    if (!name || isNaN(price) || isNaN(stock)) { alert("Fill all fields with valid data."); return; }

    const id = Date.now();
    const product = { id, name, price, stock, imageUrl, details };
    products.push(product);
    displayProducts();
    displayAdminProducts();
    saveProductsToDB();
    
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDetails').value = '';
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').src = '';
}

function removeProduct() {
    const index = document.getElementById('productSelect').value;
    if (index >= 0) {
        if (cart.some(item => item.id === products[index].id)) {
            alert("Cannot remove product while it is in the current session's cart.");
            return;
        }
        products.splice(index, 1);
        displayProducts();
        displayAdminProducts();
        saveProductsToDB();
    }
}

function loadProductForEdit() {
    const index = document.getElementById('productSelect').value;
    const product = products[index];
    if (!product) return;
    
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDetails').value = product.details || '';
    document.getElementById('imagePreview').src = product.imageUrl;
}

function saveProductChanges() {
    const index = document.getElementById('productSelect').value;
    const product = products[index];
    if (!product) return;

    product.name = document.getElementById('productName').value;
    product.price = parseFloat(document.getElementById('productPrice').value);
    product.stock = parseInt(document.getElementById('productStock').value);
    product.details = document.getElementById('productDetails').value;

    if (isNaN(product.price) || isNaN(product.stock)) { alert("Price and Stock must be valid numbers."); return; }

    const newImage = document.getElementById('productImage').files[0];
    if (newImage) { product.imageUrl = URL.createObjectURL(newImage); }

    displayProducts();
    displayAdminProducts();
    saveProductsToDB();
    alert("Product changes saved successfully!");
}

function saveProductsToDB() {
    if (!db) return;
    const transaction = db.transaction("products", "readwrite");
    const store = transaction.objectStore("products");
    store.clear();
    products.forEach(p => store.put(p));
}

function saveOrder(cartItems, date, total, invoiceId) {
    if (!db) return;
    const transaction = db.transaction("orders", "readwrite");
    const store = transaction.objectStore("orders");
    const order = { 
        invoiceId: invoiceId,
        cartItems: cartItems, 
        date: date, 
        total: total 
    };
    store.add(order);
}

function viewOrders(filter) {
    if (!db) return;
    const transaction = db.transaction("orders", "readonly");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        const orders = getAll.result;
        const now = new Date();
        let startTime = new Date(0).getTime(); 
        
        if (filter === "day") {
            startTime = new Date(now.setHours(0, 0, 0, 0)).getTime();
        } else if (filter === "week") {
            let weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            startTime = new Date(weekAgo.setHours(0, 0, 0, 0)).getTime();
        } else if (filter === "month") {
            let monthStart = new Date(now);
            monthStart.setDate(1);
            startTime = new Date(monthStart.setHours(0, 0, 0, 0)).getTime();
        }

        const filteredOrders = orders.filter(o => o.date >= startTime);

        const summaryDiv = document.getElementById('orderSummary');
        if (!filteredOrders.length) {
            summaryDiv.innerHTML = `<p style="color: #dc3545;">No orders found for the ${filter} filter.</p>`;
            return;
        }

        let totalRevenue = 0;
        let html = `<h4>Order Summary for ${filter.toUpperCase()} (${filteredOrders.length} Orders)</h4>`;
        html += "<ul style='list-style: none; padding: 0;'>";
        
        filteredOrders.forEach(order => {
            totalRevenue += order.total;
            const orderDate = new Date(order.date).toLocaleString();
            
            html += `<li style="border: 1px solid #ccc; margin-bottom: 10px; padding: 10px; border-radius: 4px;">
                        <strong>Invoice #${order.invoiceId}</strong> (Date: ${orderDate})<br>
                        <ul style="list-style: disc; margin-left: 20px;">`;
                        
            order.cartItems.forEach(item => {
                html += `<li>${item.name} x${item.qty} @ $${item.price.toFixed(2)}</li>`;
            });
            html += `</ul><strong>Order Total: $${order.total.toFixed(2)}</strong></li>`;
        });
        html += "</ul>";
        
        html += `<h3>Total Revenue: $${totalRevenue.toFixed(2)}</h3>`;
        summaryDiv.innerHTML = html;
    };
}

function previewImage(event) {
    if (event.target.files && event.target.files[0]) {
        document.getElementById('imagePreview').src = URL.createObjectURL(event.target.files[0]);
    }
}
// Existing IndexedDB setup, products/cart/admin variables remain unchanged

// -----------------------------
// INVOICE MANAGEMENT
// -----------------------------
function loadInvoices() {
    if (!db) return;
    const transaction = db.transaction("orders", "readonly");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();
    getAll.onsuccess = () => {
        const invoiceSelect = document.getElementById('invoiceSelect');
        invoiceSelect.innerHTML = '';
        getAll.result.forEach((order, idx) => {
            const option = document.createElement('option');
            option.value = idx;
            option.textContent = `Invoice #${order.invoiceId}`;
            invoiceSelect.appendChild(option);
        });
    };
}

function loadInvoiceForEdit() {
    const idx = document.getElementById('invoiceSelect').value;
    if (!db || idx === '') return;

    const transaction = db.transaction("orders", "readonly");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();
    getAll.onsuccess = () => {
        const order = getAll.result[idx];
        const container = document.getElementById('invoiceItems');
        container.innerHTML = '';
        if (!order) return;
        order.cartItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'invoice-item';
            div.innerHTML = `
                <span>${item.name} ($${item.price.toFixed(2)})</span>
                <input type="number" min="1" value="${item.qty}" onchange="updateInvoiceQty(${idx}, ${index}, this.value)">
                <button onclick="removeInvoiceItem(${idx}, ${index})" style="background-color:#dc3545;color:white;">Remove</button>
            `;
            container.appendChild(div);
        });
        container.innerHTML += `<strong>Invoice Total: $<span id="invoiceTotal">${order.total.toFixed(2)}</span></strong>`;
    };
}

function updateInvoiceQty(invoiceIdx, itemIdx, newQty) {
    if (!db) return;
    const transaction = db.transaction("orders", "readwrite");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();
    getAll.onsuccess = () => {
        const orders = getAll.result;
        const order = orders[invoiceIdx];
        newQty = parseInt(newQty);
        if (newQty < 1) newQty = 1;
        order.cartItems[itemIdx].qty = newQty;
        // Recalculate total
        order.total = order.cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);
        store.put(order);
        document.getElementById('invoiceTotal').textContent = order.total.toFixed(2);
    };
}

function removeInvoiceItem(invoiceIdx, itemIdx) {
    if (!db) return;
    const transaction = db.transaction("orders", "readwrite");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();
    getAll.onsuccess = () => {
        const orders = getAll.result;
        const order = orders[invoiceIdx];
        order.cartItems.splice(itemIdx,1);
        order.total = order.cartItems.reduce((sum,i)=>sum+i.qty*i.price,0);
        store.put(order);
        loadInvoiceForEdit();
    };
}

function saveInvoiceChanges() {
    alert("Invoice changes saved successfully!");
}

// -----------------------------
// SALES REPORT
// -----------------------------
let currentReport = [];

function generateSalesReport() {
    const start = new Date(document.getElementById('reportStart').value).getTime();
    const end = new Date(document.getElementById('reportEnd').value).getTime() + 86400000; // Include full end day
    if (!db || isNaN(start) || isNaN(end)) return alert("Select valid date range.");

    const transaction = db.transaction("orders", "readonly");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();
    getAll.onsuccess = () => {
        const orders = getAll.result.filter(o => o.date >= start && o.date <= end);
        currentReport = orders; // Save for CSV
        if (!orders.length) {
            document.getElementById('salesReport').innerHTML = "<p>No orders in this range.</p>";
            return;
        }
        let html = "<table class='sales-report-table'><tr><th>Invoice</th><th>Date</th><th>Products</th><th>Total</th></tr>";
        let totalRevenue = 0;
        orders.forEach(order => {
            totalRevenue += order.total;
            const productsStr = order.cartItems.map(i => `${i.name} x${i.qty}`).join(", ");
            html += `<tr><td>${order.invoiceId}</td><td>${new Date(order.date).toLocaleString()}</td><td>${productsStr}</td><td>$${order.total.toFixed(2)}</td></tr>`;
        });
        html += `<tr><td colspan="3"><strong>Total Revenue</strong></td><td><strong>$${totalRevenue.toFixed(2)}</strong></td></tr>`;
        html += "</table>";
        document.getElementById('salesReport').innerHTML = html;
    };
}

function downloadCSV() {
    if (!currentReport.length) return alert("Generate report first.");
    let csv = "Invoice,Date,Products,Total\n";
    currentReport.forEach(order => {
        const productsStr = order.cartItems.map(i => `${i.name} x${i.qty}`).join("|");
        csv += `${order.invoiceId},${new Date(order.date).toLocaleString()},${productsStr},${order.total.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_report_${Date.now()}.csv`;
    link.click();
}

function printReport() {
    if (!currentReport.length) return alert("Generate report first.");
    const content = document.getElementById('salesReport').innerHTML;
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write('<html><head><title>Sales Report</title></head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// -----------------------------
// Override displayAdminProducts to load invoices
// -----------------------------
function displayAdminProducts() {
    const select = document.getElementById('productSelect');
    select.innerHTML = '';
    products.forEach((product, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = product.name;
        select.appendChild(option);
    });
    loadInvoices();
}

// -----------------------------
// Call loadProductsFromDB on startup (unchanged from previous code)
// -----------------------------
