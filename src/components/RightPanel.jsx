import React from "react";
import { useCart } from "../cart";
import { FiUser, FiBox, FiGift, FiUsers, FiShoppingCart } from "react-icons/fi";

export default function RightPanel(props) {
  const {
    panelOpen,
    status,
    token,
    currentUser,
    login,
    setLogin,
    handleLogin,
    loadDashboard,
    activeView,
    inventorySelection,
    handleInventoryCreate,
    inventoryForm,
    setInventoryForm,
    categories,
    categoriesLoaded,
    inventoryActionMessage,
    handleInventoryUpdate,
    setInventorySelection,
    setInventoryActionMessage,
    categoryForm,
    setCategoryForm,
    categoryMessage,
    handleCategoryCreate,
    volunteerOpsMessage,
    handleVolunteerClockIn,
    handleVolunteerClockOut,
    volunteerRosterLoaded,
    volunteerRoster,
    volunteerOpsUserId,
    setVolunteerOpsUserId,
    handleVolunteerRegister,
    volunteerForm,
    setVolunteerForm,
    volunteerMessage,
    seedMessage,
    handleAdminSeed,
    inventoryTotals,
    donationTotals,
    volunteerTotals,
    handleSaleSubmit,
    posSelection,
    posPrice,
    setPosPrice,
    posMessage
  } = props;
  const { cart } = useCart();

  return (
    <aside className={panelOpen ? "order-panel panel-open" : "order-panel"}>

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
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            {categoriesLoaded && !categories.length ? <p className="helper">Add a category before creating items.</p> : null}
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
            {inventoryActionMessage ? <p className="pos-message">{inventoryActionMessage}</p> : null}
            <div className="form-actions">
              <button className="primary" type="submit">Create item</button>
              <button className="ghost" type="button" onClick={handleInventoryUpdate} disabled={!inventorySelection}>Update item</button>
              <button className="ghost" type="button" onClick={() => {
                setInventorySelection(null);
                setInventoryForm({ donationId: "", categoryId: "", name: "", description: "", condition: "", price: "" });
                setInventoryActionMessage("");
              }}>Clear</button>
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
              <input value={categoryForm.name} onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. Furniture" />
            </label>
            <label>
              Description
              <textarea value={categoryForm.description} onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Optional description" rows={3} />
            </label>
            {categoryMessage ? <p className="helper">{categoryMessage}</p> : null}
            <button className="primary" type="submit">Add category</button>
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
              <button className="primary" type="button" onClick={handleVolunteerClockIn}>Clock in</button>
              <button className="ghost" type="button" onClick={handleVolunteerClockOut}>Clock out</button>
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
              <select value={volunteerOpsUserId} onChange={(event) => setVolunteerOpsUserId(event.target.value)}>
                <option value="">Choose a volunteer</option>
                {volunteerRoster.map((volunteer) => (
                  <option key={volunteer.id} value={volunteer.id}>{volunteer.full_name || volunteer.username}</option>
                ))}
              </select>
            </label>
            {volunteerOpsMessage ? <p className="pos-message">{volunteerOpsMessage}</p> : null}
            <div className="form-actions">
              <button className="primary" type="button" onClick={handleVolunteerClockIn}>Clock in</button>
              <button className="ghost" type="button" onClick={handleVolunteerClockOut}>Clock out</button>
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
              <input value={volunteerForm.username} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="volunteer.username" />
            </label>
            <label>
              Password
              <input type="password" value={volunteerForm.password} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Temporary password" />
            </label>
            <label>
              Full name
              <input value={volunteerForm.fullName} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="Full name" />
            </label>
            <label>
              Email
              <input value={volunteerForm.email} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="email@example.com" />
            </label>
            <label>
              Phone
              <input value={volunteerForm.phone} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="(555) 555-5555" />
            </label>
            <label>
              Role
              <input value={volunteerForm.role || ''} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="e.g. Floor" />
            </label>
            <label>
              Status
              <select value={volunteerForm.status || 'ACTIVE'} onChange={(event) => setVolunteerForm((prev) => ({ ...prev, status: event.target.value }))}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            {volunteerMessage ? <p className="helper">{volunteerMessage}</p> : null}
            <button className="primary" type="submit">Register volunteer</button>
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
            <p className="helper">Adds sample data across users, donations, inventory, sales, and volunteers.</p>
            {seedMessage ? <p className="pos-message">{seedMessage}</p> : null}
            <button className="ghost" type="button" onClick={handleAdminSeed}>Run full seed</button>
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
              <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
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
              <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
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
              <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>
            ))}
          </div>
        </div>
      )}

      {/* POS panel intentionally removed */}
    </aside>
  );
}
