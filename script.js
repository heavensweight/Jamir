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
        db.createObjectStore("orders", { autoIncrement: true });
    }
};

// -----------------------------
// Variables
// -----------------------------
let products = [];
let cart = [];
let adminLoggedIn = false;
let invoiceCounter = 1000;

// -----------------------------
// Load Products from IndexedDB
// -----------------------------
function loadProductsFromDB() {
    const transaction = db.transaction("products", "readonly");
    const store = transaction.objectStore("products");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        products = getAll.result.length ? getAll.result : [
            { name: 'Qora (Cow Feed)', price: 25.00, stock: 50, id: Date.now()+1, imageUrl: 'https://via.placeholder.com/250x150?text=Qora', details: 'High-quality feed.' },
            { name: 'Vushi (Protein Mix)', price: 35.00, stock: 30, id: Date.now()+2, imageUrl: 'https://via.placeholder.com/250x150?text=Vushi', details: 'Protein-rich supplement.' },
            { name: 'Cow Supplement', price: 15.00, stock: 20, id: Date.now()+3, imageUrl: 'https://via.placeholder.com/250x150?text=Cow+Supplement', details: 'Vitamin mix for cows.' }
        ];
        displayProducts();
    };
}

// -----------------------------
// Display Products
// -----------------------------
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p class="price">$${product.price.toFixed(2)} per bag</p>
            <p class="stock">In Stock: ${product.stock} bags</p>
            <input type="number" min="1" max="${product.stock}" value="1" id="qty_${product.id}">
            <button onclick="addToCart(${product.id})">Add to Cart</button>
            <button onclick="viewDetails(${product.id})">View Details</button>
        `;
        productList.appendChild(productCard);
    });

    displayAdminProducts();
}

// -----------------------------
// View Product Details
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
    const qtyInput = document.getElementById(`qty_${id}`);
    let qty = parseInt(qtyInput.value);
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
        cart.push({ ...product, qty });
    }

    product.stock -= qty;
    displayProducts();
    updateCartSidebar();
    showAddedToCartMessage();
    saveProductsToDB();
}

// -----------------------------
// Show Added to Cart Message
// -----------------------------
function showAddedToCartMessage() {
    const msg = document.getElementById('addedToCartMessage');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

// -----------------------------
// Cart Sidebar
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

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <span>${item.name} - $${item.price.toFixed(2)} x${item.qty}</span>
            <button onclick="removeFromCart(${item.id})">Remove</button>
        `;
        cartItemsList.appendChild(div);
    });
}

function removeFromCart(id) {
    const index = cart.findIndex(c => c.id === id);
    if (index > -1) {
        products.find(p => p.id === id).stock += cart[index].qty;
        cart.splice(index, 1);
        displayProducts();
        updateCartSidebar();
        saveProductsToDB();
    }
}

// -----------------------------
// Receipt Preview & Print
// -----------------------------
// Show receipt modal with preview
function printCart() {
    let total = 0;
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    let receipt = "";
    receipt += "       JAMIR TRADING\n";
    receipt += "   Cow Feed & Supplies\n";
    receipt += "-----------------------------\n";
    receipt += `Invoice #: ${invoiceCounter}\n`;
    receipt += `Date: ${dateStr} Time: ${timeStr}\n`;
    receipt += "-----------------------------\n";

    cart.forEach(item => {
        const lineTotal = item.productPrice * item.qty;
        total += lineTotal;
        receipt += `${item.productName}  $${item.productPrice}  x${item.qty} = $${lineTotal}\n`;
    });

    receipt += "-----------------------------\n";
    receipt += `Grand Total: $${total}\n`;
    receipt += "-----------------------------\n";

    // Save receipt content to modal
    document.getElementById("receiptContent").textContent = receipt;

    // Show modal
    document.getElementById("receiptModal").style.display = "block";

    invoiceCounter++;
}

// Print actual invoice from modal
function printReceipt() {
    const content = document.getElementById("receiptContent").textContent;

    // Open print window
    const printWindow = window.open("", "", "width=400,height=600");
    printWindow.document.write("<pre>" + content + "</pre>");
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

// Close modal
function closeReceiptModal() {
    document.getElementById("receiptModal").style.display = "none";
}

// -----------------------------
// Admin Login
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

// -----------------------------
// Admin Product Functions
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
}

function addProduct() {
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const stock = parseInt(document.getElementById('productStock').value);
    const details = document.getElementById('productDetails').value;
    const imageFile = document.getElementById('productImage').files[0];
    let imageUrl = imageFile ? URL.createObjectURL(imageFile) : "https://via.placeholder.com/250x150?text=No+Image";

    if (!name || !price || !stock) { alert("Fill all fields."); return; }

    const id = Date.now();
    const product = { id, name, price, stock, imageUrl, details };
    products.push(product);
    displayProducts();
    displayAdminProducts();
    saveProductsToDB();
}

function removeProduct() {
    const index = document.getElementById('productSelect').value;
    if (index >= 0) {
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

    const newImage = document.getElementById('productImage').files[0];
    if (newImage) { product.imageUrl = URL.createObjectURL(newImage); }

    displayProducts();
    displayAdminProducts();
    saveProductsToDB();
}

// -----------------------------
// IndexedDB Save Functions
// -----------------------------
function saveProductsToDB() {
    const transaction = db.transaction("products", "readwrite");
    const store = transaction.objectStore("products");
    store.clear();
    products.forEach(p => store.put(p));
}

function saveOrder(cartItems, date, total) {
    const transaction = db.transaction("orders", "readwrite");
    const store = transaction.objectStore("orders");
    const order = { cartItems, date, total };
    store.add(order);
}

// -----------------------------
// Admin: View Orders
// -----------------------------
function viewOrders(filter) {
    const transaction = db.transaction("orders", "readonly");
    const store = transaction.objectStore("orders");
    const getAll = store.getAll();

    getAll.onsuccess = () => {
        const orders = getAll.result;
        const now = new Date();
        let filteredOrders = orders;

        if (filter === "day") {
            filteredOrders = orders.filter(o => new Date(o.date).toDateString() === now.toDateString());
        } else if (filter === "week") {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            filteredOrders = orders.filter(o => new Date(o.date) >= weekAgo);
        } else if (filter === "month") {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            filteredOrders = orders.filter(o => new Date(o.date) >= monthAgo);
        }

        const summaryDiv = document.getElementById('orderSummary');
        if (!filteredOrders.length) {
            summaryDiv.innerHTML = "No orders for this period.";
            return;
        }

        let html = "<ul>";
        filteredOrders.forEach(order => {
            order.cartItems.forEach(item => {
                html += `<li>${item.name} - Qty: ${item.qty} - $${item.price.toFixed(2)}</li>`;
            });
            html += `<strong>Total: $${order.total.toFixed(2)}</strong><hr>`;
        });
        html += "</ul>";
        summaryDiv.innerHTML = html;
    };
}

// -----------------------------
// Preview Admin Image
// -----------------------------
function previewImage(event) {
    document.getElementById('imagePreview').src = URL.createObjectURL(event.target.files[0]);
}
