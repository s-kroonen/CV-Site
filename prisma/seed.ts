import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.profile.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: "Storm Kroonen",
      tagline: "Software engineer",
      bio: "Replace this with a real bio via the admin panel — supports markdown.",
      publicEmail: "hello@example.com",
      location: "The Netherlands",
      socialLinks: [
        { label: "GitHub", url: "https://github.com/" },
        { label: "LinkedIn", url: "https://linkedin.com/in/" },
      ],
    },
    update: {},
  });

  await prisma.privateContact.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      email: "private@example.com",
      phone: "+31 6 00000000",
    },
    update: {},
  });

  await prisma.experience.create({
    data: {
      company: "Example Company",
      title: "Software Engineer",
      location: "Remote",
      startDate: new Date("2022-01-01"),
      endDate: null,
      description: "Replace with real experience via the admin panel.",
      bullets: ["Shipped feature X", "Improved metric Y by Z%"],
      tags: ["TypeScript", "React"],
      sortIndex: 0,
    },
  });

  await prisma.education.create({
    data: {
      institution: "Example University",
      degree: "BSc Computer Science",
      field: "Computer Science",
      startDate: new Date("2018-09-01"),
      endDate: new Date("2022-06-01"),
      description: null,
      sortIndex: 0,
    },
  });

  await prisma.project.create({
    data: {
      title: "Example Project",
      slug: "example-project",
      summary: "One-line summary of the project.",
      description: "Longer markdown description of the project.",
      techStack: ["Next.js", "TypeScript", "Prisma"],
      repoUrl: "https://github.com/",
      liveUrl: null,
      images: [],
      featured: true,
      status: "active",
      sortIndex: 0,
    },
  });

  const skills: Array<[string, string, number]> = [
    ["TypeScript", "Languages", 90],
    ["React", "Frameworks", 85],
    ["Docker", "Tools", 75],
  ];
  for (const [name, category, proficiency] of skills) {
    await prisma.skill.create({
      data: { name, category, proficiency, sortIndex: 0 },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
