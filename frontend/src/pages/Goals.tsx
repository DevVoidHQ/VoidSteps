import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Goal, Task } from '@/types/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, X, ChevronDown, ChevronRight, Target } from 'lucide-react';

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [goalTasks, setGoalTasks] = useState<Record<string, Task[]>>({});
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const res = await api.get('/goals');
    setGoals(res.data);
  };

  const fetchGoalTasks = async (goalId: string) => {
    if (!goalTasks[goalId]) {
      const res = await api.get(`/goals/${goalId}/tasks`);
      setGoalTasks({ ...goalTasks, [goalId]: res.data });
    }
  };

  const createGoal = async () => {
    try {
      await api.post('/goals', newGoal);
      setNewGoal({ title: '', description: '' });
      setShowNewGoal(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    await api.delete(`/goals/${id}`);
    fetchGoals();
  };

  const toggleExpanded = async (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
      await fetchGoalTasks(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const getTasksStats = (tasks: Task[]) => {
    const completed = tasks.filter(t => t.completed).length;
    return { total: tasks.length, completed };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Goals</h2>
        <Button onClick={() => setShowNewGoal(!showNewGoal)}>
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {showNewGoal && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Goal title"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            />
            <Input
              placeholder="Description (optional)"
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
            />
            <div className="flex space-x-2">
              <Button onClick={createGoal} disabled={!newGoal.title}>Create</Button>
              <Button variant="outline" onClick={() => setShowNewGoal(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const tasks = goalTasks[goal._id] || [];
          const stats = getTasksStats(tasks);
          const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

          return (
            <Card key={goal._id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-5 h-5 text-primary" />
                      <CardTitle className="text-xl">{goal.title}</CardTitle>
                    </div>
                    {goal.description && (
                      <CardDescription>{goal.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteGoal(goal._id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{stats.completed} / {stats.total} tasks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleExpanded(goal._id)}
                    className="w-full"
                  >
                    {expandedGoals.has(goal._id) ? (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Hide Tasks
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-4 h-4 mr-2" />
                        View Tasks
                      </>
                    )}
                  </Button>

                  {expandedGoals.has(goal._id) && (
                    <div className="space-y-2 pt-2 border-t">
                      {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No tasks linked to this goal
                        </p>
                      ) : (
                        tasks.map((task) => (
                          <div
                            key={task._id}
                            className="flex items-center space-x-2 text-sm p-2 rounded hover:bg-muted"
                          >
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                              task.completed ? 'bg-green-500' : 'bg-muted-foreground'
                            }`} />
                            <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                              {task.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && !showNewGoal && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first goal to start tracking your progress
            </p>
            <Button onClick={() => setShowNewGoal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
