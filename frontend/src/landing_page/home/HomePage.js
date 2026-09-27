import React from 'react';

import Hero from './Hero';
import Features from './Features';
import Join from '../Join';

import Navbar from '../Navbar';
import Footer from '../Footer';



function Homepage() {
    return (  
        <>
        <Navbar/>
        <Hero/>
        <Features/>
        <Join/>
        <Footer/>
        </>
    );
}

export default Homepage;