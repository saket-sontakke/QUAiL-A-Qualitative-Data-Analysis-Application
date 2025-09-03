import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext.jsx';

/**
 * Renders a page with a form for creating a new project. It handles form
 * submission, communicates with the backend API to create the project, and
 * navigates the user to the new project's view upon successful creation.
 * @returns {JSX.Element} The rendered component for creating a project.
 */
const CreateProject = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  /**
   * Handles the form submission to create a new project. It validates that
   * a user is authenticated, sends the project name to the backend, and
   * redirects to the new project page on success.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    const token = user?.token;

    if (!token) {
      setError('You must be logged in to create a project.');
      return;
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects/create`, { name }, { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/project/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Project creation failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-6 text-gray-800 transition-colors duration-500 dark:bg-gray-900 dark:text-white">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl duration-500 hover:scale-[1.015] dark:bg-gray-800">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#1D3C87] dark:text-[#F05623]">
          Create New Project
        </h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            placeholder="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-white transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#1D3C87] dark:border-gray-600 dark:bg-gray-700"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-[#F05623] py-2 px-4 font-semibold text-white shadow-md transition duration-300 hover:scale-105 hover:bg-[#d74918]"
          >
            Create Project
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;