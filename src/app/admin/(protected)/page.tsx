import Link from "next/link";

const sections = [
  { href: "/admin/profile", label: "Profile & contact info" },
  { href: "/admin/experience", label: "Experience" },
  { href: "/admin/education", label: "Education" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/skills", label: "Skills" },
  { href: "/admin/messages", label: "Contact messages" },
];

export default function AdminDashboard() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <ul className="flex flex-col gap-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block rounded-md border border-current/15 px-4 py-3 hover:border-current/40"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
