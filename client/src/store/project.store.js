import { create } from 'zustand'

/**
 * ProjectStore — client-side project UI state (Zustand).
 *
 * Holds the currently open project and the list of projects. Kept separate
 * from server state (TanStack Query) so UI selections (which project is open)
 * don't trigger unnecessary refetches.
 */
export const useProjectStore = create((set) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    })),
}))

export default useProjectStore
