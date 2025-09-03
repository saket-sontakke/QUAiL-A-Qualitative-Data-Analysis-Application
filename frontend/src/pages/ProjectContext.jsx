import { createContext } from 'react';

/**
 * @description Defines a React Context for sharing project-related data and
 * functions throughout the component tree, avoiding the need to pass props
 * down through multiple levels.
 */
export const ProjectContext = createContext(null);