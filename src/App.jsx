import { useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBox,
  FiGift,
  FiLogOut,
  FiShoppingCart,
  FiUser,
  FiUsers
} from "react-icons/fi";
import { apiFetch } from "./api";

const emptySummary = {
  total_donations: 0,
  total_inventory_in_stock: 0,
  total_inventory_sold: 0,
  total_sales_value: "0.00",
  total_volunteer_minutes: 0
};


const inventoryTotalsBase = [
  { label: "Items in stock", key: "inStock" },
  { label: "Items sold", key: "sold" },
  { label: "Total items", key: "total" }
];

const donationTotalsBase = [
  { label: "Donations today", key: "today" },
  { label: "This week", key: "week" },
  { label: "Total donations", key: "total" }
];

const volunteerTotalsBase = [
  { label: "Volunteers on floor", key: "activeCount" },
  { label: "Hours logged today", key: "hoursToday" },
  { label: "Shifts in progress", key: "activeCount" },
  { label: "Needs follow-up", key: "followUp" }
];

const volunteerFilters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "break", label: "On break" },
  { id: "clocked-out", label: "Clocked out" }
];

const donationFilters = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "older", label: "Older" }
];

const timeBuckets = [
  { id: "am", label: "AM", start: 6, end: 10 },
  { id: "mid", label: "Mid", start: 10, end: 14 },
  { id: "pm", label: "PM", start: 14, end: 18 },
  { id: "eve", label: "Eve", start: 18, end: 22 }
];

const navItems = [
  { id: "pos", label: "POS", icon: FiShoppingCart },
  { id: "inventory", label: "Inventory", icon: FiBox },
  { id: "donations", label: "Donations", icon: FiGift },
  { id: "volunteers", label: "Volunteers", icon: FiUsers },
  { id: "reporting", label: "Reporting", icon: FiBarChart2 }
];

