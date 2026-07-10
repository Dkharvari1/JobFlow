import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        navigate("/workspaces");
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="grid min-h-screen lg:grid-cols-2">
                <section className="hidden bg-white p-10 text-slate-950 lg:flex lg:flex-col lg:justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                            JF
                        </div>

                        <div>
                            <p className="text-lg font-bold">JobFlow</p>
                            <p className="text-xs text-slate-500">Workflow management</p>
                        </div>
                    </Link>

                    <div>
                        <h1 className="max-w-xl text-5xl font-black leading-tight">
                            Log in and see exactly what needs your attention.
                        </h1>

                        <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                            Track work, update statuses, review notes, and keep your team’s
                            workflow organized.
                        </p>
                    </div>

                    <div className="rounded-3xl bg-slate-100 p-6">
                        <p className="text-sm font-bold text-slate-500">
                            Example workflow queue
                        </p>

                        <div className="mt-4 space-y-3">
                            <MiniJob title="Client onboarding task" status="Assigned" />
                            <MiniJob title="Campaign request" status="In Progress" />
                            <MiniJob title="Website update" status="Review" />
                        </div>
                    </div>
                </section>

                <section className="flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-md">
                        <Link
                            to="/"
                            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={17} />
                            Back to home
                        </Link>

                        <div className="mb-8">
                            <h1 className="text-4xl font-black">Welcome back</h1>
                            <p className="mt-3 text-slate-400">
                                Log in to your JobFlow workspace.
                            </p>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur"
                        >
                            {errorMessage && (
                                <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                                        Email Address
                                    </label>

                                    <div className="relative">
                                        <Mail
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@company.com"
                                            required
                                            className="w-full rounded-2xl border border-white/10 bg-white px-12 py-4 text-sm text-slate-950 outline-none transition focus:border-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                                        Password
                                    </label>

                                    <div className="relative">
                                        <Lock
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            required
                                            className="w-full rounded-2xl border border-white/10 bg-white px-12 py-4 text-sm text-slate-950 outline-none transition focus:border-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-6 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Logging in..." : "Log In"}
                            </button>

                            <p className="mt-6 text-center text-sm text-slate-400">
                                Don&apos;t have an account?{" "}
                                <Link
                                    to="/register"
                                    className="font-bold text-white hover:underline"
                                >
                                    Create one
                                </Link>
                            </p>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}

function MiniJob({ title, status }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-black text-slate-950">{title}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{status}</p>
        </div>
    );
}

export default Login;