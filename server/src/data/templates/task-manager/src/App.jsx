import { Plus, Check, Trash2, Menu, X, PlusCircle, Edit3, Filter, List, Kanban, Settings, User } from 'lucide-react'

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'review', title: 'Review', color: 'bg-yellow-100' },
  { id: 'done', title: 'Done', color: 'bg-green-100' },
]

const tasks = [
  { id: '1', title: 'Design homepage mockup', column: 'todo', priority: 'high', assignee: 'Alice', due: '2024-01-20' },
  { id: '2', title: 'Set up project structure', column: 'in-progress', priority: 'medium', assignee: 'Bob', due: '2024-01-18' },
  { id: '3', title: 'Write API documentation', column: 'todo', priority: 'low', assignee: 'Carol', due: '2024-01-25' },
  { id: '4', title: 'Fix login bug', column: 'review', priority: 'high', assignee: 'David', due: '2024-01-19' },
  { id: '5', title: 'Deploy staging environment', column: 'done', priority: 'medium', assignee: 'Alice', due: '2024-01-15' },
]

export default function App() {
  const [newTask, setNewTask] = React.useState('')
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">T</div>
            <span>Kanban</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-gray-600 hover:text-gray-900">Board</button>
            <button className="text-sm font-medium text-gray-600 hover:text-gray-900">List</button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add task</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Board</h1>
            <p className="text-gray-500">Organize your work with Kanban boards</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <PlusCircle className="w-4 h-4" /> Add task
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(col => (
            <div key={col.id} className={`min-w-[300px] rounded-xl border p-2 ${col.color}`}>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-semibold text-gray-900">{col.title}</h3>
                <span className="text-xs font-medium text-gray-500">{tasks.filter(t => t.column === col.id).length}</span>
              </div>
              <div className="space-y-3 min-h-[400px]">
                {tasks.filter(t => t.column === col.id).map(task => (
                  <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow group relative">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {task.priority}
                    </span>
                    <h4 className="font-medium text-gray-900 mt-1 mb-1">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <span>{task.assignee}</span>
                      <span className="w-px h-3 bg-gray-300 mx-1"></span>
                      <span>{task.due}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="min-w-[300px] rounded-xl border border-dashed border-gray-300 p-2 bg-gray-50 flex items-center justify-center h-full min-h-[400px]">
            <button className="text-gray-400 hover:text-gray-600">+ New column</button>
          </div>
        </div>
      </div>
    </div>
  )
}
