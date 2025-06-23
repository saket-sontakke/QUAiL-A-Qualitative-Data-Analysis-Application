import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const EditProject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/projects/my-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const project = res.data.find(p => p._id === id);
        if (project) setName(project.name);
        else setError("Project not found");
      } catch {
        setError("Failed to load project");
      }
    };

    fetchProject();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/projects/${id}`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">Edit Project</h2>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87]"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md"
          >
            Update Project
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProject;
