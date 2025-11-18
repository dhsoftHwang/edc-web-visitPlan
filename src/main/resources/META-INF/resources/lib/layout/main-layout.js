import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

export function MainLayout() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header/>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Sidebar/>
                <main style={{
                    flex: 1,
                    padding: '30px',
                    overflow: 'auto',
                    backgroundColor: 'white'
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}