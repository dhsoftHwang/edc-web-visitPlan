import React, { useState } from "react";
import { NavLink } from "react-router-dom";

export function Sidebar() {

  //Menu Open 관리
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menuKey) => {
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "12px 20px",
    color: isActive ? "#007bff" : "#333",
    backgroundColor: isActive ? "#e7f3ff" : "transparent",
    textDecoration: "none",
    borderRadius: "4px",
    marginBottom: "5px",
    transition: "all 0.2s",
    fontSize:20
  });

  const subLinkStyle = ({ isActive }) => ({
    ...linkStyle({ isActive }),
    marginLeft: "30px",
    paddingLeft: "36px",
    fontSize: 16,
  });

  return (
    <aside style={{
      width: "250px", backgroundColor: "#f8f9fa", padding: "20px",
      borderRight: "1px solid #dee2e6", height: "100%",
    }}>
      <nav>
        <div>
          <NavLink to="/visit/definition" end style={linkStyle} onClick={() => toggleMenu("plan")}>방문 예약 관리</NavLink>
          {openMenu === "plan" && (
              <div>
                <NavLink to="/visit/definition" style={subLinkStyle}>연구대상자 방문관리</NavLink>
                <NavLink to="/visit/plan" style={subLinkStyle}>방문 예정 일정 관리</NavLink>
              </div>
            )}
        </div>
        <div>
          <NavLink to="/visit/calendar" style={linkStyle} onClick={() => toggleMenu("event")}>방문 관리</NavLink>
          {openMenu === "event" && (
            <div>
              <NavLink to="/visit/calendar" style={subLinkStyle}>방문 Calendar</NavLink>
              <NavLink to="/visit/add" style={subLinkStyle}>방문 등록</NavLink>
              <NavLink to="/visit/state" style={subLinkStyle}>방문 현황</NavLink>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
