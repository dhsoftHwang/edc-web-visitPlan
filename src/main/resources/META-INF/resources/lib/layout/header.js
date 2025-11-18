import React, { Component } from "react";

export default class Header extends Component {
    constructor(props)
    {
        super(props);
        this.userName = props.userName;
        console.log('appParams:', props);
    }

    render() {
        return(
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
                    <span>👤 {this.userName}</span>
                </div>
            </header>
        );
    }
}