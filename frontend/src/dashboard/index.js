import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import './index.css';
import Homepage from './landing_page/home/HomePage';
import AboutPage from './landing_page/about/AboutPage';
import SignUp from './landing_page/signup/SignUp';

import Navbar from './landing_page/Navbar';
import Footer from './landing_page/Footer';
import NotFound from './landing_page/NotFound';


import Features from './landing_page/home/Features';
import MembershipPage from './landing_page/membership/MembershipPage';
import Dashboard from "./components/Dashboard";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/feature" element={<Features />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
  </BrowserRouter>
);