const reportCardsBase = [
  { label: "Total sales", key: "total_sales_value", format: "currency" },
  { label: "Donations received", key: "total_donations" },
  { label: "Items sold", key: "total_inventory_sold" },
  { label: "Volunteer minutes", key: "total_volunteer_minutes" }
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("mf_token") || "");
  const [login, setLogin] = useState({ username: "", password: "" });
  const [summary, setSummary] = useState(emptySummary);
  const [status, setStatus] = useState("Ready");
  const [activeCategory, setActiveCategory] = useState("All items");
  const [activeView, setActiveView] = useState("inventory");
  const [donationFilter, setDonationFilter] = useState("all");
  const [volunteerFilter, setVolunteerFilter] = useState("all");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [donationItems, setDonationItems] = useState([]);
  const [donationsLoaded, setDonationsLoaded] = useState(false);
  const [volunteerEntries, setVolunteerEntries] = useState([]);
  const [volunteersLoaded, setVolunteersLoaded] = useState(false);
  const [volunteerRoster, setVolunteerRoster] = useState([]);
  const [volunteerRosterLoaded, setVolunteerRosterLoaded] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: ""
  });
  const [volunteerMessage, setVolunteerMessage] = useState("");
  const [volunteerOpsUserId, setVolunteerOpsUserId] = useState("");
  const [volunteerOpsMessage, setVolunteerOpsMessage] = useState("");
  const [posSelection, setPosSelection] = useState(null);
  const [posPrice, setPosPrice] = useState("");
  const [posMessage, setPosMessage] = useState("");
  const [salesItems, setSalesItems] = useState([]);
  const [inventorySelection, setInventorySelection] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({
    donationId: "",
    categoryId: "",
    name: "",
    description: "",
    condition: "",
    price: ""
  });
  const [inventoryActionMessage, setInventoryActionMessage] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [categoryMessage, setCategoryMessage] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [compactTables, setCompactTables] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setPanelOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const authHeader = useMemo(
    () => ({
      Authorization: token ? `Bearer ${token}` : ""
    }),
    [token]
  );

  const currentUser = useMemo(() => {
    if (!token) {
      return null;
    }
    try {
      const payload = token.split(".")[1] || "";
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(atob(normalized));
      return {
        username: decoded.sub || "User",
        role: decoded.role || "staff"
      };
    } catch (error) {
      return null;
    }
  }, [token]);

  const categoryOptions = useMemo(() => {
    const names = categories.map((category) => category.name);
    const options = ["All items", ...names];
    const hasUncategorized = inventoryItems.some((item) => !item.category_name);
    if (hasUncategorized && !options.includes("Uncategorized")) {
      options.push("Uncategorized");
    }
    return options;
  }, [categories, inventoryItems]);

  const volunteerLookup = useMemo(() => {
    const map = new Map();
    volunteerRoster.forEach((volunteer) => {
      map.set(volunteer.id, volunteer);
    });
    return map;
  }, [volunteerRoster]);

  const inventoryRows = useMemo(() => {
    return inventoryItems.map((item) => {
      const amount = Number(item.price);
      const price = Number.isNaN(amount) ? item.price : `$${amount.toFixed(2)}`;
      const statusLabel =
        item.status === "IN_STOCK"
          ? "Ready"
          : item.status === "SOLD"
          ? "Sold"
          : item.status;
      const intakeLabel = item.donation_id
        ? `Donation ${item.donation_id}`
        : "Manual entry";

      return {
        id: item.id,
        name: item.name || `Item #${item.id}`,
        description: item.description || "",
        category: item.category_name || "Uncategorized",
        categoryId: item.category_id,
        sku: `INV-${item.id}`,
        condition: item.condition,
        intake: intakeLabel,
        price,
        rawPrice: Number.isNaN(amount) ? null : amount,
        status: statusLabel
      };
    });
  }, [inventoryItems]);

  const filteredInventoryRows = useMemo(() => {
    if (activeCategory === "All items") {
      return inventoryRows;
    }
    return inventoryRows.filter((item) => item.category === activeCategory);
  }, [activeCategory, inventoryRows]);

  const inventoryFilterSummary =
    activeCategory === "All items" ? "All categories" : activeCategory;

  const donationRows = useMemo(() => {
    return donationItems.map((donation) => {
      const receivedAt = new Date(donation.received_at);
      const validDate = Number.isNaN(receivedAt.getTime()) ? null : receivedAt;
      const now = new Date();
      const sameDay =
        validDate &&
        validDate.getFullYear() === now.getFullYear() &&
        validDate.getMonth() === now.getMonth() &&
        validDate.getDate() === now.getDate();
      const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const inWeek = validDate && validDate >= weekAgo && validDate <= now;
      const status = sameDay ? "Today" : inWeek ? "This week" : "Older";

      return {
        donor: donation.donor_name || "Anonymous",
        receivedAt: validDate ? validDate.toLocaleString() : "Unknown",
        receivedBy: `User #${donation.received_by_user_id}`,
        items: "-",
        status,
        isToday: Boolean(sameDay),
        isWeek: Boolean(inWeek),
        isOlder: Boolean(!sameDay && !inWeek)
      };
    });
  }, [donationItems]);

  const filteredDonations = useMemo(() => {
    if (donationFilter === "all") {
      return donationRows;
    }
    if (donationFilter === "today") {
      return donationRows.filter((donation) => donation.isToday);
    }
    if (donationFilter === "week") {
      return donationRows.filter((donation) => donation.isWeek);
    }
    return donationRows.filter((donation) => donation.isOlder);
  }, [donationFilter, donationRows]);

  const donationFilterSummary =
    donationFilter === "all"
      ? "All donations"
      : donationFilters.find((filter) => filter.id === donationFilter)?.label ||
        "Filtered";

  const volunteerRows = useMemo(() => {
    const now = Date.now();
    return volunteerEntries.map((entry) => {
      const volunteer = volunteerLookup.get(entry.user_id);
      const displayName =
        volunteer?.full_name || volunteer?.username || `Volunteer #${entry.user_id}`;
      const contact = volunteer?.email || volunteer?.phone || "General";
      const clockIn = new Date(entry.clock_in);
      const clockOut = entry.clock_out ? new Date(entry.clock_out) : null;
      const minutes = entry.duration_minutes ?? (clockOut
        ? Math.max(0, Math.round((clockOut - clockIn) / 60000))
        : Math.max(0, Math.round((now - clockIn.getTime()) / 60000)));
      const status = entry.clock_out ? "Clocked-out" : "Active";

      return {
        name: displayName,
        role: contact,
        clockIn: Number.isNaN(clockIn.getTime())
          ? "Unknown"
          : clockIn.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        minutes,
        status
      };
    });
  }, [volunteerEntries, volunteerLookup]);

  const filteredVolunteers = useMemo(() => {
    if (volunteerFilter === "all") {
      return volunteerRows;
    }
    return volunteerRows.filter(
      (volunteer) => volunteer.status.toLowerCase() === volunteerFilter
    );
  }, [volunteerFilter, volunteerRows]);

  const volunteerFilterSummary =
    volunteerFilter === "all"
      ? "All volunteers"
      : volunteerFilters.find((filter) => filter.id === volunteerFilter)?.label ||
        "Filtered";

  const inventoryTotals = useMemo(() => {
    const inStock = inventoryItems.filter((item) => item.status === "IN_STOCK").length;
    const sold = inventoryItems.filter((item) => item.status === "SOLD").length;
    const total = inventoryItems.length;

    return inventoryTotalsBase.map((item) => {
      if (item.key === "inStock") {
        return { label: item.label, value: inStock };
      }
      if (item.key === "sold") {
        return { label: item.label, value: sold };
      }
      return { label: item.label, value: total };
    });
  }, [inventoryItems]);

  const donationTotals = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const totals = donationItems.reduce(
      (acc, donation) => {
        const receivedAt = new Date(donation.received_at);
        if (Number.isNaN(receivedAt.getTime())) {
          return acc;
        }
        const isToday =
          receivedAt.getFullYear() === now.getFullYear() &&
          receivedAt.getMonth() === now.getMonth() &&
          receivedAt.getDate() === now.getDate();
        const isWeek = receivedAt >= weekAgo && receivedAt <= now;
        return {
          today: acc.today + (isToday ? 1 : 0),
          week: acc.week + (isWeek ? 1 : 0),
          total: acc.total + 1
        };
      },
      { today: 0, week: 0, total: 0 }
    );

    return donationTotalsBase.map((item) => ({
      label: item.label,
      value: totals[item.key] ?? 0
    }));
  }, [donationItems]);

  const volunteerTotals = useMemo(() => {
    const activeCount = volunteerRows.filter(
      (volunteer) => volunteer.status === "Active"
    ).length;
    const minutesToday = volunteerRows.reduce(
      (total, volunteer) => total + volunteer.minutes,
      0
    );
    const hoursToday = (minutesToday / 60).toFixed(1);

    return volunteerTotalsBase.map((item) => {
      if (item.key === "activeCount") {
        return { label: item.label, value: activeCount };
      }
      if (item.key === "hoursToday") {
        return { label: item.label, value: hoursToday };
      }
      return { label: item.label, value: 0 };
    });
  }, [volunteerRows]);

  const reportCards = useMemo(() => {
    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return `$${amount.toFixed(2)}`;
    };

    return reportCardsBase.map((card) => {
      const value = summary[card.key];
      return {
        label: card.label,
        value: card.format === "currency" ? formatCurrency(value) : value
      };
    });
  }, [summary]);

  const reportRows = useMemo(() => {
    return [
      { metric: "Sales revenue", total: `$${Number(summary.total_sales_value || 0).toFixed(2)}` },
      { metric: "Donations", total: summary.total_donations || 0 },
      { metric: "Items sold", total: summary.total_inventory_sold || 0 },
      { metric: "Volunteer minutes", total: summary.total_volunteer_minutes || 0 }
    ];
  }, [summary]);

  const inventoryChart = useMemo(() => {
    const counts = new Map();
    inventoryItems.forEach((item) => {
      const key = item.category_name || "Other";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
    if (!total) {
      return [];
    }
    return Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value: Math.round((value / total) * 100)
    }));
  }, [inventoryItems]);

  const donationsChart = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return date;
    });
    const counts = days.map(() => 0);
    donationItems.forEach((item) => {
      const receivedAt = new Date(item.received_at);
      if (Number.isNaN(receivedAt.getTime())) {
        return;
      }
      days.forEach((date, index) => {
        if (
          receivedAt.getFullYear() === date.getFullYear() &&
          receivedAt.getMonth() === date.getMonth() &&
          receivedAt.getDate() === date.getDate()
        ) {
          counts[index] += 1;
        }
      });
    });
    return days.map((date, index) => ({
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      value: counts[index]
    }));
  }, [donationItems]);

  const volunteerChart = useMemo(() => {
    const bucketCounts = timeBuckets.map(() => 0);
    volunteerEntries.forEach((entry) => {
      const clockIn = new Date(entry.clock_in);
      if (Number.isNaN(clockIn.getTime())) {
        return;
      }
      const hour = clockIn.getHours();
      timeBuckets.forEach((bucket, index) => {
        if (hour >= bucket.start && hour < bucket.end) {
          bucketCounts[index] += 1;
        }
      });
    });
    return timeBuckets.map((bucket, index) => ({
      label: bucket.label,
      value: bucketCounts[index]
    }));
  }, [volunteerEntries]);

  const reportingChart = useMemo(() => {
    const now = new Date();
    const weeks = Array.from({ length: 4 }, (_, index) => {
      const start = new Date(now);
      start.setDate(now.getDate() - (27 - index * 7));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    });
    const totals = weeks.map(() => 0);
    salesItems.forEach((sale) => {
      const soldAt = new Date(sale.sold_at);
      if (Number.isNaN(soldAt.getTime())) {
        return;
      }
      weeks.forEach((week, index) => {
        if (soldAt >= week.start && soldAt <= week.end) {
          totals[index] += Number(sale.sale_price || 0);
        }
      });
    });
    const max = Math.max(...totals, 1);
    return totals.map((total, index) => ({
      label: `Wk ${index + 1}`,
      value: Math.round((total / max) * 30) + 2
    }));
  }, [salesItems]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("mf_token", token);
    } else {
      localStorage.removeItem("mf_token");
    }
  }, [token]);

  useEffect(() => {
    if (activeView !== "inventory") {
      setInventorySelection(null);
      setInventoryForm({
        donationId: "",
        categoryId: "",
        name: "",
        description: "",
        condition: "",
        price: ""
      });
      setInventoryActionMessage("");
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView !== "inventory" || !inventorySelection) {
      return;
    }
    setInventoryForm({
      donationId: inventorySelection.intake.startsWith("Donation ")
        ? inventorySelection.intake.replace("Donation ", "")
        : "",
      categoryId: inventorySelection.categoryId?.toString() || "",
      name: inventorySelection.name || "",
      description: inventorySelection.description || "",
      condition: inventorySelection.condition,
      price:
        inventorySelection.rawPrice !== null
          ? inventorySelection.rawPrice.toFixed(2)
          : ""
    });
  }, [activeView, inventorySelection]);

  useEffect(() => {
    const handleExpired = () => {
      setToken("");
      setStatus("Session expired. Please sign in again.");
    };
    window.addEventListener("auth-expired", handleExpired);
    return () => window.removeEventListener("auth-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (!token) {
      setCategories([]);
      setCategoriesLoaded(false);
      return;
    }

    const controller = new AbortController();

    apiFetch("/api/categories", {
      headers: authHeader,
      signal: controller.signal
    })
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setCategoriesLoaded(true);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setCategoriesLoaded(true);
        setStatus(error.message || "Failed to load categories.");
      });

    return () => controller.abort();
  }, [authHeader, token]);

  const fetchInventory = async ({ view, signal } = {}) => {
    if (!token || (view !== "inventory" && view !== "pos")) {
      return [];
    }
    const params = new URLSearchParams();
    if (view === "pos") {
      params.set("status", "IN_STOCK");
    }
    const path = params.toString()
      ? `/api/inventory?${params.toString()}`
      : "/api/inventory";

    const data = await apiFetch(path, {
      headers: authHeader,
      signal
    });
    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    if (!token || (activeView !== "inventory" && activeView !== "pos")) {
      setInventoryItems([]);
      setInventoryLoaded(false);
      return;
    }

    const controller = new AbortController();
    setStatus("Loading inventory...");

    fetchInventory({ view: activeView, signal: controller.signal })
      .then((data) => {
        setInventoryItems(data);
        setInventoryLoaded(true);
        setStatus("Inventory updated.");
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setInventoryLoaded(true);
        setStatus(error.message || "Failed to load inventory.");
      });

    return () => controller.abort();
  }, [activeView, authHeader, token]);

  useEffect(() => {
    if (!token || activeView !== "donations") {
      setDonationItems([]);
      setDonationsLoaded(false);
      return;
    }

    const controller = new AbortController();

    const loadDonations = async () => {
      setStatus("Loading donations...");
      const data = await apiFetch("/api/donations", {
        headers: authHeader,
        signal: controller.signal
      });
      setDonationItems(Array.isArray(data) ? data : []);
      setDonationsLoaded(true);
      setStatus("Donations updated.");
    };

    loadDonations().catch((error) => {
      if (error.name === "AbortError") {
        return;
      }
      setDonationsLoaded(true);
      setStatus(error.message || "Failed to load donations.");
    });

    return () => controller.abort();
  }, [activeView, authHeader, token]);

  useEffect(() => {
    if (!token || activeView !== "volunteers") {
      setVolunteerEntries([]);
      setVolunteersLoaded(false);
      return;
    }

    const controller = new AbortController();

    const loadVolunteers = async () => {
      setStatus("Loading volunteers...");
      const data = await apiFetch("/api/volunteers/time-entries", {
        headers: authHeader,
        signal: controller.signal
      });
      setVolunteerEntries(Array.isArray(data) ? data : []);
      setVolunteersLoaded(true);
      setStatus("Volunteers updated.");
    };

    loadVolunteers().catch((error) => {
      if (error.name === "AbortError") {
        return;
      }
      setVolunteersLoaded(true);
      setStatus(error.message || "Failed to load volunteers.");
    });

    return () => controller.abort();
  }, [activeView, authHeader, token]);

  useEffect(() => {
    if (!token || activeView !== "volunteers") {
      setVolunteerRoster([]);
      setVolunteerRosterLoaded(false);
      return;
    }
    if (currentUser?.role === "volunteer") {
      setVolunteerRoster([]);
      setVolunteerRosterLoaded(true);
      return;
    }

    const controller = new AbortController();

    apiFetch("/api/volunteers/users", {
      headers: authHeader,
      signal: controller.signal
    })
      .then((data) => {
        setVolunteerRoster(Array.isArray(data) ? data : []);
        setVolunteerRosterLoaded(true);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setVolunteerRosterLoaded(true);
        setStatus(error.message || "Failed to load volunteers.");
      });

    return () => controller.abort();
  }, [activeView, authHeader, currentUser?.role, token]);

  useEffect(() => {
    if (!token || activeView !== "reporting") {
      return;
    }

    const controller = new AbortController();
    setStatus("Loading reporting...");

    apiFetch("/api/reporting/dashboard", {
      headers: authHeader,
      signal: controller.signal
    })
      .then((data) => {
        setSummary(data);
        setStatus("Reporting updated.");
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setStatus(error.message || "Failed to load reporting.");
      });

    return () => controller.abort();
  }, [activeView, authHeader, token]);

  useEffect(() => {
    if (!token || activeView !== "reporting") {
      setSalesItems([]);
      return;
    }

    const controller = new AbortController();
    const start = new Date();
    start.setDate(start.getDate() - 27);
    const params = new URLSearchParams({
      start: start.toISOString(),
      limit: "200",
      offset: "0"
    });

    apiFetch(`/api/sales?${params.toString()}`, {
      headers: authHeader,
      signal: controller.signal
    })
      .then((data) => {
        setSalesItems(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setStatus(error.message || "Failed to load sales.");
      });

    return () => controller.abort();
  }, [activeView, authHeader, token]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus("Signing in...");
    const body = new URLSearchParams();
    body.set("username", login.username);
    body.set("password", login.password);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      setStatus("Login failed.");
      return;
    }

    const data = await response.json();
    setToken(data.access_token);
    setStatus("Signed in.");
  };

  const loadDashboard = async () => {
    if (!token) {
      setStatus("Add a token to load the dashboard.");
      return;
    }
    setStatus("Loading dashboard...");
    const response = await fetch("/api/reporting/dashboard", {
      headers: authHeader
    });

    if (!response.ok) {
      setStatus("Failed to load dashboard.");
      return;
    }

    const data = await response.json();
    setSummary(data);
    setStatus("Dashboard updated.");
  };

  const handleVolunteerRegister = async (event) => {
    event.preventDefault();
    setVolunteerMessage("");

    if (!volunteerForm.username || !volunteerForm.password) {
      setVolunteerMessage("Username and password are required.");
      return;
    }
    if (!volunteerForm.fullName || !volunteerForm.email || !volunteerForm.phone) {
      setVolunteerMessage("Full name, email, and phone are required.");
      return;
    }

    try {
      setStatus("Registering volunteer...");
      const created = await apiFetch("/api/volunteers/register", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: volunteerForm.username,
          password: volunteerForm.password,
          full_name: volunteerForm.fullName,
          email: volunteerForm.email,
          phone: volunteerForm.phone
        })
      });
      setVolunteerRoster((prev) => [created, ...prev]);
      setVolunteerForm({
        username: "",
        password: "",
        fullName: "",
        email: "",
        phone: ""
      });
      setVolunteerMessage("Volunteer registered.");
      setStatus("Volunteer registered.");
    } catch (error) {
      setVolunteerMessage(error.message || "Failed to register volunteer.");
      setStatus("Volunteer registration failed.");
    }
  };

  const handleVolunteerClockIn = async () => {
    setVolunteerOpsMessage("");
    try {
      setStatus("Clocking in...");
      if (currentUser?.role === "volunteer") {
        await apiFetch("/api/volunteers/time-entries/clock-in", {
          method: "POST",
          headers: authHeader
        });
      } else {
        const userId = Number(volunteerOpsUserId);
        if (!userId) {
          setVolunteerOpsMessage("Select a volunteer.");
          return;
        }
        await apiFetch(`/api/volunteers/time-entries/${userId}/clock-in`, {
          method: "POST",
          headers: authHeader
        });
      }
      setVolunteerOpsMessage("Clock-in recorded.");
      setStatus("Volunteer clocked in.");
      const refreshed = await apiFetch("/api/volunteers/time-entries", {
        headers: authHeader
      });
      setVolunteerEntries(Array.isArray(refreshed) ? refreshed : []);
      setVolunteersLoaded(true);
    } catch (error) {
      setVolunteerOpsMessage(error.message || "Failed to clock in.");
      setStatus("Clock-in failed.");
    }
  };

  const handleVolunteerClockOut = async () => {
    setVolunteerOpsMessage("");
    try {
      setStatus("Clocking out...");
      if (currentUser?.role === "volunteer") {
        await apiFetch("/api/volunteers/time-entries/clock-out", {
          method: "POST",
          headers: authHeader
        });
      } else {
        const userId = Number(volunteerOpsUserId);
        if (!userId) {
          setVolunteerOpsMessage("Select a volunteer.");
          return;
        }
        await apiFetch(`/api/volunteers/time-entries/${userId}/clock-out`, {
          method: "POST",
          headers: authHeader
        });
      }
      setVolunteerOpsMessage("Clock-out recorded.");
      setStatus("Volunteer clocked out.");
      const refreshed = await apiFetch("/api/volunteers/time-entries", {
        headers: authHeader
      });
      setVolunteerEntries(Array.isArray(refreshed) ? refreshed : []);
      setVolunteersLoaded(true);
    } catch (error) {
      setVolunteerOpsMessage(error.message || "Failed to clock out.");
      setStatus("Clock-out failed.");
    }
  };

  const handleAdminSeed = async () => {
    setSeedMessage("");
    const confirmed = window.confirm(
      "This will add a lot of demo data. Continue?"
    );
    if (!confirmed) {
      return;
    }

    try {
      setStatus("Seeding data...");
      const response = await apiFetch("/api/admin/seed", {
        method: "POST",
        headers: authHeader
      });
      const summary = response?.summary || {};
      const inventoryCount = summary.inventory_items ?? "unknown";
      setSeedMessage(`Seeded. Inventory items: ${inventoryCount}.`);
      setStatus("Seed completed.");
    } catch (error) {
      setSeedMessage(error.message || "Seed failed.");
      setStatus("Seed failed.");
    }
  };

  const handleCategoryCreate = async (event) => {
    event.preventDefault();
    setCategoryMessage("");

    if (!categoryForm.name) {
      setCategoryMessage("Category name is required.");
      return;
    }

    try {
      setStatus("Creating category...");
      const created = await apiFetch("/api/categories", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: categoryForm.name,
          description: categoryForm.description || null
        })
      });
      setCategories((prev) => {
        const next = [...prev, created];
        next.sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      setCategoryForm({ name: "", description: "" });
      setCategoryMessage("Category created.");
      setStatus("Category updated.");
    } catch (error) {
      setCategoryMessage(error.message || "Failed to create category.");
      setStatus("Category update failed.");
    }
  };

  const handleSaleSubmit = async (event) => {
    event.preventDefault();
    setPosMessage("");

    if (!posSelection) {
      setPosMessage("Select an item to sell.");
      return;
    }

    const salePrice = Number(posPrice || posSelection.rawPrice);
    if (!salePrice || salePrice <= 0) {
      setPosMessage("Enter a valid sale price.");
      return;
    }

    try {
      setStatus("Processing sale...");
      await apiFetch("/api/sales", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inventory_item_id: posSelection.id,
          sale_price: salePrice
        })
      });
      setPosMessage("Sale recorded.");
      setPosPrice("");
      setPosSelection(null);
      const refreshed = await fetchInventory({ view: "pos" });
      setInventoryItems(refreshed);
      setStatus("Inventory updated.");
    } catch (error) {
      setPosMessage(error.message || "Failed to record sale.");
      setStatus("Sale failed.");
    }
  };

  const handleInventoryCreate = async (event) => {
    event.preventDefault();
    setInventoryActionMessage("");
    const donationId = Number(inventoryForm.donationId);
    const categoryId = Number(inventoryForm.categoryId);
    const price = Number(inventoryForm.price);

    if (!inventoryForm.name) {
      setInventoryActionMessage("Item name is required.");
      return;
    }
    if (!categoryId || categoryId <= 0) {
      setInventoryActionMessage("Select a category.");
      return;
    }
    if (!inventoryForm.condition) {
      setInventoryActionMessage("Condition is required.");
      return;
    }
    if (!price || price <= 0) {
      setInventoryActionMessage("Enter a valid price.");
      return;
    }

    try {
      setStatus("Creating inventory item...");
      await apiFetch("/api/inventory", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          donation_id: Number.isNaN(donationId) || donationId <= 0 ? null : donationId,
          category_id: categoryId,
          name: inventoryForm.name,
          description: inventoryForm.description || null,
          condition: inventoryForm.condition,
          price
        })
      });
      setInventoryActionMessage("Inventory item created.");
      setInventoryForm({
        donationId: "",
        categoryId: "",
        name: "",
        description: "",
        condition: "",
        price: ""
      });
      const refreshed = await fetchInventory({ view: "inventory" });
      setInventoryItems(refreshed);
      setStatus("Inventory updated.");
    } catch (error) {
      setInventoryActionMessage(error.message || "Failed to create item.");
      setStatus("Inventory update failed.");
    }
  };

  const handleInventoryUpdate = async () => {
    setInventoryActionMessage("");
    if (!inventorySelection) {
      setInventoryActionMessage("Select an item to update.");
      return;
    }

    const payload = {};
    if (inventoryForm.categoryId) {
      const categoryId = Number(inventoryForm.categoryId);
      if (!categoryId || categoryId <= 0) {
        setInventoryActionMessage("Select a valid category.");
        return;
      }
      payload.category_id = categoryId;
    }
    if (inventoryForm.name) {
      payload.name = inventoryForm.name;
    }
    if (inventoryForm.description) {
      payload.description = inventoryForm.description;
    }
    if (inventoryForm.condition) {
      payload.condition = inventoryForm.condition;
    }
    if (inventoryForm.price) {
      const price = Number(inventoryForm.price);
      if (!price || price <= 0) {
        setInventoryActionMessage("Enter a valid price.");
        return;
      }
      payload.price = price;
    }

    if (!Object.keys(payload).length) {
      setInventoryActionMessage("Provide fields to update.");
      return;
    }

    try {
      setStatus("Updating inventory item...");
      await apiFetch(`/api/inventory/${inventorySelection.id}`, {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      setInventoryActionMessage("Inventory item updated.");
      const refreshed = await fetchInventory({ view: "inventory" });
      setInventoryItems(refreshed);
      setStatus("Inventory updated.");
    } catch (error) {
      setInventoryActionMessage(error.message || "Failed to update item.");
      setStatus("Inventory update failed.");
    }
  };

  const renderInventoryTable = ({ selectable, selection, onSelect }) => (
    <section className="catalog">
      <div className={compactTables ? "table compact" : "table"}>
        <div className={compactTables ? "table-head compact" : "table-head"}>
          <span>Item</span>
          <span>SKU</span>
          <span>Condition</span>
          <span>Intake</span>
          <span>Price</span>
          <span>Status</span>
        </div>
        {filteredInventoryRows.length ? (
          filteredInventoryRows.map((product, index) => (
            <div
              key={`${product.name}-${index}`}
              className={
                selectable
                  ? selection?.id === product.id
                    ? "table-row selectable selected"
                    : "table-row selectable"
                  : "table-row"
              }
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              onClick={selectable ? () => onSelect(product) : undefined}
              onKeyDown={
                selectable
                  ? (event) => {
                      if (event.key === "Enter") {
                        onSelect(product);
                      }
                    }
                  : undefined
              }
            >
              <div>
                <strong>{product.name}</strong>
                <p>{product.category}</p>
                {product.description ? (
                  <p className="helper">{product.description}</p>
                ) : null}
              </div>
              <span>{product.sku}</span>
              <span>{product.condition}</span>
              <span>{product.intake}</span>
              <span className="price">{product.price}</span>
              <span className={`status-pill ${product.status.toLowerCase()}`}>
                {product.status}
              </span>
            </div>
          ))
        ) : (
          <div className="table-empty">
            {inventoryLoaded
              ? "No inventory items found."
              : "Sign in to load inventory."}
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="pos-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MF</div>
          <div>
            <p>MissionFlow</p>
            <span>Thrift POS</span>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="avatar">
            {currentUser?.username
              ? currentUser.username.slice(0, 2).toUpperCase()
              : "??"}
          </div>
          <div>
            <strong>{currentUser?.username || "Not signed in"}</strong>
            <span>{currentUser?.role || ""}</span>
            {token ? (
              <button type="button" className="link" onClick={() => setToken("")}
                ><FiLogOut /> Sign out</button>
            ) : null}
          </div>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={
                item.id === activeView ? "nav-item active" : "nav-item"
              }
              type="button"
              onClick={() => setActiveView(item.id)}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>Active shift</p>
          <strong>Open register</strong>
        </div>
      </aside>

      <main className="content">
        {activeView === "inventory" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Inventory control</p>
                <h1>Inventory Intake</h1>
                <p className="subtitle">
                  Track intake batches, condition checks, and pricing readiness.
                </p>
              </div>
              <div className="topbar-actions">
                <div className="search">
                  <input
                    placeholder="Search by SKU, category, or donor"
                    aria-label="Search inventory"
                  />
                </div>
                <button
                  className="ghost small density-toggle"
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => setCompactTables((prev) => !prev)}
                >
                  {compactTables ? "Comfort view" : "Compact view"}
                </button>
                <button
                  className="primary small panel-toggle"
                  type="button"
                  onClick={() => {
                    setPanelOpen(true);
                    setInventorySelection(null);
                    setInventoryForm({
                      donationId: "",
                      categoryId: "",
                      name: "",
                      description: "",
                      condition: "",
                      price: ""
                    });
                    setInventoryActionMessage("");
                  }}
                >
                  New item
                </button>
              </div>
            </header>

            <section className="filters">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    category === activeCategory ? "chip active" : "chip"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </section>

            <div className="filter-summary">
              <div className="filter-meta">
                <span className="filter-pill">Filters</span>
                <span>{inventoryFilterSummary}</span>
                <span className="filter-count">
                  {filteredInventoryRows.length} results
                </span>
              </div>
              <button
                className="ghost small"
                type="button"
                disabled={activeCategory === "All items"}
                onClick={() => setActiveCategory("All items")}
              >
                Clear filters
              </button>
            </div>

            <section className="chart-card inventory">
              <div className="panel-head">
                <h2 className="with-icon"><FiBox /> Inventory Mix</h2>
                <span>By category</span>
              </div>
              <div className="chart-callouts">
                {inventoryTotals.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="bar-chart">
                {inventoryChart.length ? (
                  inventoryChart.map((item) => (
                    <div key={item.label} className="bar">
                      <div className="bar-track">
                        <span style={{ width: `${item.value}%` }} />
                      </div>
                      <div className="bar-meta">
                        <span>{item.label}</span>
                        <strong>{item.value}%</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="chart-empty">No inventory data yet.</p>
                )}
              </div>
            </section>

            {renderInventoryTable({
              selectable: true,
              selection: inventorySelection,
              onSelect: setInventorySelection
            })}
          </>
        ) : activeView === "donations" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Donation desk</p>
                <h1>Donations Intake</h1>
                <p className="subtitle">
                  Track donor drop-offs, receipts, and intake handoffs.
                </p>
              </div>
              <div className="topbar-actions">
                <div className="search">
                  <input
                    placeholder="Search donor or receipt"
                    aria-label="Search donations"
                  />
                </div>
                <button
                  className="ghost small density-toggle"
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => setCompactTables((prev) => !prev)}
                >
                  {compactTables ? "Comfort view" : "Compact view"}
                </button>
                <button
                  className="ghost small panel-toggle"
                  type="button"
                  onClick={() => setPanelOpen(true)}
                >
                  Actions
                </button>
              </div>
            </header>

            <section className="filters">
              {donationFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={
                    donationFilter === filter.id ? "chip active" : "chip"
                  }
                  type="button"
                  onClick={() => setDonationFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </section>

            <div className="filter-summary">
              <div className="filter-meta">
                <span className="filter-pill">Filters</span>
                <span>{donationFilterSummary}</span>
                <span className="filter-count">
                  {filteredDonations.length} results
                </span>
              </div>
              <button
                className="ghost small"
                type="button"
                disabled={donationFilter === "all"}
                onClick={() => setDonationFilter("all")}
              >
                Clear filters
              </button>
            </div>

            <section className="chart-card donations">
              <div className="panel-head">
                <h2 className="with-icon"><FiGift /> Weekly Donations</h2>
                <span>Last 7 days</span>
              </div>
              <div className="chart-callouts">
                {donationTotals.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="line-chart">
                {donationsChart.map((item) => (
                  <div key={item.label} className="line-point">
                    <div
                      className="line-dot"
                      style={{ height: `${Math.max(item.value * 6, 10)}px` }}
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="catalog">
              <div className={compactTables ? "table compact" : "table"}>
                <div className={compactTables ? "table-head compact" : "table-head"}>
                  <span>Donor</span>
                  <span>Received</span>
                  <span>Received by</span>
                  <span>Items</span>
                  <span>Status</span>
                </div>
                {filteredDonations.length ? (
                  filteredDonations.map((donation) => (
                    <div key={`${donation.donor}-${donation.receivedAt}`} className="table-row">
                      <div>
                        <strong>{donation.donor}</strong>
                        <p>Community drop-off</p>
                      </div>
                      <span>{donation.receivedAt}</span>
                      <span>{donation.receivedBy}</span>
                      <span>{donation.items}</span>
                      <span className={`status-pill ${donation.status.toLowerCase().replace(" ", "-")}`}>
                        {donation.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="table-empty">
                    {donationsLoaded
                      ? "No donations found."
                      : "Sign in to load donations."}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeView === "volunteers" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Volunteer management</p>
                <h1>Volunteer Shifts</h1>
                <p className="subtitle">
                  Track active shifts, assignments, and time logged today.
                </p>
              </div>
              <div className="topbar-actions">
                <div className="search">
                  <input
                    placeholder="Search volunteer or station"
                    aria-label="Search volunteers"
                  />
                </div>
                <button
                  className="ghost small density-toggle"
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => setCompactTables((prev) => !prev)}
                >
                  {compactTables ? "Comfort view" : "Compact view"}
                </button>
                <button
                  className="ghost small panel-toggle"
                  type="button"
                  onClick={() => setPanelOpen(true)}
                >
                  Actions
                </button>
              </div>
            </header>

            <section className="filters">
              {volunteerFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={
                    volunteerFilter === filter.id ? "chip active" : "chip"
                  }
                  type="button"
                  onClick={() => setVolunteerFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </section>

            <div className="filter-summary">
              <div className="filter-meta">
                <span className="filter-pill">Filters</span>
                <span>{volunteerFilterSummary}</span>
                <span className="filter-count">
                  {filteredVolunteers.length} results
                </span>
              </div>
              <button
                className="ghost small"
                type="button"
                disabled={volunteerFilter === "all"}
                onClick={() => setVolunteerFilter("all")}
              >
                Clear filters
              </button>
            </div>

            <section className="chart-card volunteers">
              <div className="panel-head">
                <h2 className="with-icon"><FiUsers /> Shift Coverage</h2>
                <span>Volunteers by time</span>
              </div>
              <div className="chart-callouts">
                {volunteerTotals.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <div className="bar-chart compact">
                {volunteerChart.map((item) => (
                  <div key={item.label} className="bar">
                    <div className="bar-track">
                      <span style={{ width: `${item.value * 12}%` }} />
                    </div>
                    <div className="bar-meta">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="catalog">
              <div className={compactTables ? "table compact" : "table"}>
                <div className={compactTables ? "table-head compact" : "table-head"}>
                  <span>Volunteer</span>
                  <span>Contact</span>
                  <span>Clock in</span>
                  <span>Minutes</span>
                  <span>Status</span>
                </div>
                {filteredVolunteers.length ? (
                  filteredVolunteers.map((volunteer) => (
                    <div key={`${volunteer.name}-${volunteer.clockIn}`} className="table-row">
                      <div>
                        <strong>{volunteer.name}</strong>
                        <p>{volunteer.role}</p>
                      </div>
                      <span>{volunteer.role}</span>
                      <span>{volunteer.clockIn}</span>
                      <span>{volunteer.minutes}</span>
                      <span className={`status-pill ${volunteer.status.toLowerCase()}`}>
                        {volunteer.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="table-empty">
                    {volunteersLoaded
                      ? "No volunteer time entries found."
                      : "Sign in to load volunteer data."}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeView === "reporting" ? (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Executive summary</p>
                <h1>Reporting Dashboard</h1>
                <p className="subtitle">
                  Review performance trends across sales, donations, and volunteer impact.
                </p>
              </div>
              <div className="topbar-actions">
                <div className="search">
                  <input placeholder="Search reports" aria-label="Search reports" />
                </div>
                <button
                  className="ghost small density-toggle"
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => setCompactTables((prev) => !prev)}
                >
                  {compactTables ? "Comfort view" : "Compact view"}
                </button>
                <button
                  className="ghost small panel-toggle"
                  type="button"
                  onClick={() => {
                    loadDashboard();
                    setPanelOpen(true);
                  }}
                >
                  Sync
                </button>
              </div>
            </header>

            <section className="report-cards">
              {reportCards.map((card) => (
                <div key={card.label} className="report-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </section>

            <section className="chart-card reporting">
              <div className="panel-head">
                <h2 className="with-icon"><FiBarChart2 /> Sales Trend</h2>
                <span>Monthly</span>
              </div>
              <div className="line-chart">
                {reportingChart.map((item) => (
                  <div key={item.label} className="line-point">
                    <div className="line-dot" style={{ height: `${item.value}px` }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="catalog">
              <div className={compactTables ? "table compact" : "table"}>
                <div className={compactTables ? "table-head compact reporting" : "table-head reporting"}>
                  <span>Metric</span>
                  <span>Total</span>
                  <span>Status</span>
                  <span>Notes</span>
                </div>
                {reportRows.map((row) => (
                  <div key={row.metric} className="table-row reporting">
                    <div>
                      <strong>{row.metric}</strong>
                      <p>Auto-updated</p>
                    </div>
                    <span>{row.total}</span>
                    <span className="status-pill ready">On track</span>
                    <span>Aligned</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">Checkout floor</p>
                <h1>Thrift Checkout</h1>
                <p className="subtitle">
                  Process sales from available inventory items.
                </p>
              </div>
              <div className="topbar-actions">
                <div className="search">
                  <input placeholder="Search donated items" aria-label="Search items" />
                </div>
                <button
                  className="ghost small density-toggle"
                  type="button"
                  aria-pressed={compactTables}
                  onClick={() => setCompactTables((prev) => !prev)}
                >
                  {compactTables ? "Comfort view" : "Compact view"}
                </button>
                <button
                  className="primary small panel-toggle"
                  type="button"
                  onClick={() => setPanelOpen(true)}
                >
                  Checkout
                </button>
              </div>
            </header>

            <section className="filters">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    category === activeCategory ? "chip active" : "chip"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </section>

            <div className="filter-summary">
              <div className="filter-meta">
                <span className="filter-pill">Filters</span>
                <span>{inventoryFilterSummary}</span>
                <span className="filter-count">
                  {filteredInventoryRows.length} results
                </span>
              </div>
              <button
                className="ghost small"
                type="button"
                disabled={activeCategory === "All items"}
                onClick={() => setActiveCategory("All items")}
              >
                Clear filters
              </button>
            </div>

            {renderInventoryTable({
              selectable: true,
              selection: posSelection,
              onSelect: setPosSelection
            })}
          </>
        )}
      </main>

      <aside className={panelOpen ? "order-panel panel-open" : "order-panel"}>
        <div className="panel-card">
          <div className="panel-head">
            <h2 className="with-icon"><FiUser /> Staff Session</h2>
            <span
              className={`status-pill${status.toLowerCase().includes("loading") ? " loading" : ""}`}
            >
              {status}
            </span>
          </div>
          {token ? (
            <div className="session-form">
              <div>
                <strong>{currentUser?.username || "Signed in"}</strong>
                <p className="helper">Role: {currentUser?.role || "staff"}</p>
              </div>
            </div>
          ) : (
            <form className="session-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={login.username}
                  onChange={(event) =>
                    setLogin((prev) => ({
                      ...prev,
                      username: event.target.value
                    }))
                  }
                  placeholder="manager"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={login.password}
                  onChange={(event) =>
                    setLogin((prev) => ({
                      ...prev,
                      password: event.target.value
                    }))
                  }
                  placeholder="password"
                />
              </label>
              <button className="primary" type="submit">
                Sign in
              </button>
              <p className="helper">Accounts are created by managers only.</p>
            </form>
          )}
          <div className="token-box">
            <button className="ghost" type="button" onClick={loadDashboard}>
              Sync reporting
            </button>
          </div>
        </div>

        {activeView === "inventory" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Inventory Editor</h2>
              <span>{inventorySelection ? "Edit" : "New"}</span>
            </div>
            <form className="session-form" onSubmit={handleInventoryCreate}>
              <label>
                Donation ID (optional)
                <input
                  value={inventoryForm.donationId}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      donationId: event.target.value
                    }))
                  }
                  placeholder="Donation ID or leave blank"
                />
              </label>
              <p className="helper">Leave blank to record a manual intake item.</p>
              <label>
                Item name
                <input
                  value={inventoryForm.name}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      name: event.target.value
                    }))
                  }
                  placeholder="Item name"
                />
              </label>
              <label>
                Description
                <textarea
                  value={inventoryForm.description}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                  placeholder="Short description"
                  rows={3}
                />
              </label>
              <label>
                Category
                <select
                  value={inventoryForm.categoryId}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      categoryId: event.target.value
                    }))
                  }
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {categoriesLoaded && !categories.length ? (
                <p className="helper">Add a category before creating items.</p>
              ) : null}
              <label>
                Condition
                <input
                  value={inventoryForm.condition}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      condition: event.target.value
                    }))
                  }
                  placeholder="Condition"
                />
              </label>
              <label>
                Price
                <input
                  value={inventoryForm.price}
                  onChange={(event) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      price: event.target.value
                    }))
                  }
                  placeholder="$0.00"
                />
              </label>
              {inventoryActionMessage ? (
                <p className="pos-message">{inventoryActionMessage}</p>
              ) : null}
              <div className="form-actions">
                <button className="primary" type="submit">
                  Create item
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={handleInventoryUpdate}
                  disabled={!inventorySelection}
                >
                  Update item
                </button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    setInventorySelection(null);
                    setInventoryForm({
                      donationId: "",
                      categoryId: "",
                      name: "",
                      description: "",
                      condition: "",
                      price: ""
                    });
                    setInventoryActionMessage("");
                  }}
                >
                  Clear
                </button>
              </div>
              <p className="helper">Updates require manager access.</p>
            </form>
          </div>
        )}

        {activeView === "inventory" && currentUser?.role === "manager" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Create Category</h2>
              <span>{categoriesLoaded ? "Ready" : "Loading"}</span>
            </div>
            <form className="session-form" onSubmit={handleCategoryCreate}>
              <label>
                Category name
                <input
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      name: event.target.value
                    }))
                  }
                  placeholder="e.g. Furniture"
                />
              </label>
              <label>
                Description
                <textarea
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                  placeholder="Optional description"
                  rows={3}
                />
              </label>
              {categoryMessage ? <p className="helper">{categoryMessage}</p> : null}
              <button className="primary" type="submit">
                Add category
              </button>
            </form>
          </div>
        )}

        {activeView === "volunteers" && currentUser?.role === "volunteer" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Volunteer Actions</h2>
              <span>Self-service</span>
            </div>
            <div className="session-form">
              {volunteerOpsMessage ? <p className="pos-message">{volunteerOpsMessage}</p> : null}
              <div className="form-actions">
                <button className="primary" type="button" onClick={handleVolunteerClockIn}>
                  Clock in
                </button>
                <button className="ghost" type="button" onClick={handleVolunteerClockOut}>
                  Clock out
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "volunteers" && currentUser?.role !== "volunteer" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Volunteer Actions</h2>
              <span>{volunteerRosterLoaded ? "Ready" : "Loading"}</span>
            </div>
            <div className="session-form">
              <label>
                Select volunteer
                <select
                  value={volunteerOpsUserId}
                  onChange={(event) => setVolunteerOpsUserId(event.target.value)}
                >
                  <option value="">Choose a volunteer</option>
                  {volunteerRoster.map((volunteer) => (
                    <option key={volunteer.id} value={volunteer.id}>
                      {volunteer.full_name || volunteer.username}
                    </option>
                  ))}
                </select>
              </label>
              {volunteerOpsMessage ? <p className="pos-message">{volunteerOpsMessage}</p> : null}
              <div className="form-actions">
                <button className="primary" type="button" onClick={handleVolunteerClockIn}>
                  Clock in
                </button>
                <button className="ghost" type="button" onClick={handleVolunteerClockOut}>
                  Clock out
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === "volunteers" && currentUser?.role !== "volunteer" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Register Volunteer</h2>
              <span>Manager or staff</span>
            </div>
            <form className="session-form" onSubmit={handleVolunteerRegister}>
              <label>
                Username
                <input
                  value={volunteerForm.username}
                  onChange={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      username: event.target.value
                    }))
                  }
                  placeholder="volunteer.username"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={volunteerForm.password}
                  onChange={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      password: event.target.value
                    }))
                  }
                  placeholder="Temporary password"
                />
              </label>
              <label>
                Full name
                <input
                  value={volunteerForm.fullName}
                  onChange={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      fullName: event.target.value
                    }))
                  }
                  placeholder="Full name"
                />
              </label>
              <label>
                Email
                <input
                  value={volunteerForm.email}
                  onChange={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      email: event.target.value
                    }))
                  }
                  placeholder="email@example.com"
                />
              </label>
              <label>
                Phone
                <input
                  value={volunteerForm.phone}
                  onChange={(event) =>
                    setVolunteerForm((prev) => ({
                      ...prev,
                      phone: event.target.value
                    }))
                  }
                  placeholder="(555) 555-5555"
                />
              </label>
              {volunteerMessage ? <p className="helper">{volunteerMessage}</p> : null}
              <button className="primary" type="submit">
                Register volunteer
              </button>
            </form>
          </div>
        )}

        {activeView === "reporting" && currentUser?.role === "manager" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2>Developer Seed</h2>
              <span>Manager only</span>
            </div>
            <div className="session-form">
              <p className="helper">
                Adds sample data across users, donations, inventory, sales, and volunteers.
              </p>
              {seedMessage ? <p className="pos-message">{seedMessage}</p> : null}
              <button className="ghost" type="button" onClick={handleAdminSeed}>
                Run full seed
              </button>
            </div>
          </div>
        )}

        {activeView === "inventory" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2 className="with-icon"><FiBox /> Inventory Totals</h2>
              <span>Today</span>
            </div>
            <div className="metric-grid">
              {inventoryTotals.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "donations" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2 className="with-icon"><FiGift /> Donation Totals</h2>
              <span>Today</span>
            </div>
            <div className="metric-grid">
              {donationTotals.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "volunteers" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2 className="with-icon"><FiUsers /> Volunteer Totals</h2>
              <span>Today</span>
            </div>
            <div className="metric-grid">
              {volunteerTotals.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === "pos" && (
          <div className="panel-card">
            <div className="panel-head">
              <h2 className="with-icon"><FiShoppingCart /> Record Sale</h2>
              <span>Register</span>
            </div>
            <form className="session-form" onSubmit={handleSaleSubmit}>
              <label>
                Selected item
                <input
                  value={posSelection ? posSelection.name : "None"}
                  placeholder="Select an item"
                  readOnly
                />
              </label>
              <label>
                Sale price
                <input
                  value={posPrice}
                  onChange={(event) => setPosPrice(event.target.value)}
                  placeholder={posSelection?.price || "$0.00"}
                />
              </label>
              {posMessage ? <p className="pos-message">{posMessage}</p> : null}
              <button className="primary" type="submit">
                Process sale
              </button>
            </form>
          </div>
        )}
      </aside>
      {panelOpen ? (
        <button
          className="panel-scrim"
          type="button"
          aria-label="Close panel"
          onClick={() => setPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}