import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Homepage from './landing_page/home/HomePage';
import AboutPage from './landing_page/about/AboutPage';
import SignUp from './landing_page/signup/SignUp';
import Features from './landing_page/home/Features';
import MembershipPage from './landing_page/membership/MembershipPage';

import Dashboard from "./dashboard/Dashboard";
import CreateUser from "./dashboard/CreateUser";
import Billing from "./dashboard/Billing";
import Attendance from "./dashboard/Attendance";
import Members from "./dashboard/Members";
import MembershipPlan from "./dashboard/MembershipPlan";
import RenewMembership from "./dashboard/RenewMembership";
import Receipt from "./dashboard/Receipt";
import User from "./dashboard/User";
import RequireAuth from "./dashboard/RequireAuth";

import NotFound from './landing_page/NotFound';

import { MemberProvider } from "./dashboard/MemberContext";

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <MemberProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/feature" element={<Features />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/create" element={<CreateUser />} />
          <Route path="/member" element={<Members />} />
          <Route path="/plan" element={<MembershipPlan />} />
          <Route path="/renew" element={<RenewMembership />} />
          <Route path="/renewplan" element={<RenewMembership />} />
          <Route path="/receipt" element={<Receipt />} />
          <Route path="/user/:id" element={<User />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </MemberProvider>
);
