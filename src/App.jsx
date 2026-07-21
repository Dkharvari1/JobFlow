import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import JobDetails from "./pages/JobDetails";
import Workspaces from "./pages/Workspaces";
import WorkspaceDashboard from "./pages/WorkspaceDashboard";
import InviteTeam from "./pages/InviteTeam";
import TeamMembers from "./pages/TeamMembers";
import JobProgress from "./pages/JobProgress";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import Messages from "./pages/Messages";
import ClockInOut from "./pages/ClockInOut";

import { mockJobs } from "./data/mockJobs";

function App() {
  const [jobs, setJobs] = useState(mockJobs);

  const addJob = (newJob) => {
    setJobs((prevJobs) => [newJob, ...prevJobs]);
  };

  const updateJobStatus = (jobId, newStatus) => {
    setJobs((prevJobs) =>
      prevJobs.map((job) =>
        job.id === jobId ? { ...job, status: newStatus } : job
      )
    );
  };

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/workspaces" element={<Workspaces />} />

      <Route element={<AppLayout />}>
        <Route
          path="/workspaces/:workspaceId/dashboard"
          element={<WorkspaceDashboard />}
        />

        <Route
          path="/workspaces/:workspaceId/team"
          element={<TeamMembers />}
        />

        <Route
          path="/workspaces/:workspaceId/messages"
          element={<Messages />}
        />

        <Route
          path="/workspaces/:workspaceId/progress"
          element={<JobProgress />}
        />

        <Route
          path="/workspaces/:workspaceId/settings"
          element={<WorkspaceSettings />}
        />

        <Route
          path="/workspaces/:workspaceId/jobs"
          element={<Jobs />}
        />

        <Route
          path="/workspaces/:workspaceId/jobs/new"
          element={<CreateJob />}
        />

        <Route
          path="/workspaces/:workspaceId/jobs/:id"
          element={<JobDetails />}
        />

        <Route 
          path="/workspaces/:workspaceId/time" 
          element={<ClockInOut />}   
        />
      </Route>
    </Routes>
  );
}

export default App;