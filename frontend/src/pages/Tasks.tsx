import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { Task, Goal } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Calendar,
  Repeat,
} from "lucide-react";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    goalId: "",
    priority: "medium" as "low" | "medium" | "high",
    recurring: { enabled: false, frequency: "daily" as any, interval: 1 },
    dueDate: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchGoals();
  }, []);

  const fetchTasks = async () => {
    const res = await api.get("/tasks");
    setTasks(res.data);
  };

  const fetchGoals = async () => {
    const res = await api.get("/goals");
    setGoals(res.data);
  };

  const createTask = async () => {
    try {
      await api.post("/tasks", {
        ...newTask,
        goalId: newTask.goalId || null,
        dueDate: newTask.dueDate || null,
      });
      setNewTask({
        title: "",
        description: "",
        goalId: "",
        priority: "medium",
        recurring: { enabled: false, frequency: "daily", interval: 1 },
        dueDate: "",
      });
      setShowNewTask(false);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const toggleTask = async (id: string) => {
    await api.patch(`/tasks/${id}/toggle`);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    fetchTasks();
  };

  const addSubtask = async (taskId: string, title: string) => {
    await api.post(`/tasks/${taskId}/subtasks`, { title });
    fetchTasks();
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`);
    fetchTasks();
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Tasks</h2>
        <Button onClick={() => setShowNewTask(!showNewTask)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {showNewTask && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
            <Input
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value as any })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Goal (optional)</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newTask.goalId}
                  onChange={(e) =>
                    setNewTask({ ...newTask, goalId: e.target.value })
                  }
                >
                  <option value="">No Goal</option>
                  {goals.map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date (optional)</label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newTask.recurring.enabled}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      recurring: {
                        ...newTask.recurring,
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-sm font-medium">Recurring</span>
              </label>
              {newTask.recurring.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newTask.recurring.frequency}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        recurring: {
                          ...newTask.recurring,
                          frequency: e.target.value as any,
                        },
                      })
                    }
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Interval"
                    value={newTask.recurring.interval}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        recurring: {
                          ...newTask.recurring,
                          interval: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button onClick={createTask} disabled={!newTask.title}>
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowNewTask(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <Card
            key={task._id}
            className="border-l-4"
            style={{
              borderLeftColor: task.completed
                ? "#10b981"
                : task.priority === "high"
                ? "#ef4444"
                : task.priority === "medium"
                ? "#eab308"
                : "#22c55e",
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => toggleTask(task._id)}
                  className="mt-1 flex-shrink-0"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      task.completed
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {task.completed && <Check className="w-3 h-3 text-black" />}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {task.subtasks.length > 0 && (
                        <button onClick={() => toggleExpanded(task._id)}>
                          {expandedTasks.has(task._id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <span
                        className={`font-medium ${
                          task.completed
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.recurring.enabled && (
                        <Repeat className="w-4 h-4 text-primary" />
                      )}
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTask(task._id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                  {task.goalId && (
                    <div className="mt-2 text-xs text-primary">
                      Goal:{" "}
                      {typeof task.goalId === "object" ? task.goalId.title : ""}
                    </div>
                  )}
                  {expandedTasks.has(task._id) && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-muted">
                      {task.subtasks.map((subtask) => (
                        <div
                          key={subtask._id}
                          className="flex items-center space-x-2"
                        >
                          <button
                            onClick={() => toggleSubtask(task._id, subtask._id)}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                subtask.completed
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {subtask.completed && (
                                <Check className="w-2 h-2 text-black" />
                              )}
                            </div>
                          </button>
                          <span
                            className={`text-sm ${
                              subtask.completed
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                      <AddSubtaskInput
                        onAdd={(title) => addSubtask(task._id, title)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AddSubtaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue("");
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="text-primary"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add subtask
      </Button>
    );
  }

  return (
    <div className="flex space-x-2">
      <Input
        placeholder="Subtask title"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        className="h-8 text-sm"
      />
      <Button size="sm" onClick={handleSubmit}>
        Add
      </Button>
      <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
        Cancel
      </Button>
    </div>
  );
}
