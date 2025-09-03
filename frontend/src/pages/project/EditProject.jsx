import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Renders a page with a form to edit the name of an existing project.
 * It fetches the current project's data to pre-populate the form and
 * submits the updated information to the backend.
 * @returns {JSX.Element} The rendered component for editing a project.
 */
const EditProject = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  /**
   * Effect to fetch the project's current data when the component mounts
   * or when the project ID or user session changes.
   */
  useEffect(() => {
    const fetchProject = async () => {
      const token = user?.token;
      if (!token) {
        setError("You must be logged in to edit a project.");
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/my-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const project = res.data.find(p => p._id === id);
        if (project) {
          setName(project.name);
        } else {
          setError("Project not found");
        }
      } catch {
        setError("Failed to load project");
      }
    };

    fetchProject();
  }, [id, user]);

  /**
   * Handles the form submission to update the project's name.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = user?.token;
    if (!token) {
      setError("You must be logged in to update a project.");
      return;
    }
    try {
      await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, { name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded bg-white p-8 shadow-md dark:bg-gray-800">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">Edit Project</h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md hover:bg-[#d74918]"
          >
            Update Project
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditProject;