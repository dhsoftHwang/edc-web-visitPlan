import React, { Component } from "react";
import { NavLink, useLocation } from "react-router-dom";

/* =========================
 *  클래스형 Sidebar
 *  - 이 클래스 이름은 Sidebar 고정
 * ========================= */
class Sidebar extends Component {
  constructor(props) {
    super(props);
    // Menu Open 관리
    this.state = {
      openMenu: null,
    };
    this.toggleMenu = this.toggleMenu.bind(this);
  }

  toggleMenu(menuKey) {
    this.setState((prevState) => ({
      openMenu: prevState.openMenu === menuKey ? null : menuKey,
    }));
  }

  render() {
    const { location } = this.props;
    const pathname = location?.pathname || "";

    const isPlanSection = pathname === "/visit/definition" || pathname === "/visit/plan";

    const isEventSection = pathname === "/visit/calendar" || pathname === "/visit/add" || pathname === "/visit/state";

    const { openMenu } = this.state;

    const linkStyle = ({ isActive }) => ({
      display: "block",
      padding: "12px 20px",
      color: isActive ? "#007bff" : "#333",
      backgroundColor: isActive ? "#e7f3ff" : "transparent",
      textDecoration: "none",
      borderRadius: "4px",
      marginBottom: "5px",
      transition: "all 0.2s",
      fontSize: 20,
    });

    const subLinkStyle = ({ isActive }) => ({
      ...linkStyle({ isActive }),
      marginLeft: "30px",
      paddingLeft: "36px",
      fontSize: 16,
    });

    return (
      <aside
        style={{
          width: "250px",
          backgroundColor: "#f8f9fa",
          padding: "20px",
          borderRight: "1px solid #dee2e6",
          height: "100%",
        }}
      >
        <nav>
          <div>
            <NavLink to="/visit/definition" end style={({ isActive }) => linkStyle({ isActive: isActive || isPlanSection })} onClick={() => this.toggleMenu("plan")}>방문 예약 관리</NavLink>
            {openMenu === "plan" && (
              <div>
                <NavLink to="/visit/definition" style={subLinkStyle}>연구대상자 방문관리</NavLink>
                <NavLink to="/visit/plan" style={subLinkStyle}>방문 예정 일정 관리</NavLink>
              </div>
            )}
          </div>


        </nav>
      </aside>
    );
  }
}

//Hook
function SidebarWrapper(props) {
  const location = useLocation();
  return <Sidebar {...props} location={location} />;
}

export default SidebarWrapper;