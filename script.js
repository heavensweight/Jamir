/* ============================
   INDEXEDDB PRODUCT STORAGE
============================= */

let db;
let products = [];
let cart = [];
let adminLoggedIn = false;
let invoiceCounter = 1000;

// Open or create IndexedDB
const request = indexedDB.open("JamirTradingDB", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const store = db.createObjectStore("products", { keyPath: "id" });
    console.log("Database created");
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadProductsFromDB();
};

request.onerror = function() {
    console.log("Error loading database");
};

/* Load products from DB */
function loadProductsFromDB() {
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");
    const getAll = store.getAll();

    getAll.onsuccess = function() {
        if (getAll.result.length === 0) {
            // If empty database, load initial products
            products = [
                { id: 1, name: 'Qora (Cow Feed)', price: 25.00, stock: 50, imageUrl: 'https://via.placeholder.com/250x150?text=Qora' },
                { id: 2, name: 'Vushi (Protein Mix)', price: 35.00, stock: 30, imageUrl: 'https://via.placeholder.com/250x150?text=Vushi' },
                { id: 3, name: 'Cow Supplement', price: 15.00, stock: 20, imageUrl: 'https://via.placeholder.com/250x150?text=Cow+Supplement' }
            ];
            saveAllProductsToDB();
        } else {
            products = getAll.result;
        }

        displayProducts();
    };
}

/* Save all products (first-time only) */
function saveAllProductsToDB() {
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    products.forEach(p => store.put(p));
}

/* Save single product */
function saveProductToDB(product) {
    const tx = db.transaction("products", "readwrite");
    tx.objectStore("products").put(product);
}

/* Delete product */
function deleteProductFromDB(id) {
    const tx = db.transaction("products", "readwrite");
    tx.objectStore("products").delete(id);
}

/* ============================
   DISPLAY PRODUCTS
============================= */
function displayProducts() {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h2>${product.name}</h2>
            <p class="price">$${product.price.toFixed(2)} per bag</p>
            <p class="stock">In Stock: ${product.stock}</p>
            <button onclick="addToCart('${product.id}')">Add to Cart</button>
        `;
        productList.appendChild(card);
    });

    displayAdminProducts();
}

/* ============================
        ADMIN
============================= */
function addProduct() {
    const name = productName.value;
    const price = parseFloat(productPrice.value);
    const stock = parseInt(productStock.value);
    const imageFile = productImage.files[0];

    if (!name || !price || !stock) return alert("Fill all fields");

    const id = Date.now();

    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const newProduct = { id, name, price, stock, imageUrl: e.target.result };
            products.push(newProduct);
            saveProductToDB(newProduct);
            displayProducts();
        };
        reader.readAsDataURL(imageFile);
    } else {
        const newProduct = {
            id, name, price, stock,
            imageUrl: "https://via.placeholder.com/250x150?text=No+Image"
        };
        products.push(newProduct);
        saveProductToDB(newProduct);
        displayProducts();
    }
}

function displayAdminProducts() {
    productSelect.innerHTML = '';
    products.forEach((p, i) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        productSelect.appendChild(opt);
    });
}

function removeProduct() {
    const id = parseInt(productSelect.value);
    products = products.filter(p => p.id !== id);
    deleteProductFromDB(id);
    displayProducts();
}

function loadProductForEdit() {
    const id = parseInt(productSelect.value);
    const p = products.find(pr => pr.id === id);

    productName.value = p.name;
    productPrice.value = p.price;
    productStock.value = p.stock;
    imagePreview.src = p.imageUrl;
}

function saveProductChanges() {
    const id = parseInt(productSelect.value);
    const p = products.find(pr => pr.id === id);

    p.name = productName.value;
    p.price = parseFloat(productPrice.value);
    p.stock = parseInt(productStock.value);

    const newImg = productImage.files[0];

    if (newImg) {
        const reader = new FileReader();
        reader.onload = e => {
            p.imageUrl = e.target.result;
            saveProductToDB(p);
            displayProducts();
        };
        reader.readAsDataURL(newImg);
    } else {
        saveProductToDB(p);
        displayProducts();
    }

    alert("Product updated!");
}

/* ============================
        CART SYSTEM
============================= */
function addToCart(id) {
    const product = products.find(p => p.id == id);
    if (!product || product.stock <= 0) return alert("Out of stock");

    product.stock--;
    saveProductToDB(product);

    cart.push({ id, productName: product.name, productPrice: product.price, qty: 1 });

    displayProducts();
    showAddedToCartMessage();
}

function showAddedToCartMessage() {
    const msg = addedToCartMessage;
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 2000);
}

function toggleCart() {
    cartSidebar.classList.toggle("open");
    updateCartSidebar();
}

function updateCartSidebar() {
    cartItemsList.innerHTML = "";

    if (cart.length === 0) {
        cartItemsList.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    cart.forEach(item => {
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <span>${item.productName} - $${item.productPrice}</span>
            <button onclick="removeFromCart('${item.id}')">Remove</button>
        `;
        cartItemsList.appendChild(div);
    });
}

function removeFromCart(id) {
    cart = cart.filter(c => c.id != id);
    updateCartSidebar();
}

/* ============================
   RECEIPT PRINTING
============================= */
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
    receipt += "Product             Price   Qty   Total\n";
    receipt += "-----------------------------\n";

    cart.forEach(item => {
        const lineTotal = item.productPrice * item.qty;
        total += lineTotal;

        receipt += `${item.productName.padEnd(20)} $${item.productPrice.toFixed(2).padStart(6)} x${item.qty.toString().padStart(3)} = $${lineTotal.toFixed(2).padStart(6)}\n`;
    });

    receipt += "-----------------------------\n";
    receipt += `Grand Total: $${total.toFixed(2)}\n`;
    receipt += "-----------------------------\n";

    // Increment invoice counter and save persistently
    invoiceCounter++;
    localStorage.setItem("invoiceCounter", invoiceCounter);

    const win = window.open("", "", "width=400,height=600");
    win.document.write("<pre>" + receipt + "</pre>");
    win.document.close();
    win.onload = () => {
        win.focus();
        win.print();
        win.close();
    };
}

/* ============================
      ADMIN LOGIN
============================= */
function adminLogin() {
    if (adminPassword.value === "jamirjeda") {
        adminPanel.style.display = "block";
        adminLogin.style.display = "none";
        adminLoggedIn = true;
    } else {
        alert("Incorrect password!");
    }
}
