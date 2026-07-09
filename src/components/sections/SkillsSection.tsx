"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SkillModel as Skill } from "@/generated/prisma/models";
import { FadeInView } from "@/components/motion/FadeInView";

export function SkillsSection({ items }: { items: Skill[] }) {
  const reduceMotion = useReducedMotion();
  if (items.length === 0) return null;

  const byCategory = new Map<string, Skill[]>();
  for (const skill of items) {
    const list = byCategory.get(skill.category) ?? [];
    list.push(skill);
    byCategory.set(skill.category, list);
  }

  return (
    <FadeInView>
      <section id="skills" className="flex flex-col gap-8 py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-medium">Skills</h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {[...byCategory.entries()].map(([category, skills]) => (
            <div key={category} className="flex flex-col gap-3">
              <h3 className="font-mono text-xs tracking-wide text-ink-muted uppercase">{category}</h3>
              <ul className="flex flex-col gap-3">
                {skills.map((skill) => (
                  <li key={skill.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{skill.name}</span>
                      <span className="text-ink-muted">{skill.proficiency}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-line">
                      <motion.div
                        className="h-1.5 rounded-full bg-accent"
                        initial={reduceMotion ? undefined : { width: 0 }}
                        whileInView={reduceMotion ? undefined : { width: `${Math.min(100, Math.max(0, skill.proficiency))}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        style={reduceMotion ? { width: `${Math.min(100, Math.max(0, skill.proficiency))}%` } : undefined}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </FadeInView>
  );
}
