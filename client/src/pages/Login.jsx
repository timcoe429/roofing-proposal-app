import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Login.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await api.login(formData);
      } else {
        // Split name into firstName and lastName for registration
        const nameParts = formData.name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        response = await api.register({
          email: formData.email,
          password: formData.password,
          firstName,
          lastName,
          companyName: formData.company
        });
      }
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Demo login function
  const handleDemoLogin = () => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify({ 
      name: 'Demo User', 
      email: 'demo@example.com',
      company: 'Demo Roofing Co.' 
    }));
    toast.success('Logged in as demo user!');
    navigate('/');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Building className="login-icon" />
          <h1>Roofing Proposal App</h1>
          <p>AI-powered roofing proposals made simple</p>
        </div>

        <div className="auth-toggle">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <User className="form-icon" />
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <Building className="form-icon" />
                <input
                  type="text"
                  name="company"
                  placeholder="Company Name"
                  value={formData.company}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}
          
          <div className="form-group">
            <User className="form-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <Lock className="form-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            <LogIn className="button-icon" />
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="demo-section">
          <div className="divider">
            <span>or</span>
          </div>
          <button onClick={handleDemoLogin} className="demo-button">
            Try Demo (No Registration)
          </button>
        </div>

        <div className="login-footer">
          <p>Built for roofing professionals</p>
        </div>
      </div>
    </div>
  );
}
