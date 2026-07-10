import Jobs from "./Jobs";

function JobProgress() {
    return (
        <Jobs
            defaultView="list"
            pageTitle="All Jobs Progress"
            pageDescription="View every job in a clean list with assignee, client, due date, priority, resource, type, and your custom workflow status."
        />
    );
}

export default JobProgress;