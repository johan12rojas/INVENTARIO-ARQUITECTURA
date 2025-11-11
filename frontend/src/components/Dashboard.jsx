import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardContent from './DashboardContent';
import './Dashboard.css';

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('inicio');

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-body">
        <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
        <main className="dashboard-main">
          <DashboardContent activeMenu={activeMenu} />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;


