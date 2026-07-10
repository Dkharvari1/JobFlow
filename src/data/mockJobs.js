export const statusLabels = {
    new_job: "New Job",
    in_design: "In Design",
    ready_for_coding: "Ready for Coding",
    in_development: "In Development",
    review: "Review",
    revisions: "Revisions",
    completed: "Completed",
};

export const statusColumns = [
    "new_job",
    "in_design",
    "ready_for_coding",
    "in_development",
    "review",
    "revisions",
    "completed",
];

export const teamMembers = [
    "Carly",
    "Tabitha",
    "Theo",
    "Allison",
    "Mikey",
    "Dev",
];

export const creativeAssignees = ["Theo", "Allison", "Mikey"];

export const jobTypes = [
    "Email Blast",
    "Landing Page",
    "Website Edit",
    "HubSpot Campaign",
    "Mailchimp Campaign",
    "Video",
    "PDF / Flyer",
    "Social Graphic",
    "Other",
];

export const mockJobs = [
    {
        id: "1",
        jobNumber: "DD13021",
        title: "Zebra Email Campaign",
        client: "AbeTech",
        clientContact: "John Smith",
        clientContactEmail: "john@example.com",
        description:
            "Create a responsive HTML email from the provided PDF and image assets.",
        type: "Email Blast",
        status: "ready_for_coding",
        priority: "High",

        receivedBy: "Carly",
        jobNumberAssignedBy: "Tabitha",
        creativeAssignedBy: "Carly",
        creativeAssignee: "Allison",
        developer: "Dev",
        devReviewer: "Allison",
        finalSender: "Carly",

        dueDate: "2026-07-15",
        createdAt: "2026-07-08",
        assetNotes:
            "Designer emailed Dev the PDF, image folder, client notes, and CTA links.",
    },
    {
        id: "2",
        jobNumber: "DD12998",
        title: "PiiComm Landing Page",
        client: "Zebra",
        clientContact: "Nicole Adams",
        clientContactEmail: "nicole@example.com",
        description:
            "Build a landing page and connect the CTA buttons to the form section.",
        type: "Landing Page",
        status: "in_design",
        priority: "Medium",

        receivedBy: "Carly",
        jobNumberAssignedBy: "Tabitha",
        creativeAssignedBy: "Carly",
        creativeAssignee: "Theo",
        developer: "Dev",
        devReviewer: "Allison",
        finalSender: "Carly",

        dueDate: "2026-07-18",
        createdAt: "2026-07-07",
        assetNotes: "",
    },
    {
        id: "3",
        jobNumber: "DD12851",
        title: "RaceTrack HubSpot Email",
        client: "AbeTech",
        clientContact: "Mike Johnson",
        clientContactEmail: "mike@example.com",
        description:
            "Code a mobile-friendly HTML email that can be dropped into HubSpot.",
        type: "Email Blast",
        status: "review",
        priority: "High",

        receivedBy: "Carly",
        jobNumberAssignedBy: "Tabitha",
        creativeAssignedBy: "Carly",
        creativeAssignee: "Allison",
        developer: "Dev",
        devReviewer: "Allison",
        finalSender: "Carly",

        dueDate: "2026-07-10",
        createdAt: "2026-07-06",
        assetNotes:
            "Assets received. HTML file completed and sent to Allison for review.",
    },
    {
        id: "4",
        jobNumber: "DD13100",
        title: "Product Promo Video",
        client: "LG",
        clientContact: "Amanda Lee",
        clientContactEmail: "amanda@example.com",
        description:
            "Create a short product promo video and prepare the final assets for client review.",
        type: "Video",
        status: "in_design",
        priority: "Urgent",

        receivedBy: "Carly",
        jobNumberAssignedBy: "Tabitha",
        creativeAssignedBy: "Carly",
        creativeAssignee: "Mikey",
        developer: "Dev",
        devReviewer: "Allison",
        finalSender: "Carly",

        dueDate: "2026-07-12",
        createdAt: "2026-07-08",
        assetNotes: "",
    },
];