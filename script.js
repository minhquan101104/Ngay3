const API_URL = "https://api.escuelajs.co/api/v1/products";
let allProducts = [], filteredProducts = [];
let currentPage = 1, itemsPerPage = 10;
let sortDirection = { title: 'asc', price: 'asc' };

// 1. KHỞI TẠO
document.addEventListener("DOMContentLoaded", () => {
    fetchData(); // Tải dữ liệu

    // Sự kiện Tìm kiếm
    document.getElementById("searchInput").addEventListener("input", (e) => {
        const key = e.target.value.toLowerCase();
        filteredProducts = allProducts.filter(p => p.title.toLowerCase().includes(key));
        currentPage = 1; renderTable(); renderPagination();
    });

    // Sự kiện đổi số trang
    document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; renderTable(); renderPagination();
    });
});

// 2. LẤY DATA
async function fetchData() {
    try {
        const res = await fetch(API_URL);
        allProducts = await res.json();
        filteredProducts = [...allProducts];
        renderTable(); renderPagination();
    } catch (err) { console.error(err); }
}

// 3. RENDER BẢNG
function renderTable() {
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = "";
    const start = (currentPage - 1) * itemsPerPage;
    const displayData = filteredProducts.slice(start, start + itemsPerPage);

    displayData.forEach(p => {
        // Xử lý ảnh lỗi
        let img = (p.images && p.images.length > 0) ? p.images[0].replace(/[\[\]"]/g, '') : "https://placehold.co/50x50";
        if(!img.startsWith('http')) img = "https://placehold.co/50x50";

        const tr = document.createElement("tr");
        tr.setAttribute("data-bs-toggle", "tooltip");
        tr.setAttribute("title", p.description); // Tooltip Description
        
        tr.innerHTML = `
            <td>${p.id}</td>
            <td class="fw-bold text-primary">${p.title}</td>
            <td class="text-danger">$${p.price}</td>
            <td><span class="badge bg-info text-dark">${p.category ? p.category.name : 'N/A'}</span></td>
            <td><img src="${img}" class="product-img"></td>
        `;
        
        // Sự kiện click vào dòng để MỞ MODAL EDIT
        tr.addEventListener('click', () => openEditModal(p.id));
        tbody.appendChild(tr);
    });

    // Kích hoạt Tooltip Bootstrap
    [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]')).map(el => new bootstrap.Tooltip(el));
}

// 4. CHỨC NĂNG SORT
function handleSort(col) {
    sortDirection[col] = sortDirection[col] === 'asc' ? 'desc' : 'asc';
    
    // Cập nhật icon
    document.querySelectorAll('.sort-icon').forEach(i => i.className = 'fa-solid fa-sort sort-icon');
    document.getElementById(`sort-${col}`).className = `fa-solid fa-sort-${sortDirection[col] === 'asc' ? 'up' : 'down'} sort-icon sort-active`;

    filteredProducts.sort((a, b) => {
        let vA = a[col], vB = b[col];
        if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB.toLowerCase(); }
        return (vA < vB ? -1 : 1) * (sortDirection[col] === 'asc' ? 1 : -1);
    });
    renderTable();
}

// 5. PHÂN TRANG
function renderPagination() {
    const total = Math.ceil(filteredProducts.length / itemsPerPage);
    const ul = document.getElementById("pagination");
    ul.innerHTML = "";
    
    // Giới hạn hiển thị 5 trang đầu
    for (let i = 1; i <= Math.min(total, 5); i++) {
        ul.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="currentPage=${i};renderTable();renderPagination()">${i}</a>
        </li>`;
    }
}

// 6. EXPORT CSV
function exportToCSV() {
    if (filteredProducts.length === 0) return Swal.fire("Lỗi", "Không có dữ liệu!", "warning");
    
    const header = ["ID,Title,Price,Description"];
    const rows = filteredProducts.map(p => `${p.id},"${p.title.replace(/"/g, '""')}",${p.price},"${p.description.replace(/"/g, '""')}"`);
    const csvContent = "data:text/csv;charset=utf-8," + header.concat(rows).join("\n");
    
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "products.csv";
    link.click();
}

// 7. TẠO MỚI (CREATE)
function createProduct() {
    const payload = {
        title: document.getElementById("cTitle").value,
        price: parseInt(document.getElementById("cPrice").value),
        description: document.getElementById("cDesc").value,
        categoryId: parseInt(document.getElementById("cCatId").value),
        images: [document.getElementById("cImg").value]
    };

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire("Thành công", "Đã tạo sản phẩm!", "success");
        allProducts.unshift(data); // Thêm vào đầu danh sách
        filteredProducts = [...allProducts];
        renderTable();
        bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
        document.getElementById("createForm").reset();
    })
    .catch(err => Swal.fire("Lỗi", "Không thể tạo mới", "error"));
}

// 8. XEM & SỬA (EDIT)
let currentEditId = null;

function openEditModal(id) {
    const p = allProducts.find(x => x.id == id);
    if (!p) return;
    
    currentEditId = id;
    document.getElementById("eId").value = p.id;
    document.getElementById("eTitle").value = p.title;
    document.getElementById("ePrice").value = p.price;
    document.getElementById("eDesc").value = p.description;
    
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function updateProduct() {
    const payload = {
        title: document.getElementById("eTitle").value,
        price: parseInt(document.getElementById("ePrice").value),
        description: document.getElementById("eDesc").value
    };

    fetch(`${API_URL}/${currentEditId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        Swal.fire("Thành công", "Đã cập nhật!", "success");
        // Cập nhật lại mảng cục bộ
        const idx = allProducts.findIndex(x => x.id == currentEditId);
        if (idx !== -1) allProducts[idx] = { ...allProducts[idx], ...data };
        
        filteredProducts = [...allProducts];
        renderTable();
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    })
    .catch(err => Swal.fire("Lỗi", "Không thể cập nhật (Có thể ID này bị khoá bởi API)", "error"));
}