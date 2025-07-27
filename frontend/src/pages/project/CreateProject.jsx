import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * @component CreateProject
 * @description A page component that provides a form for users to create a new project.
 * On successful creation, it navigates the user to the newly created project's view.
 */
const CreateProject = () => {
    // State to hold the project name input by the user
    const [name, setName] = useState('');
    // State to hold any errors that occur during project creation
    const [error, setError] = useState('');
    // Hook for programmatic navigation
    const navigate = useNavigate();

    /**
     * @function handleCreate
     * @description Handles the form submission for creating a new project.
     * It sends a POST request to the backend with the project name.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleCreate = async (e) => {
        e.preventDefault();
        setError(''); // Reset previous errors
        const token = localStorage.getItem('token');

        try {
            // API call to the backend to create the project
            const res = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/api/projects/create`,
                { name },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Navigate to the new project's page on success
            navigate(`/project/${res.data._id}`);
        } catch (err) {
            // Set an error message if the API call fails
            setError(err.response?.data?.error || 'Project creation failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-500 px-6 flex items-center justify-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl duration-500 hover:scale-[1.015]">
                <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">
                    Create New Project
                </h2>

                {/* Display error message if any */}
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                {/* Project Creation Form */}
                <form onSubmit={handleCreate} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Project Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3C87] transition duration-300"
                    />
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-[#F05623] hover:bg-[#d74918] text-white font-semibold rounded-lg shadow-md transition duration-300 hover:scale-105"
                    >
                        Create Project
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateProject;
