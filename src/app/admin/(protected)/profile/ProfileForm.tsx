"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileModel, PrivateContactModel } from "@/generated/prisma/models";
import { asSocialLinks } from "@/lib/json";
import { ImageField, type ImageValue } from "@/components/admin/ImageField";
import { Field, FormError, SubmitButton, TextArea, readApiError } from "@/components/admin/fields";

export function ProfileForm({
  profile,
  privateContact,
}: {
  profile: ProfileModel | null;
  privateContact: PrivateContactModel | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<ImageValue[]>(profile?.avatarPath ? [{ src: profile.avatarPath, alt: "" }] : []);

  const socialLinksText = profile
    ? asSocialLinks(profile.socialLinks)
        .map((l) => `${l.label}|${l.url}`)
        .join("\n")
    : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const data = new FormData(event.currentTarget);

    const socialLinks = String(data.get("socialLinks") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split("|");
        return { label: label.trim(), url: rest.join("|").trim() };
      });

    const badLine = socialLinks.find((l) => !l.label || !l.url);
    if (badLine) {
      setSaving(false);
      setError('Each social link needs the format "Label|https://url".');
      return;
    }

    const profilePayload = {
      name: data.get("name"),
      tagline: data.get("tagline"),
      bio: data.get("bio"),
      publicEmail: data.get("publicEmail"),
      location: data.get("location"),
      avatarPath: avatar[0]?.thumb ?? avatar[0]?.src ?? null,
      socialLinks,
    };

    const contactPayload = {
      email: data.get("privateEmail"),
      phone: data.get("privatePhone"),
    };

    const [profileRes, contactRes] = await Promise.all([
      fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      }),
      fetch("/api/admin/private-contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactPayload),
      }),
    ]);

    setSaving(false);
    if (!profileRes.ok || !contactRes.ok) {
      setError(await readApiError(profileRes.ok ? contactRes : profileRes));
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Name" name="name" defaultValue={profile?.name} required />
      <ImageField label="Profile photo" value={avatar} onChange={setAvatar} withAlt={false} hint="Shown in the page header." />
      <Field label="Tagline" name="tagline" defaultValue={profile?.tagline} />
      <TextArea label="Bio" name="bio" defaultValue={profile?.bio} rows={6} />
      <Field
        label="Public email"
        name="publicEmail"
        type="email"
        defaultValue={profile?.publicEmail}
        hint="Always visible on the site. Leave blank to show only the contact form."
      />
      <Field label="Location" name="location" defaultValue={profile?.location} />
      <TextArea
        label="Social links"
        name="socialLinks"
        defaultValue={socialLinksText}
        rows={4}
        hint="One per line, format: Label|https://url"
      />

      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-3 text-sm text-ink-muted">
          Hidden from bots/scrapers - only shown to visitors who click &quot;reveal&quot; on the public page. Leave both
          blank to hide the reveal button entirely.
        </p>
        <div className="flex flex-col gap-4">
          <Field label="Private email" name="privateEmail" type="email" defaultValue={privateContact?.email} />
          <Field label="Phone" name="privatePhone" defaultValue={privateContact?.phone} />
        </div>
      </div>

      <FormError message={error} />
      {saved && <p className="text-sm text-ink-muted">Saved.</p>}
      <SubmitButton pending={saving} />
    </form>
  );
}
