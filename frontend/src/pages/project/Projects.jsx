import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Navbar from '../layout/Navbar.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import {
  FaSearch,
  FaTh,
  FaList,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaCalendarAlt,
  FaSortAlphaDown,
  FaSortAlphaDownAlt,
  FaSortAmountDown,
  FaSortAmountDownAlt,
  FaCheck,
  FaTimes
} from 'react-icons/fa';

const RenderSortIcon = ({ sortConfig }) => {
  const { key, direction } = sortConfig;
  const iconProps = { className: "text-gray-600 dark:text-gray-300", size: 20 };
  if (key === 'name' && direction === 'asc') return <FaSortAlphaDown {...iconProps} />;
  if (key === 'name' && direction === 'desc') return <FaSortAlphaDownAlt {...iconProps} />;
  if ((key === 'created' || key === 'modified') && direction === 'desc') return <FaSortAmountDown {...iconProps} />;
  if ((key === 'created' || key === 'modified') && direction === 'asc') return <FaSortAmountDownAlt {...iconProps} />;
  return null;
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [error, setError] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutConfirmData, setLogoutConfirmData] = useState({});

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('tiles');
  const [sortConfig, setSortConfig] = useState({ key: 'created', direction: 'desc' });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();
  const sortMenuRef = useRef(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const token = user?.token;
      if (!token) {
        setError("User not logged in");
        setIsLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/projects/my-projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useMemo(() => {
    let result = [...projects];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(project =>
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query))
      );
    }
    result.sort((a, b) => {
      if (sortConfig.key === 'name') {
        const comparison = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      if (sortConfig.key === 'modified') {
        const dateA = new Date(a.updatedAt);
        const dateB = new Date(b.updatedAt);
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredProjects(result);
  }, [projects, searchQuery, sortConfig]);

  const deleteProject = async () => {
    const token = user?.token;
    if (!token) {
      setError("Authentication error. Please log in again.");
      setShowModal(false);
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(projects.filter(project => project._id !== projectToDelete));
      setShowModal(false);
      setProjectToDelete(null);
    } catch (err)
     {
      setError(err.response?.data?.error || "Failed to delete project");
      setShowModal(false);
    }
  };
  
  const confirmDelete = (id) => {
    setProjectToDelete(id);
    setShowModal(true);
  };

  const handleSortChange = (key, direction) => {
    setSortConfig({ key, direction });
    setIsSortMenuOpen(false);
  };

  const projectToDeleteDetails = projects.find(p => p._id === projectToDelete);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      <Navbar 
        setShowConfirmModal={setShowLogoutConfirm}
        setConfirmModalData={setLogoutConfirmData}
      />

      <main className="container mx-auto flex flex-col flex-grow p-6 pt-22 overflow-hidden">
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md mb-6 z-10">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div className="relative flex-grow md:max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-900 dark:focus:ring-[#F05623]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label="Clear search"
                >
                  <FaTimes className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              )}
            </div>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button onClick={() => setViewMode('tiles')} className={`p-2 rounded-md ${viewMode === 'tiles' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} aria-label="Tile view">
                <FaTh className={viewMode === 'tiles' ? 'text-[#F05623]' : 'text-gray-500'} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`} aria-label="List view">
                <FaList className={viewMode === 'list' ? 'text-[#F05623]' : 'text-gray-500'} />
              </button>
            </div>
            <div className="relative" ref={sortMenuRef}>
              <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center bg-gray-100 dark:bg-gray-700" title="Sort Projects">
                <RenderSortIcon sortConfig={sortConfig} />
              </button>
              <AnimatePresence>
                {isSortMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-50">
                    <div className="p-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Sort By</div>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button onClick={() => handleSortChange('name', 'asc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'name' && sortConfig.direction === 'asc' && <FaCheck />}</span>
                        <span>Name (A-Z)</span>
                      </button>
                      <button onClick={() => handleSortChange('name', 'desc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'name' && sortConfig.direction === 'desc' && <FaCheck />}</span>
                        <span>Name (Z-A)</span>
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button onClick={() => handleSortChange('created', 'desc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'created' && sortConfig.direction === 'desc' && <FaCheck />}</span>
                        <span>Date Created (Newest)</span>
                      </button>
                      <button onClick={() => handleSortChange('created', 'asc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'created' && sortConfig.direction === 'asc' && <FaCheck />}</span>
                        <span>Date Created (Oldest)</span>
                      </button>
                       <hr className="my-1 border-gray-200 dark:border-gray-600" />
                      <button onClick={() => handleSortChange('modified', 'desc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'modified' && sortConfig.direction === 'desc' && <FaCheck />}</span>
                        <span>Date Modified (Newest)</span>
                      </button>
                      <button onClick={() => handleSortChange('modified', 'asc')} className="w-full text-left px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                        <span className="w-4">{sortConfig.key === 'modified' && sortConfig.direction === 'asc' && <FaCheck />}</span>
                        <span>Date Modified (Oldest)</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
             <div className="flex-grow"></div>
            <Link to="/create-project" className="flex items-center justify-center gap-2 transform rounded-lg bg-[#F05623] py-2.5 px-5 font-bold text-white shadow-lg transition duration-300 hover:scale-105 hover:bg-[#d74918]">
              <FaPlus className="text-sm" />
              Create Project
            </Link>
          </div>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          {error && (<div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200 rounded"><p>{error}</p></div>)}

          {isLoading && (<div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F05623]"></div></div>)}
          
          {!isLoading && filteredProjects.length === 0 && !error && (
              <div className="text-center py-12 px-4 rounded-xl bg-white dark:bg-gray-800 shadow">
                  <div className="mx-auto w-24 h-24 mb-6 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">No projects found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">{searchQuery ? 'Try adjusting your search query.' : 'Create your first project to get started!'}</p>
              </div>
          )}

          {!isLoading && filteredProjects.length > 0 && viewMode === 'tiles' && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <motion.div key={project._id} className="relative flex flex-col justify-between rounded-xl bg-white p-6 shadow-lg transition duration-500 hover:shadow-2xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
                  <div>
                    <h2 className="mb-3 text-2xl font-bold text-cyan-900 dark:text-[#F05623] line-clamp-1">{project.name}</h2>
                    {project.description && (<p className="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{project.description}</p>)}
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center">
                        <FaCalendarAlt className="mr-1.5 flex-shrink-0" />
                        <span>Created: {new Date(project.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center">
                        <FaEdit className="mr-1.5 flex-shrink-0" />
                        <span>Modified: {new Date(project.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <Link to={`/project/${project._id}`} className="flex items-center gap-1.5 font-medium text-cyan-700 transition duration-200 hover:text-cyan-900 dark:text-blue-400 dark:hover:text-blue-200"><FaEye />View</Link>
                    <div className="flex space-x-4">
                      <Link to={`/edit-project/${project._id}`} className="flex items-center gap-1.5 text-sm text-green-600 transition hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"><FaEdit />Edit</Link>
                      <button onClick={() => confirmDelete(project._id)} className="flex items-center gap-1.5 text-sm text-red-600 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"><FaTrash />Delete</button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!isLoading && filteredProjects.length > 0 && viewMode === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.map((project) => (
                  <motion.li key={project._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-cyan-900 dark:text-[#F05623] truncate">{project.name}</h3>
                        {project.description && (<p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">{project.description}</p>)}
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <div className="flex items-center">
                                <FaCalendarAlt className="mr-1.5" />
                                <span>Created: {new Date(project.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center">
                                <FaEdit className="mr-1.5" />
                                <span>Modified: {new Date(project.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <Link to={`/project/${project._id}`} className="flex items-center gap-1.5 text-sm font-medium text-cyan-700 transition hover:text-cyan-900 dark:text-blue-400 dark:hover:text-blue-200" title="View Project"><FaEye /><span className="hidden sm:inline">View</span></Link>
                        <Link to={`/edit-project/${project._id}`} className="flex items-center gap-1.5 text-sm text-green-600 transition hover:text-green-800 dark:text-green-400 dark:hover:text-green-200" title="Edit Project"><FaEdit /><span className="hidden sm:inline">Edit</span></Link>
                        <button onClick={() => confirmDelete(project._id)} className="flex items-center gap-1.5 text-sm text-red-600 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-200" title="Delete Project"><FaTrash /><span className="hidden sm:inline">Delete</span></button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <ConfirmationModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={deleteProject}
        title="Confirm Deletion"
        shortMessage={
          <p>
            Deleting "{projectToDeleteDetails?.name || 'this project'}" will <strong>permanently remove the project and all the data associated with it.</strong>
            <br /> <br />
            <span className="font-bold text-red-500">THIS ACTION CANNOT BE UNDONE.</span>
            <br /> <br />
            Are you sure you want to delete the project?
          </p>
        }
        showInput={true}
        promptText={projectToDeleteDetails?.name}
        confirmText="Delete Project"
      />

      <ConfirmationModal
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        {...logoutConfirmData}
      />
    </div>
  );
};

export default Projects;