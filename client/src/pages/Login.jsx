import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.login(formData);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Welcome back!');
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

  

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Building className="login-icon" />
          <h1>Roofing Proposal App</h1>
          <p>AI-powered roofing proposals made simple</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
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
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>



        <div className="login-footer">
          <p>Built for roofing professionals</p>
        </div>
      </div>
    </div>
  );
}
