import React, { Component } from "react";
import { Outlet } from "react-router-dom";
import Header from "./header";
import Sidebar from "./sidebar";

export default class MainLayout extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        console.log('MainLayout: ', props);
    }
    render() {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Header {...this.props}/>
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
}
