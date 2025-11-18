import React from "react";

export function Header() {

    return (
        <header style={{
            backgroundColor: '#f8f9fa',
            color: '#333',
            padding: '15px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <h1 style={{ margin: 0, color: '#0056b3', fontSize: '24px' }}>
                SMART-EDC
            </h1>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
            }}>
                <span>👤 사용자이름 - 추후 로그인한 사용자와 연동</span>
            </div>
        </header>
    );

}