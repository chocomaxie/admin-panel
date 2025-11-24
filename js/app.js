const API = "https://pc-component-picker-backend-production.up.railway.app/api";

// Supabase Configuration
const SUPABASE_URL = localStorage.getItem("supabase_url") || "https://wtdrgojlvgbiwqwcucbi.supabase.co";
const SUPABASE_ANON_KEY = localStorage.getItem("supabase_key") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0ZHJnb2psdmdiaXdxd2N1Y2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTE1OTgsImV4cCI6MjA3NzEyNzU5OH0.ch6vg7HjSTTDx9t1qDBb8hTBmWVzFupOo7gXTSdKSGQ";

// Initialize Supabase Client (will be set when Supabase script loads)
let supabase = null;
if (typeof window.supabase !== "undefined" && window.supabase && window.supabase.createClient) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Supabase initialization failed:", e);
  }
}

// Initialize Supabase when script loads
function initSupabase(url, key) {
  try {
    if (typeof window.supabase !== "undefined" && window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(url, key);
      localStorage.setItem("supabase_url", url);
      localStorage.setItem("supabase_key", key);
      return true;
    } else {
      console.warn("Supabase not loaded. Please include the Supabase script in your HTML.");
      return false;
    }
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    return false;
  }
}

// Create axios instance with auth token
function api() {
  const token = localStorage.getItem("token");

  const instance = axios.create({
    baseURL: API,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json"
    }
  });

  // Add response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Unauthorized - clear token and redirect to login
        // But don't redirect if we're already on login page or if it's a login request
        const isLoginPage = window.location.pathname.includes("login.html");
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        
        if (!isLoginPage && !isLoginRequest) {
          localStorage.removeItem("token");
          window.location.href = "./login.html";
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

// Require authentication - redirect to login if no token
function requireAuth() {
  // Don't redirect if we're already on login page
  if (window.location.pathname.includes("login.html")) {
    return;
  }
  
  const token = localStorage.getItem("token");
  if (!token) {
    // Prevent multiple redirects
    if (!window.authRedirecting) {
      window.authRedirecting = true;
      window.location.href = "./login.html";
    }
  } else {
    window.authRedirecting = false;
  }
}

// Logout function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
  }
}

// Utility: Format currency
function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Utility: Format date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric" 
  });
}

// Utility: Show toast notification
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
    type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : "bg-blue-500"
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Utility: Show loading spinner
function showLoading(element) {
  if (element) {
    element.innerHTML = `
      <div class="flex items-center justify-center p-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    `;
  }
}

// Utility: Handle API errors gracefully
function handleApiError(error) {
  const message = error.response?.data?.message || error.message || "An error occurred";
  showToast(message, "error");
  console.error("API Error:", error);
}

