import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import './UserManagement.css';

export default function UserManagement({ onClose }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'contractor'
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Fetch all users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await api.getAllUsers();
      return response.users || [];
    }
  });

  const users = usersData || [];

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (userData) => api.createUser(userData),
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, userData }) => api.updateUser(id, userData),
    onSuccess: () => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    }
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: (id) => api.deactivateUser(id),
    onSuccess: () => {
      toast.success('User deactivated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate user');
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => api.resetUserPassword(id, password),
    onSuccess: () => {
      toast.success('Password reset successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordData({ password: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    }
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'contractor'
    });
  };

  const handleAddUser = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'contractor'
    });
    setShowEditModal(true);
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setPasswordData({ password: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const handleSubmitAdd = (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    const { password, ...updateData } = formData;
    const userData = password ? formData : updateData;
    updateMutation.mutate({ id: selectedUser.id, userData });
  };

  const handleSubmitPassword = (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    resetPasswordMutation.mutate({
      id: selectedUser.id,
      password: passwordData.password
    });
  };

  const handleDeactivate = (user) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.email}?`)) {
      deactivateMutation.mutate(user.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div className="header-actions">
          <button onClick={handleAddUser} className="btn-add">
            <Plus size={18} />
            Add User
          </button>
          <button onClick={onClose} className="btn-close">
            <X size={18} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-users">
                    No users found. Add your first user to get started.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={user.isActive === false ? 'inactive' : ''}>
                    <td>
                      {user.firstName} {user.lastName}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role || 'contractor'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive !== false ? 'active' : 'inactive'}`}>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="btn-edit"
                          title="Edit user"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="btn-password"
                          title="Reset password"
                        >
                          <Lock size={16} />
                        </button>
                        {user.isActive !== false && (
                          <button
                            onClick={() => handleDeactivate(user)}
                            className="btn-delete"
                            title="Deactivate user"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="contractor">Contractor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="contractor">Contractor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password for {selectedUser.email}</h3>
              <button onClick={() => setShowPasswordModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmitPassword} className="user-form">
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

