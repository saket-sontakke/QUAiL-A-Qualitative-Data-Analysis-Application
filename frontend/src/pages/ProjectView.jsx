import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Navbar from './Navbar.jsx';

const ProjectView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [selectedContent, setSelectedContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProject(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`http://localhost:5000/api/projects/import/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setProject(res.data.project);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    }
  };

  if (loading) return <div className="text-center mt-10 text-gray-500">Loading...</div>;
  if (error) return <div className="text-center text-red-500 mt-10">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <Navbar /> {/* Render the Navbar component here */}
      <div className="px-6 py-10 pt-20"> {/* Added pt-20 to account for fixed Navbar */}
        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-center bg-white dark:bg-gray-800 shadow-md rounded-lg px-6 py-4 mb-4"
        >
          <h2 className="text-xl font-semibold text-[#1D3C87] dark:text-[#F05623]">{project?.name}</h2>
          <div className="flex gap-4 items-center">
            <Link to="/create-project" className="px-4 py-2 bg-[#F05623] hover:bg-[#d74918] text-white rounded-md">
              New Project
            </Link>
            <Link to="/home" className="px-4 py-2 bg-[#1D3C87] hover:bg-[#153070] text-white rounded-md">
              Open Project
            </Link>
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={handleFileChange}
              className="hidden"
              id="importFile"
            />
            <label
              htmlFor="importFile"
              className="cursor-pointer px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
            >
              Import File
            </label>
          </div>
        </motion.div>

        {/* Split View */}
        <div className="flex gap-6">
          {/* Left Panel - Document Browser */}
          <div className="w-1/3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-[#1D3C87] dark:text-[#F05623]">Imported Files</h3>
            <ul className="space-y-2">
              {project.importedFiles && project.importedFiles.length > 0 ? (
                project.importedFiles.map((file, idx) => (
                  <li
                    key={idx}
                    onClick={() => setSelectedContent(file.content)}
                    className="cursor-pointer px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition"
                  >
                    {file.name}
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">No files imported yet</li>
              )}
            </ul>
          </div>

          {/* Right Panel - Document Viewer */}
          <div className="w-2/3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md overflow-y-auto max-h-[70vh]">
            <h3 className="text-lg font-semibold text-[#1D3C87] dark:text-[#F05623] mb-3">Viewer</h3>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200">
              {selectedContent || 'Select a document to view its contents.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;