// Utility: Upload image to Supabase Storage
async function uploadImage(file, folder = "components") {
  if (!supabase) {
    throw new Error("Supabase not initialized. Please configure in Settings.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from("images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("images")
    .getPublicUrl(filePath);

  return publicUrl;
}

// Utility: Delete image from Supabase Storage
async function deleteImage(filePath) {
  if (!supabase) return;
  
  const path = filePath.split("/").slice(-2).join("/"); // Get folder/filename
  await supabase.storage.from("images").remove([path]);
}

// Utility: Format date with time
function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", { 
    year: "numeric", 
    month: "short", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Utility: Get time ago
function getTimeAgo(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

// Alert Center Functions
let alertCenterOpen = false;
let userMenuOpen = false;

function toggleAlertCenter() {
  alertCenterOpen = !alertCenterOpen;
  const center = document.getElementById("alertCenter");
  const menu = document.getElementById("userMenu");
  
  if (center) {
    center.classList.toggle("hidden");
  }
  if (menu && !menu.classList.contains("hidden")) {
    menu.classList.add("hidden");
    userMenuOpen = false;
  }
  
  if (alertCenterOpen) {
    loadAlerts();
  }
}

function toggleUserMenu() {
  userMenuOpen = !userMenuOpen;
  const menu = document.getElementById("userMenu");
  const center = document.getElementById("alertCenter");
  
  if (menu) {
    menu.classList.toggle("hidden");
  }
  if (center && !center.classList.contains("hidden")) {
    center.classList.add("hidden");
    alertCenterOpen = false;
  }
}

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
  const alertCenter = document.getElementById("alertCenter");
  const userMenu = document.getElementById("userMenu");
  
  if (alertCenter && !alertCenter.contains(e.target) && !e.target.closest("button[onclick='toggleAlertCenter()']")) {
    alertCenter.classList.add("hidden");
    alertCenterOpen = false;
  }
  
  if (userMenu && !userMenu.contains(e.target) && !e.target.closest("button[onclick='toggleUserMenu()']")) {
    userMenu.classList.add("hidden");
    userMenuOpen = false;
  }
});

// Load alerts from API
async function loadAlerts() {
  try {
    const alertList = document.getElementById("alertList");
    const alertBadge = document.getElementById("alertBadge");
    
    // Fetch low stock items
    const lowStockRes = await api().get("/componentsadmin");
    // Handle response - could be array directly or wrapped in object
    const data = lowStockRes.data;
    const components = Array.isArray(data) ? data : (data?.data || data?.components || []);
    const lowStock = components.filter(c => {
      const stock = parseInt(c.stock) || 0;
      const threshold = parseInt(c.lowStockThreshold) || 5;
      return stock <= threshold;
    });

    // Messages placeholder - no endpoint yet
    const recentMessages = [];

    const alerts = [];
    
    // Add low stock alerts
    lowStock.forEach(item => {
      alerts.push({
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${item.brand} ${item.model} (Stock: ${item.stock}, Threshold: ${item.lowStockThreshold || 5})`,
        action: "restock",
        itemId: item.id,
        timestamp: new Date()
      });
    });

    // Add new message alerts
    recentMessages.forEach(msg => {
      alerts.push({
        type: "message",
        title: "New Support Message",
        message: `From ${msg.from || "User"}`,
        action: "view",
        messageId: msg.id,
        timestamp: new Date(msg.createdAt || msg.date)
      });
    });

    // Update badge
    if (alertBadge) {
      if (alerts.length > 0) {
        alertBadge.textContent = alerts.length > 99 ? "99+" : alerts.length;
        alertBadge.classList.remove("hidden");
      } else {
        alertBadge.classList.add("hidden");
      }
    }

    // Render alerts
    if (alertList) {
      if (alerts.length === 0) {
        alertList.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm">No alerts</div>';
      } else {
        alertList.innerHTML = alerts.map(alert => `
          <div class="p-3 hover:bg-gray-50 border-b border-gray-100">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-semibold text-sm text-gray-800">${alert.title}</div>
                <div class="text-xs text-gray-600 mt-1">${alert.message}</div>
                <div class="text-xs text-gray-400 mt-1">${getTimeAgo(alert.timestamp)}</div>
              </div>
              <div class="flex gap-2 ml-2">
                ${alert.action === "restock" ? `<button onclick="window.location.href='components.html?edit=${alert.itemId}'" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Restock</button>` : ""}
                ${alert.action === "view" ? `<button onclick="window.location.href='messages.html?thread=${alert.messageId}'" class="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">View</button>` : ""}
              </div>
            </div>
          </div>
        `).join("");
      }
    }

  } catch (error) {
    console.error("Error loading alerts:", error);
  }
}

// Global search handler
function handleGlobalSearch() {
  const query = document.getElementById("globalSearch")?.value.trim();
  if (!query) return;
  
  // Simple search - redirect to components page with search param
  window.location.href = `components.html?search=${encodeURIComponent(query)}`;
}

// Auto-load alerts on page load (only if not on login page)
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // Don't load alerts on login page
    if (!window.location.pathname.includes("login.html") && !window.location.pathname.includes("index.html")) {
      setTimeout(loadAlerts, 1000); // Load after 1 second
      // Refresh alerts every 30 seconds
      setInterval(loadAlerts, 30000);
    }
  });
}
