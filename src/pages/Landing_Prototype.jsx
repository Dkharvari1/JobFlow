import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowUp,
    ArrowRight,
    CheckCircle2,
    ClipboardList,
    Code2,
    LayoutDashboard,
    MessageSquareText,
    Palette,
    Workflow,
} from "lucide-react";

function Landing() {
    const landingRef = useRef(null);
    const headerRef = useRef(null);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const headerHeight = headerRef.current?.offsetHeight ?? 0;
            setShowBackToTop(window.scrollY > headerHeight);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const elements = landingRef.current?.querySelectorAll("[data-reveal]");

        if (!elements?.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 },
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={landingRef} id="top" className="min-h-screen bg-slate-950 text-white">
            <header ref={headerRef} className="border-b border-white/10">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">
                            JF
                        </div>

                        <div>
                            <p className="text-lg font-bold">JobFlow</p>
                            <p className="text-xs text-slate-400">Internal job tracker</p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
                        <a href="#features" className="hover:text-white">
                            Features
                        </a>
                        <a href="#workflow" className="hover:text-white">
                            Workflow
                        </a>
                        <a href="#how-to-use" className="hover:text-white">
                            How to Use
                        </a>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                            Log in
                        </Link>

                        <Link
                            to="/register"
                            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden">
                    <div className="landing-orb landing-orb-blue absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
                    <div className="landing-orb landing-orb-purple absolute right-0 top-40 h-[350px] w-[350px] rounded-full bg-purple-500/20 blur-3xl" />

                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
                        <div className="hero-enter">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                                <Workflow size={16} />
                                Built for design, coding, review, and completion
                            </div>

                            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
                                A smarter way to track every job from email to completion.
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                                JobFlow gives your team one central place to manage client jobs,
                                assign designers and developers, track status, leave notes, and
                                see what needs to happen next.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/register"
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
                                >
                                    Start using JobFlow
                                    <ArrowRight size={18} />
                                </Link>

                                <Link
                                    to="/login"
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                                >
                                    Log in to workspace
                                </Link>
                            </div>

                            <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-400" />
                                    Easy job handoff
                                </div>

                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-400" />
                                    Team visibility
                                </div>

                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={17} className="text-green-400" />
                                    Review tracking
                                </div>
                            </div>
                        </div>

                        <div className="hero-enter hero-enter-delayed rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                            <div className="rounded-[1.5rem] bg-slate-100 p-5 text-slate-950">
                                <div className="mb-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500">
                                            Production Pipeline
                                        </p>
                                        <h2 className="text-2xl font-black">Active Jobs</h2>
                                    </div>

                                    <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                                        12 Active
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <PreviewColumn
                                        title="In Design"
                                        count="4"
                                        jobs={[
                                            "DD13104 · Product Email",
                                            "DD13101 · Landing Page",
                                        ]}
                                    />

                                    <PreviewColumn
                                        title="Ready for Coding"
                                        count="3"
                                        jobs={[
                                            "DD13098 · HubSpot Email",
                                            "DD13092 · WordPress Edit",
                                        ]}
                                    />

                                    <PreviewColumn
                                        title="In Review"
                                        count="5"
                                        jobs={[
                                            "DD13085 · Zebra Email",
                                            "DD13080 · Client Page",
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="features" className="bg-white py-20 text-slate-950">
                    <div data-reveal className="reveal mx-auto max-w-7xl px-6">
                        <div className="mb-12 max-w-2xl">
                            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                What JobFlow Does
                            </p>
                            <h2 className="mt-2 text-4xl font-black">
                                Everything your team needs to stop losing jobs in email threads.
                            </h2>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                            <FeatureCard
                                icon={ClipboardList}
                                title="Central job records"
                                text="Keep the job number, client, contact, description, due date, files, notes, and links in one place."
                            />

                            <FeatureCard
                                icon={Palette}
                                title="Design handoff"
                                text="Designers can see what is assigned to them and move jobs forward when designs are ready."
                            />

                            <FeatureCard
                                icon={Code2}
                                title="Coding queue"
                                text="Developers can instantly see which emails, landing pages, or website edits are ready to implement."
                            />

                            <FeatureCard
                                icon={MessageSquareText}
                                title="Review notes"
                                text="Reviewers can approve work, request revisions, and keep all feedback attached to the job."
                            />
                        </div>
                    </div>
                </section>

                <section id="workflow" className="bg-slate-100 py-20 text-slate-950">
                    <div data-reveal className="reveal mx-auto max-w-7xl px-6">
                        <div className="mb-12 text-center">
                            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                Workflow
                            </p>
                            <h2 className="mt-2 text-4xl font-black">
                                Built around your company’s actual process.
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
                                A job starts when your boss receives it, moves through design,
                                goes to coding, enters review, and is marked complete once
                                approved.
                            </p>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-7">
                            <WorkflowStep number="1" title="New Job" />
                            <WorkflowStep number="2" title="In Design" />
                            <WorkflowStep number="3" title="Ready for Coding" />
                            <WorkflowStep number="4" title="In Development" />
                            <WorkflowStep number="5" title="Review" />
                            <WorkflowStep number="6" title="Revisions" />
                            <WorkflowStep number="7" title="Completed" />
                        </div>
                    </div>
                </section>

                <section id="how-to-use" className="bg-white py-20 text-slate-950">
                    <div data-reveal className="reveal mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                                How to Use JobFlow
                            </p>
                            <h2 className="mt-2 text-4xl font-black">
                                Simple enough for everyone on the team.
                            </h2>
                            <p className="mt-4 text-lg leading-8 text-slate-600">
                                JobFlow is designed to be easy for your boss, designers,
                                developers, and reviewers. Everyone can quickly see what they
                                are responsible for and what stage each job is in.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <HowToUseCard
                                number="01"
                                title="Create a new job"
                                text="Add the job number, client, contact name, job type, description, priority, due date, and assigned team members."
                            />

                            <HowToUseCard
                                number="02"
                                title="Move it through the pipeline"
                                text="As work gets completed, update the job status from design to coding to review."
                            />

                            <HowToUseCard
                                number="03"
                                title="Leave notes and review feedback"
                                text="Keep revision requests, implementation links, design notes, and approval comments connected to the job."
                            />

                            <HowToUseCard
                                number="04"
                                title="Mark it completed"
                                text="Once the job is approved, mark it complete so the whole team knows it is finished."
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-slate-950 px-6 py-20 text-center text-white">
                    <div data-reveal className="reveal mx-auto max-w-3xl">
                        <LayoutDashboard className="mx-auto mb-5 text-slate-400" size={42} />

                        <h2 className="text-4xl font-black">
                            Ready to organize your company’s workflow?
                        </h2>

                        <p className="mt-4 text-lg leading-8 text-slate-300">
                            Start with a simple dashboard, then add logins, database storage,
                            file uploads, comments, email notifications, and automation later.
                        </p>

                        <Link
                            to="/register"
                            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-slate-200"
                        >
                            Create your workspace
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </section>
            </main>

            <button
                type="button"
                aria-label="Back to top"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className={`fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-xl ring-1 ring-slate-950/10 transition duration-300 hover:-translate-y-1 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    showBackToTop
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-4 opacity-0"
                }`}
            >
                <ArrowUp size={22} aria-hidden="true" />
            </button>
        </div>
    );
}

function PreviewColumn({ title, count, jobs }) {
    return (
        <div className="landing-card rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">{title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                    {count}
                </span>
            </div>

            <div className="space-y-3">
                {jobs.map((job) => (
                    <div
                        key={job}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700"
                    >
                        {job}
                    </div>
                ))}
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, text }) {
    return (
        <div className="landing-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon size={22} />
            </div>

            <h3 className="text-lg font-black">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
        </div>
    );
}

function WorkflowStep({ number, title }) {
    return (
        <div className="landing-card rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                {number}
            </div>

            <p className="text-sm font-black text-slate-800">{title}</p>
        </div>
    );
}

function HowToUseCard({ number, title, text }) {
    return (
        <div className="landing-card rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    {number}
                </span>

                <h3 className="text-lg font-black text-slate-950">{title}</h3>
            </div>

            <p className="text-sm leading-6 text-slate-600">{text}</p>
        </div>
    );
}

export default Landing;
