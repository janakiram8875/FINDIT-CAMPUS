function showLogin(){
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("registerBox").style.display = "none";
    clearAuthMessages();
}
function showRegister(){
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("registerBox").style.display = "block";
    clearAuthMessages();
}
async function register(){
    const name =
        document.getElementById("registerName").value.trim();
    const email =
        document.getElementById("registerEmail").value.trim().toLowerCase();
    const password =
        document.getElementById("registerPassword").value;
    const confirm =
        document.getElementById("registerConfirmPassword").value;
    if(!name || !email || !password || !confirm){
        showAuthMessage(
            "registerMessage",
            "Please fill all details.",
            "error"
        );
        return;
    }
    if(!validateEmail(email)){
        showAuthMessage(
            "registerMessage",
            "Please enter a valid email address.",
            "error"
        );
        return;
    }
    if(password.length < 6){
        showAuthMessage(
            "registerMessage",
            "Password must contain at least 6 characters.",
            "error"
        );
        return;
    }
    if(password !== confirm){
        showAuthMessage(
            "registerMessage",
            "Passwords do not match.",
            "error"
        );
        return;
    }
    users =
        JSON.parse(localStorage.getItem("finditUsers")) || [];
    const exists =
        users.some(user => user.email === email);
    if(exists){
        showAuthMessage(
            "registerMessage",
            "Email already registered. Please login.",
            "error"
        );
        return;
    }
    const passwordHash = await hashPassword(password);
    const newUser = {
        id:Date.now().toString(),
        name:name,
        email:email,
        passwordHash:passwordHash,
        createdAt:new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(
        "finditUsers",
        JSON.stringify(users)
    );
    showAuthMessage(
        "registerMessage",
        "Registration successful. Please login.",
        "success"
    );
    document.getElementById("registerName").value = "";
    document.getElementById("registerEmail").value = "";
    document.getElementById("registerPassword").value = "";
    document.getElementById("registerConfirmPassword").value = "";
    setTimeout(showLogin,1200);
}
async function login(){
    const email =
        document.getElementById("loginEmail").value.trim().toLowerCase();
    const password =
        document.getElementById("loginPassword").value;
    if(!email || !password){
        showAuthMessage(
            "loginMessage",
            "Please enter email and password.",
            "error"
        );
        return;
    }
    users =
        JSON.parse(localStorage.getItem("finditUsers")) || [];
    const passwordHash = await hashPassword(password);
    let user = users.find(
        u =>
            u.email === email &&
            u.passwordHash === passwordHash
    );
    if(!user){
        const legacyUser = users.find(
            u => u.email === email && u.password === password
        );
        if(legacyUser){
            delete legacyUser.password;
            legacyUser.passwordHash = passwordHash;
            localStorage.setItem("finditUsers", JSON.stringify(users));
            user = legacyUser;
        }
    }
    if(!user){
        showAuthMessage(
            "loginMessage",
            "Invalid email or password.",
            "error"
        );
        return;
    }
    currentUser = user;
    localStorage.setItem(
        "finditCurrentUser",
        JSON.stringify(user)
    );
    openApp();
}
function logout(){
    localStorage.removeItem("finditCurrentUser");
    currentUser = null;
    document.getElementById("app").style.display = "none";
    document.getElementById("authScreen").style.display = "flex";
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginPassword").value = "";
    showLogin();
}
function openApp(){
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("currentUserName").textContent =
        currentUser ? currentUser.name : "";
    loadItems();
    notifications = JSON.parse(localStorage.getItem("finditCampusNotifications")) || [];
    renderAllItems();
}
async function hashPassword(password){
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(byte => byte.toString(16).padStart(2,"0"))
        .join("");
}
function validateEmail(email){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function showAuthMessage(id,text,type){
    const box = document.getElementById(id);
    box.textContent = text;
    box.className = "message " + type;
}
function clearAuthMessages(){
    document.getElementById("loginMessage").className = "message";
    document.getElementById("registerMessage").className = "message";
}
/* =====================================================
   TYPE SELECTION
===================================================== */
function selectType(type){
    selectedType = type;
    const lostBtn =
        document.getElementById("lostTypeBtn");
    const foundBtn =
        document.getElementById("foundTypeBtn");
    lostBtn.classList.remove("active");
    foundBtn.classList.remove("active");
    if(type === "lost"){
        lostBtn.classList.add("active");
    }else{
        foundBtn.classList.add("active");
    }
}
/* =====================================================
   IMAGE PREVIEW
===================================================== */
function previewImage(event){
    const file = event.target.files[0];
    if(!file){
        document.getElementById("imagePreview").style.display = "none";
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e){
        document.getElementById("previewImg").src = e.target.result;
        document.getElementById("imagePreview").style.display = "block";
    };
    reader.readAsDataURL(file);
}
/* =====================================================
   SUBMIT ITEM
===================================================== */
function submitItem(){
    if(!currentUser){
        showToast("Please login first.");
        return;
    }
    const name =
        document.getElementById("itemName").value.trim();
    const details =
        document.getElementById("itemDetails").value.trim();
    const location =
        document.getElementById("itemLocation").value.trim();
    const date =
        document.getElementById("itemDate").value;
    const phone =
        document.getElementById("itemPhone").value.trim();
    const imageFile =
        document.getElementById("itemImage").files[0];
    if(!name || !details || !location || !date || !phone){
        showToast("Please fill all item details.");
        return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    if(cleanPhone.length < 10){
        showToast("Please enter a valid phone number.");
        return;
    }
    if(imageFile){
        const reader = new FileReader();
        reader.onload = function(e){
            compressImage(e.target.result, 900, 0.72)
                .then(compressedImage => {
                    saveNewItem(
                        name,
                        details,
                        location,
                        date,
                        phone,
                        compressedImage
                    );
                })
                .catch(() => {
                    showToast("Unable to process the image.");
                });
        };
        reader.readAsDataURL(imageFile);
    }else{
        saveNewItem(
            name,
            details,
            location,
            date,
            cleanPhone,
            ""
        );
    }
}
function compressImage(dataUrl, maxSize, quality){
    return new Promise((resolve,reject) => {
        const img = new Image();
        img.onload = function(){
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext("2d");
            if(!ctx){
                reject(new Error("Canvas unavailable"));
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}
function saveNewItem(
    name,
    details,
    location,
    date,
    phone,
    image
){
    const newItem = {
        id:Date.now().toString(),
        type:selectedType,
        name:name,
        details:details,
        location:location,
        date:date,
        phone:phone,
        image:image,
        reporterId:currentUser.id,
        reporterName:currentUser.name,
        reporterEmail:currentUser.email,
        status:"active",
        matchedItemId:null,
        receivedMode:null,
        receiver:null,
        createdAt:new Date().toISOString(),
        receivedAt:null,
        receiveRequestId:null,
        pendingReceiveRequest:null
    };
    items.push(newItem);
    saveItems();
    clearForm();
    renderAllItems();
    showToast(
        selectedType === "lost"
        ? "Lost item reported successfully."
        : "Found item reported successfully."
    );
    document
        .getElementById(selectedType)
        ?.scrollIntoView({
            behavior:"smooth"
        });
}
/* =====================================================
   SAVE ITEMS
===================================================== */
function saveItems(){
    try{
        localStorage.setItem(
            "finditCampusItems",
            JSON.stringify(items)
        );
    }catch(error){
        console.error(error);
        showToast("Storage is full. Please remove old reports or use smaller images.");
    }
}
/* =====================================================
   LOAD ITEMS
===================================================== */
function loadItems(){
    items =
        JSON.parse(localStorage.getItem("finditCampusItems")) || [];
}
/* =====================================================
   CLEAR FORM
===================================================== */
function clearForm(){
    document.getElementById("itemName").value = "";
    document.getElementById("itemDetails").value = "";
    document.getElementById("itemLocation").value = "";
    document.getElementById("itemDate").value = "";
    document.getElementById("itemPhone").value = "";
    document.getElementById("itemImage").value = "";
    document.getElementById("imagePreview").style.display = "none";
    document.getElementById("previewImg").src = "";
}
/* =====================================================
   RENDER ALL
===================================================== */
function renderAllItems(){
    loadItems();
    renderLostItems();
    renderFoundItems();
    renderReceivedItems();
    renderNotifications();
    updateNotificationBadge();
    updateStats();
}
/* =====================================================
   ACTIVE ITEMS
===================================================== */
function getActiveItems(){
    return items.filter(
        item => item.status === "active"
    );
}
/* =====================================================
   LOST ITEMS
===================================================== */
function renderLostItems(){
    const grid =
        document.getElementById("lostGrid");
    const search =
        document
        .getElementById("lostSearch")
        .value
        .trim()
        .toLowerCase();
    let lostItems =
        getActiveItems()
        .filter(item => item.type === "lost");
    if(search){
        lostItems =
            lostItems.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.details.toLowerCase().includes(search) ||
                item.location.toLowerCase().includes(search)
            );
    }
    if(lostItems.length === 0){
        grid.innerHTML =
            `<div class="empty">
                No lost items found.
            </div>`;
        return;
    }
    grid.innerHTML =
        lostItems.map(
            item => createItemCard(item)
        ).join("");
}
/* =====================================================
   FOUND ITEMS
===================================================== */
function renderFoundItems(){
    const grid =
        document.getElementById("foundGrid");
    const search =
        document
        .getElementById("foundSearch")
        .value
        .trim()
        .toLowerCase();
    let foundItems =
        getActiveItems()
        .filter(item => item.type === "found");
    if(search){
        foundItems =
            foundItems.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.details.toLowerCase().includes(search) ||
                item.location.toLowerCase().includes(search)
            );
    }
    if(foundItems.length === 0){
        grid.innerHTML =
            `<div class="empty">
                No found items available.
            </div>`;
        return;
    }
    grid.innerHTML =
        foundItems.map(
            item => createItemCard(item)
        ).join("");
}
/* =====================================================
   RECEIVED ITEMS
===================================================== */
function renderReceivedItems(){
    const grid =
        document.getElementById("receivedGrid");
    const received =
        items.filter(
            item => item.status === "received"
        );
    if(received.length === 0){
        grid.innerHTML =
            `<div class="empty">
                No received items yet.
            </div>`;
        return;
    }
    grid.innerHTML =
        received
        .slice()
        .reverse()
        .map(
            item => createItemCard(item,true)
        )
        .join("");
}
/* =====================================================
   CREATE CARD
===================================================== */
function createItemCard(item,isReceived=false){
    const isOwner =
        currentUser &&
        item.reporterId === currentUser.id;
    const matches =
        findMatches(item);
    let matchHTML = "";
    if(!isReceived && item.type === "found" && matches.length){
        matchHTML = `
            <div class="match-box">
                <strong>Possible Match Found</strong>
                ${matches.length} lost item(s) may match this found item.
            </div>
        `;
    }
    let actions = `
        <button
            class="small-btn view-btn"
            onclick="viewDetails('${item.id}')"
        >
            View Details
        </button>
    `;
    if(!isReceived && item.status === "active"){
        if(item.type === "found"){
            actions += `
                <button
                    class="small-btn match-btn"
                    onclick="showMatches('${item.id}')"
                >
                    Find Match
                </button>
            `;
            if(item.matchedItemId){
                const pending = getPendingRequestForItem(item.id);
                if(item.reporterId === currentUser.id){
                    actions += `
                        <button
                            class="small-btn receive-btn"
                            onclick="openReceive('${item.id}')"
                            ${pending ? "disabled style='opacity:.6;cursor:not-allowed;'" : ""}
                        >
                            ${pending ? "Request Sent" : "Received by Other"}
                        </button>
                    `;
                }
            }
        }
        if(item.type === "lost" && isOwner){
            actions += `
                <button
                    class="small-btn receive-btn"
                    onclick="openReceive('${item.id}')"
                >
                    Self Received
                </button>
            `;
        }
    }
    const imageHTML =
        item.image
        ?
        `<img src="${item.image}" alt="Item">`
        :
        `<div class="no-image">No Image</div>`;
    return `
        <div class="item-card">
            <div class="item-image">
                ${imageHTML}
            </div>
            <div class="item-content">
                <span class="item-type ${item.type}">
                    ${item.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
                </span>
                <h3>${escapeHTML(item.name)}</h3>
                <p class="item-description">
                    ${escapeHTML(item.details)}
                </p>
                <div class="item-info">
                    <span>
                        📍 ${escapeHTML(item.location)}
                    </span>
                    <span>
                        📅 ${formatDate(item.date)}
                    </span>
                    <span>
                        👤 ${escapeHTML(item.reporterName)}
                    </span>
                </div>
                ${matchHTML}
                <div class="item-actions">
                    ${actions}
                </div>
            </div>
        </div>
    `;
}
/* =====================================================
   MATCHING
===================================================== */
function normalizeText(text){
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g," ")
        .split(/\s+/)
        .filter(word => word.length > 2);
}
function findMatches(item){
    if(item.type === "lost"){
        return items.filter(
            other =>
                other.type === "found" &&
                other.status === "active" &&
                calculateMatch(item,other) >= 30
        );
    }
    return items.filter(
        other =>
            other.type === "lost" &&
            other.status === "active" &&
            calculateMatch(item,other) >= 30
    );
}
function calculateMatch(a,b){
    let score = 0;
    const aName =
        normalizeText(a.name);
    const bName =
        normalizeText(b.name);
    const aDetails =
        normalizeText(a.details);
    const bDetails =
        normalizeText(b.details);
    const aLocation =
        normalizeText(a.location);
    const bLocation =
        normalizeText(b.location);
    const nameMatches =
        aName.filter(
            word => bName.includes(word)
        );
    const detailMatches =
        aDetails.filter(
            word => bDetails.includes(word)
        );
    const locationMatches =
        aLocation.filter(
            word => bLocation.includes(word)
        );
    if(nameMatches.length){
        score += Math.min(
            50,
            nameMatches.length * 25
        );
    }
    if(detailMatches.length){
        score += Math.min(
            30,
            detailMatches.length * 10
        );
    }
    if(locationMatches.length){
        score += 20;
    }
    return Math.min(100,score);
}
/* =====================================================
   SHOW MATCHES
===================================================== */
function showMatches(itemId){
    const item =
        items.find(i => i.id === itemId);
    if(!item) return;
    const matches =
        findMatches(item);
    if(!matches.length){
        showToast("No matching item found.");
        return;
    }
    let html = `
        <h3 style="margin-bottom:15px;">
            Possible Matches
        </h3>
    `;
    matches.forEach(match => {
        const score =
            calculateMatch(item,match);
        html += `
            <div style="
                padding:15px;
                border:1px solid #e5e7eb;
                border-radius:10px;
                margin-bottom:10px;
            ">
                <strong>
                    ${escapeHTML(match.name)}
                </strong>
                <p style="
                    color:#777;
                    font-size:13px;
                    margin-top:5px;
                ">
                    Location: ${escapeHTML(match.location)}
                </p>
                <p style="
                    color:#777;
                    font-size:13px;
                    margin-top:3px;
                ">
                    Match Score: ${score}%
                </p>
                <button
                    class="small-btn receive-btn"
                    style="margin-top:8px;"
                    onclick="linkItems('${item.id}','${match.id}')"
                >
                    Link These Items
                </button>
            </div>
        `;
    });
    document.getElementById("detailsContent").innerHTML = html;
    document.getElementById("detailsModal").style.display = "flex";
}
/* =====================================================
   LINK LOST + FOUND
===================================================== */
function linkItems(foundId,lostId){
    const found =
        items.find(i => i.id === foundId);
    const lost =
        items.find(i => i.id === lostId);
    if(!found || !lost){
        showToast("Unable to link items.");
        return;
    }
    found.matchedItemId = lost.id;
    lost.matchedItemId = found.id;
    saveItems();
    closeModal("detailsModal");
    showToast("Lost and Found items linked successfully.");
    renderAllItems();
}
/* =====================================================
   VIEW DETAILS
===================================================== */
function viewDetails(id){
    const item =
        items.find(i => i.id === id);
    if(!item) return;
    let html = "";
    if(item.image){
        html += `
            <img
                class="detail-image"
                src="${item.image}"
                alt="Item"
            >
        `;
    }
    html += `
        <div class="detail-row">
            <strong>Type</strong>
            <span>
                ${item.type === "lost" ? "Lost Item" : "Found Item"}
            </span>
        </div>
        <div class="detail-row">
            <strong>Item</strong>
            <span>${escapeHTML(item.name)}</span>
        </div>
        <div class="detail-row">
            <strong>Details</strong>
            <span>${escapeHTML(item.details)}</span>
        </div>
        <div class="detail-row">
            <strong>Location</strong>
            <span>${escapeHTML(item.location)}</span>
        </div>
        <div class="detail-row">
            <strong>Date</strong>
            <span>${formatDate(item.date)}</span>
        </div>
        <div class="detail-row">
            <strong>Reported By</strong>
            <span>${escapeHTML(item.reporterName)}</span>
        </div>
        <div class="detail-row">
            <strong>Phone</strong>
            <span>${escapeHTML(item.phone)}</span>
        </div>
    `;
    if(item.status === "received") {
        html += `
            <div class="received-box">
                <strong>Item Received</strong>
                <p>Mode: ${item.receivedMode === "self" ? "Self Received" : "Received by Other"}</p>
            </div>
        `;

        if(item.receivedBy && item.receivedMode === "other") {
            html += `
                <div class="received-from-box">
                    <strong>Found / Received From</strong>
                    <p>Name: ${escapeHTML(item.receivedBy.name)}</p>
                    <p>Email: ${escapeHTML(item.receivedBy.email)}</p>
                </div>
            `;
        }

        if(item.receiver && item.receivedMode === "other") {
            html += `
                <div class="receiver-info">
                    <strong>Receiver Information</strong>
                    <p>Name: ${escapeHTML(item.receiver.name)}</p>
                    <p>Phone: ${escapeHTML(item.receiver.phone)}</p>
                    <p>ID: ${escapeHTML(item.receiver.id)}</p>
                    ${item.receiver.note ? `<p>Note: ${escapeHTML(item.receiver.note)}</p>` : ""}
                </div>
            `;
        }
    }
    document.getElementById("detailsContent").innerHTML = html;
    document.getElementById("detailsModal").style.display = "flex";
}
/* =====================================================
   RECEIVE
===================================================== */
function saveNotifications(){
    localStorage.setItem(
        "finditCampusNotifications",
        JSON.stringify(notifications)
    );
}
function getPendingRequestForItem(itemId){
    return notifications.find(
        n => n.type === "receive_request" &&
             n.itemId === itemId &&
             n.status === "pending"
    );
}
function getUnreadNotifications(){
    if(!currentUser) return [];
    return notifications.filter(
        n => n.toUserId === currentUser.id && !n.read
    );
}
function renderNotifications(){
    const list = document.getElementById("notificationList");
    if(!list || !currentUser) return;
    const mine = notifications
        .filter(n => n.toUserId === currentUser.id)
        .slice()
        .reverse();
    if(!mine.length){
        list.innerHTML = `<div class="empty">No notifications yet.</div>`;
        return;
    }
    list.innerHTML = mine.map(n => {
        const item = items.find(i => i.id === n.itemId);
        const statusText = n.status === "pending" ? "Pending Approval" :
                           n.status === "approved" ? "Approved" : "Rejected";
        const actions = n.status === "pending" && n.type === "receive_request"
            ? `<div class="notification-actions">
                    <button class="approve-btn" onclick="approveReceiveRequest('${n.id}')">OK - Receive Item</button>
                    <button class="reject-btn" onclick="rejectReceiveRequest('${n.id}')">Reject</button>
               </div>`
            : "";
        return `
            <div class="notification-card ${n.status}">
                <strong>${escapeHTML(n.message || "Receive request")}</strong>
                <p>Status: ${statusText}</p>
                ${n.receiver ? `<p>Receiver: ${escapeHTML(n.receiver.name)} | Phone: ${escapeHTML(n.receiver.phone)} | ID: ${escapeHTML(n.receiver.id)}</p>` : ""}
                ${item ? `<p>Item: ${escapeHTML(item.name)}</p>` : ""}
                <p>${formatDate(n.createdAt)}</p>
                ${actions}
            </div>
        `;
    }).join("");
}
function markNotificationsRead(){
    if(!currentUser) return;
    notifications.forEach(n => {
        if(n.toUserId === currentUser.id){
            n.read = true;
        }
    });
    saveNotifications();
    updateNotificationBadge();
}
function updateNotificationBadge(){
    const badge = document.getElementById("notificationBadge");
    if(!badge) return;
    const count = getUnreadNotifications().length;
    badge.textContent = count;
    badge.style.display = count ? "inline-flex" : "none";
}
function createReceiveRequest(foundItem, receiver){
    if(!foundItem.matchedItemId){
        showToast("First match the found item with a lost item.");
        return;
    }
    const lostItem = items.find(i => i.id === foundItem.matchedItemId);
    if(!lostItem || lostItem.type !== "lost"){
        showToast("Matched lost item not found.");
        return;
    }
    if(lostItem.status !== "active" || foundItem.status !== "active"){
        showToast("This item is no longer available.");
        return;
    }
    const existing = notifications.find(
        n => n.type === "receive_request" &&
             n.itemId === foundItem.id &&
             n.status === "pending"
    );
    if(existing){
        showToast("Receive request already sent to the lost item owner.");
        return;
    }
    const request = {
        id: "REQ-" + Date.now().toString(),
        type: "receive_request",
        itemId: foundItem.id,
        foundItemId: foundItem.id,
        lostItemId: lostItem.id,
        fromUserId: currentUser.id,
        fromUserName: currentUser.name,
        fromUserEmail: currentUser.email,
        toUserId: lostItem.reporterId,
        receiver: receiver,
        status: "pending",
        read: false,
        createdAt: new Date().toISOString(),
        message: `${currentUser.name} found your lost item and is requesting confirmation that it was received by the owner.`
    };
    notifications.push(request);
    foundItem.receiveRequestId = request.id;
    foundItem.pendingReceiveRequest = true;
    saveNotifications();
    saveItems();
    closeModal("receiveModal");
    renderAllItems();
    showToast("Request sent. The lost item owner must approve it.");
}
function openReceive(itemId){
    const item = items.find(i => i.id === itemId);
    if(!item || !currentUser){
        showToast("Please login first.");
        return;
    }
    if(item.status !== "active"){
        showToast("This item has already been received.");
        return;
    }
    const selfBtn = document.getElementById("selfReceiveBtn");
    const otherBtn = document.getElementById("otherReceiveBtn");
    const isOwner = item.reporterId === currentUser.id;
    selectedReceiveItemId = itemId;
    selectedReceiveMode = null;
    document.getElementById("receiverForm").style.display = "none";
    selfBtn.classList.remove("active");
    otherBtn.classList.remove("active");
    selfBtn.style.display = "none";
    otherBtn.style.display = "none";

    /* Self Receive is ONLY for the original owner of a LOST report. */
    if(item.type === "lost" && isOwner){
        selfBtn.style.display = "block";
    }

    /* A FOUND report can only be completed through owner approval. */
    if(item.type === "found" && item.reporterId === currentUser.id){
        if(!item.matchedItemId){
            showToast("First use Find Match and link this found item to the lost item.");
            return;
        }
        if(getPendingRequestForItem(item.id)){
            showToast("Request already sent to the lost item owner.");
            return;
        }
        otherBtn.style.display = "block";
    }

    document.getElementById("receiverName").value = "";
    document.getElementById("receiverPhone").value = "";
    document.getElementById("receiverId").value = "";
    document.getElementById("receiverNote").value = "";
    document.getElementById("receiveModal").style.display = "flex";
}
function selectReceiveMode(mode){
    selectedReceiveMode = mode;
    document.getElementById("selfReceiveBtn").classList.remove("active");
    document.getElementById("otherReceiveBtn").classList.remove("active");
    if(mode === "self"){
        document.getElementById("selfReceiveBtn").classList.add("active");
        document.getElementById("receiverForm").style.display = "none";
    }else{
        document.getElementById("otherReceiveBtn").classList.add("active");
        document.getElementById("receiverForm").style.display = "block";
    }
}
function confirmReceive(){
    if(!selectedReceiveItemId || !currentUser){
        showToast("Select an item.");
        return;
    }
    const item = items.find(i => i.id === selectedReceiveItemId);
    if(!item || item.status !== "active"){
        showToast("This item has already been received.");
        closeModal("receiveModal");
        return;
    }
    if(selectedReceiveMode === "self"){
        /* ONLY the original lost-item owner can self receive. */
        if(item.type !== "lost" || item.reporterId !== currentUser.id){
            showToast("Self Receive is available only to the original lost-item owner.");
            return;
        }
        finalizeReceive(item, "self", null, null);
        return;
    }
    if(selectedReceiveMode !== "other"){
        showToast("Please select receive method.");
        return;
    }
    /* Only the person who posted the FOUND report can send the approval request. */
    if(item.type !== "found" || item.reporterId !== currentUser.id){
        showToast("Only the found-item reporter can send a receive request.");
        return;
    }
    if(!item.matchedItemId){
        showToast("First match the found item with the lost item.");
        return;
    }
    const receiverName = document.getElementById("receiverName").value.trim();
    const receiverPhone = document.getElementById("receiverPhone").value.trim();
    const receiverId = document.getElementById("receiverId").value.trim();
    const receiverNote = document.getElementById("receiverNote").value.trim();
    if(!receiverName || !receiverPhone || !receiverId){
        showToast("Please enter receiver details.");
        return;
    }
    createReceiveRequest(item, {
        name: receiverName,
        phone: receiverPhone,
        id: receiverId,
        note: receiverNote
    });
}
function finalizeReceive(item, mode, receiver, request){
    const now = new Date().toISOString();
    item.status = "received";
    item.receivedMode = mode;
    item.receiver = receiver;
    item.receivedBy = request ? {
        id: request.fromUserId,
        name: request.fromUserName,
        email: request.fromUserEmail
    } : null;
    item.receivedAt = now;
    item.pendingReceiveRequest = false;
    item.receiveRequestId = request ? request.id : null;

    if(item.matchedItemId){
        const linked = items.find(i => i.id === item.matchedItemId);
        if(linked && linked.status === "active"){
            linked.status = "received";
            linked.receivedMode = mode;
            linked.receiver = receiver;
            linked.receivedBy = request ? {
                id: request.fromUserId,
                name: request.fromUserName,
                email: request.fromUserEmail
            } : null;
            linked.receivedAt = now;
            linked.receivedFromLinkedItem = item.id;
            linked.pendingReceiveRequest = false;
            linked.receiveRequestId = request ? request.id : null;
        }
    }
    if(request){
        request.status = "approved";
        request.read = true;
        request.approvedAt = now;
    }
    saveItems();
    saveNotifications();
    closeModal("receiveModal");
    renderAllItems();
    showToast("Item received successfully. The matched records moved to Received Items.");
}
function approveReceiveRequest(requestId){
    const request = notifications.find(n => n.id === requestId);
    if(!request || request.status !== "pending") return;
    if(!currentUser || request.toUserId !== currentUser.id){
        showToast("Only the lost item owner can approve this request.");
        return;
    }
    const lostItem = items.find(i => i.id === request.lostItemId);
    const foundItem = items.find(i => i.id === request.foundItemId);
    if(!lostItem || !foundItem || lostItem.status !== "active" || foundItem.status !== "active"){
        request.status = "rejected";
        request.read = true;
        saveNotifications();
        renderAllItems();
        showToast("This receive request is no longer valid.");
        return;
    }
    finalizeReceive(foundItem, "other", request.receiver, request);
}
function rejectReceiveRequest(requestId){
    const request = notifications.find(n => n.id === requestId);
    if(!request || request.status !== "pending") return;
    if(!currentUser || request.toUserId !== currentUser.id){
        showToast("Only the lost item owner can reject this request.");
        return;
    }
    request.status = "rejected";
    request.read = true;
    request.rejectedAt = new Date().toISOString();
    const foundItem = items.find(i => i.id === request.foundItemId);
    if(foundItem){
        foundItem.pendingReceiveRequest = false;
        foundItem.receiveRequestId = null;
    }
    saveItems();
    saveNotifications();
    renderAllItems();
    showToast("Receive request rejected. The found item remains active.");
}
/* =====================================================
   CLOSE MODAL
===================================================== */
function closeModal(id){
    document.getElementById(id).style.display = "none";
}
/* =====================================================
   CLICK OUTSIDE MODAL
===================================================== */
window.addEventListener("click",function(event){
    const details =
        document.getElementById("detailsModal");
    const receive =
        document.getElementById("receiveModal");
    if(event.target === details){
        closeModal("detailsModal");
    }
    if(event.target === receive){
        closeModal("receiveModal");
    }
});
/* =====================================================
   STATS
===================================================== */
function updateStats(){
    const active =
        items.filter(
            item => item.status === "active"
        );
    const lost =
        active.filter(
            item => item.type === "lost"
        );
    const found =
        active.filter(
            item => item.type === "found"
        );
    const received =
        items.filter(
            item => item.status === "received"
        );
    document.getElementById("lostCount").textContent =
        lost.length;
    document.getElementById("foundCount").textContent =
        found.length;
    document.getElementById("receivedCount").textContent =
        received.length;
    document.getElementById("totalCount").textContent =
        items.length;
}
/* =====================================================
   DATE FORMAT
===================================================== */
function formatDate(value){
    if(!value) return "Not specified";
    const date = new Date(value);
    if(isNaN(date.getTime())){
        return value;
    }
    return date.toLocaleString(
        "en-IN",
        {
            day:"2-digit",
            month:"short",
            year:"numeric",
            hour:"2-digit",
            minute:"2-digit"
        }
    );
}
/* =====================================================
   ESCAPE HTML
===================================================== */
function escapeHTML(value){
    if(value === null || value === undefined){
        return "";
    }
    return String(value)
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");
}
/* =====================================================
   TOAST
===================================================== */
let toastTimer;
function showToast(message){
    const toast =
        document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer =
        setTimeout(
            () => {
                toast.classList.remove("show");
            },
            3000
        );
}
/* =====================================================
   THEME
===================================================== */
function applyTheme(){
    const dark = localStorage.getItem("finditTheme") === "dark";
    document.body.classList.toggle("dark", dark);
    document.getElementById("themeBtn").textContent = dark ? "☀️" : "🌙";
}
function toggleTheme(){
    const dark = !document.body.classList.contains("dark");
    localStorage.setItem("finditTheme", dark ? "dark" : "light");
    applyTheme();
}

/* =====================================================
   INITIALIZE
===================================================== */
window.addEventListener(
    "DOMContentLoaded",
    function(){
        applyTheme();
        currentUser =
            JSON.parse(
                localStorage.getItem("finditCurrentUser")
            );
        notifications =
            JSON.parse(localStorage.getItem("finditCampusNotifications")) || [];
        if(currentUser){
            openApp();
        }else{
            document.getElementById("authScreen").style.display =
                "flex";
            document.getElementById("app").style.display =
                "none";
        }
    }
);
