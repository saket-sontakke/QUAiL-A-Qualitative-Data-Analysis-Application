import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * @component EditProject
 * @description A page component that allows users to edit the name of an existing project.
 * It fetches the current project data based on the URL parameter and submits updates to the backend.
 */
const EditProject = () => {
    // React Router hooks to get URL parameters and for navigation
    const { id } = useParams();
    const navigate = useNavigate();

    // State to manage the project name and any potential errors
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    /**
     * @effect
     * @description Fetches the project data from the backend when the component mounts or the project ID changes.
     * It populates the form with the current project name.
     */
    useEffect(() => {
        const fetchProject = async () => {
            try {
                const token = localStorage.getItem('token');
                // API call to get all user projects
                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/my-projects`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                // Find the specific project by its ID
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
    }, [id]); // Dependency array ensures this runs when the 'id' parameter changes

    /**
     * @function handleUpdate
     * @description Handles the form submission to update the project's name.
     * It sends a PUT request to the backend with the new name.
     * @param {React.FormEvent} e - The form submission event.
     */
    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // API call to update the project
            await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, { name }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Navigate back to the home page on successful update
            navigate('/home');
        } catch (err) {
            // Set an error message if the API call fails
            setError(err.response?.data?.error || 'Update failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center text-[#1D3C87] dark:text-[#F05623]">Edit Project</h2>
                
                {/* Display error message if any */}
                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
                
                {/* Project Update Form */}
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
