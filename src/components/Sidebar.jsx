import React from "react";
import { FiLogOut } from "react-icons/fi";

export default function Sidebar({ currentUser, token, setToken, navItems, activeView, setActiveView, onOpenLogin }) {
  return (
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
            ) : (
              <button type="button" className="link" onClick={onOpenLogin}>
                <FiLogOut /> Sign in
              </button>
            )}
          </div>
      </div>
      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={item.id === activeView ? "nav-item active" : "nav-item"}
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
  );
}
