import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, UserRound } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

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
        setSuccessMessage("");

        const { error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.fullName,
                },
            },
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
                            <h1 className="text-4xl font-black">
                                Create your account
                            </h1>
                            <p className="mt-3 text-slate-400">
                                Sign up to create or join a JobFlow workspace.
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

                            {successMessage && (
                                <div className="mb-5 rounded-2xl border border-green-400/30 bg-green-500/10 p-4 text-sm font-semibold text-green-200">
                                    {successMessage}
                                </div>
                            )}

                            <div className="space-y-5">
                                <InputWithIcon
                                    icon={UserRound}
                                    label="Full Name"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Your full name"
                                    required
                                />

                                <InputWithIcon
                                    icon={Mail}
                                    type="email"
                                    label="Email Address"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@company.com"
                                    required
                                />

                                <InputWithIcon
                                    icon={Lock}
                                    type="password"
                                    label="Password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-6 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Creating account..." : "Create Account"}
                            </button>

                            <p className="mt-6 text-center text-sm text-slate-400">
                                Already have an account?{" "}
                                <Link
                                    to="/login"
                                    className="font-bold text-white hover:underline"
                                >
                                    Log in
                                </Link>
                            </p>
                        </form>
                    </div>
                </section>

                <section className="hidden bg-white p-10 text-slate-950 lg:flex lg:flex-col lg:justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                            JF
                        </div>

                        <div>
                            <p className="text-lg font-bold">JobFlow</p>
                            <p className="text-xs text-slate-500">
                                Workflow management
                            </p>
                        </div>
                    </Link>

                    <div>
                        <h1 className="max-w-xl text-5xl font-black leading-tight">
                            Create workspaces for any team, project, or business.
                        </h1>

                        <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                            Start with a blank workspace, invite your team, assign roles,
                            and manage work from request to completion.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <InfoCard
                            title="Create a workspace"
                            text="Set up a dedicated place for your team’s jobs, requests, and projects."
                        />

                        <InfoCard
                            title="Invite your team"
                            text="Send team members an invite and bring everyone into the same workflow."
                        />

                        <InfoCard
                            title="Assign roles later"
                            text="Workspace owners can choose admins, members, and viewers after people join."
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}

function InputWithIcon({
    icon: Icon,
    label,
    name,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
                {label}
            </label>

            <div className="relative">
                <Icon
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    className="w-full rounded-2xl border border-white/10 bg-white px-12 py-4 text-sm text-slate-950 outline-none transition focus:border-white"
                />
            </div>
        </div>
    );
}

function InfoCard({ title, text }) {
    return (
        <div className="rounded-3xl bg-slate-100 p-5">
            <p className="text-sm font-black text-slate-950">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </div>
    );
}

export default Register;