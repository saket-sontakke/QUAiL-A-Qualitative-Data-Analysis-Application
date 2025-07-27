import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from './layout/Navbar.jsx';

/**
 * @component Home
 * @description The main landing page for an authenticated user. It displays a list of their projects,
 * allows them to create new projects, and provides options to view, edit, or delete existing ones.
 */
const Home = () => {
    // State for managing the list of projects, error messages, and the delete confirmation modal.
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    
    // Hook for programmatic navigation.
    const navigate = useNavigate();

    /**
     * @effect
     * @description Fetches the user's projects from the API when the component mounts.
     * It requires a valid authentication token from localStorage.
     */
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return setError("User not logged in");

                const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/my-projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProjects(res.data);
            } catch (err) {
                setError(err.response?.data?.error || "Failed to load projects");
            }
        };

        fetchProjects();
    }, []);

    /**
     * @function deleteProject
     * @description Sends a DELETE request to the API to remove the selected project.
     * On success, it updates the local state to reflect the deletion and closes the modal.
     */
    const deleteProject = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectToDelete}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Optimistically update the UI by filtering out the deleted project.
            setProjects(projects.filter(project => project._id !== projectToDelete));
            setShowModal(false);
            setProjectToDelete(null);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to delete project");
        }
    };

    /**
     * @function confirmDelete
     * @description Sets the project ID to be deleted and displays the confirmation modal.
     * @param {string} id - The ID of the project to be deleted.
     */
    const confirmDelete = (id) => {
        setProjectToDelete(id);
        setShowModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-500">
            <Navbar />
            <div className="container mx-auto p-6 pt-20"> {/* Added pt-20 to account for fixed Navbar */}
                
                {/* Error Display */}
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}

                {/* Create Project Button */}
                <div className="flex justify-center mb-8">
                    <Link
                        to="/create-project"
                        className="bg-[#F05623] hover:bg-[#d74918] text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition duration-300 hover:scale-105"
                    >
                        Create New Project
                    </Link>
                </div>

                {/* Project Grid */}
                {projects.length === 0 ? (
                    <p className="text-center text-gray-600 dark:text-gray-400 text-lg">No projects found. Create one to get started!</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projects.map((project) => (
                            <motion.div
                                key={project._id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative flex flex-col justify-between transform transition duration-500 hover:scale-[1.02] hover:shadow-2xl"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ translateY: -5 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div>
                                    <h2 className="text-2xl font-semibold mb-3 text-[#1D3C87] dark:text-[#F05623]">
                                        {project.name}
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                        Created: {new Date(project.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <Link
                                        to={`/project/${project._id}`}
                                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium transition duration-200"
                                    >
                                        View Project
                                    </Link>
                                    <div className="flex space-x-3">
                                        <Link
                                            to={`/edit-project/${project._id}`}
                                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition duration-200"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => confirmDelete(project._id)}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition duration-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.8 }}
                                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[90%] max-w-sm text-center"
                            >
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                    Confirm Deletion
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                    Are you sure you want to delete this project? This action cannot be undone.
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={deleteProject}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 dark:text-gray-900 rounded transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Home;
