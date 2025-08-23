import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Demo } from '../components/Demo';
import Features from '../components/Features';
import ProgramHighlight from '../components/ProgramHighlight';
import CreatorSpotlight from '../components/CreatorSpotlight';
import Partners from '../components/Partners';
import Categories from '../components/Categories';
import Testimonials from '../components/Testimonials';
import CTABanner from '../components/CTABanner';
import Footer from '../components/Footer';
import Header from '../components/Header';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Don't render landing page content if user is logged in
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-deep-orange/30 border-t-deep-orange rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect, so don't render anything
  }

  return (
    <>
      <Header />
      <Demo />
      <CreatorSpotlight />
      <Features />
      <Categories />
      <ProgramHighlight />
      <Testimonials />
      <Partners />
      <CTABanner />
      <Footer />
    </>
  );
};

export default LandingPage;