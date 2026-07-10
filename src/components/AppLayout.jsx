import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function AppLayout() {
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <Sidebar />

            <main className="min-h-screen p-6 pt-24">
                <Outlet />
            </main>
        </div>
    );
}

export default AppLayout;