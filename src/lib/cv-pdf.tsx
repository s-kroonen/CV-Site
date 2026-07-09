import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { asStringArray, asSocialLinks } from "@/lib/json";
import { formatDateRange } from "@/lib/format";
import type {
  ProfileModel as Profile,
  ExperienceModel as Experience,
  EducationModel as Education,
  SkillModel as Skill,
} from "@/generated/prisma/models";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#211d1a" },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  tagline: { fontSize: 11, color: "#57504a", marginBottom: 8 },
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 16, fontSize: 9, color: "#57504a" },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    borderBottom: "1pt solid #21201a33",
    paddingBottom: 3,
  },
  entry: { marginBottom: 8 },
  entryTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontFamily: "Helvetica-Bold" },
  entryMeta: { color: "#57504a" },
  bullet: { marginLeft: 10 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  skillChip: { border: "1pt solid #21201a33", borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6 },
});

export function CvDocument({
  profile,
  experience,
  education,
  skills,
}: {
  profile: Profile;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
}) {
  const links = asSocialLinks(profile.socialLinks);

  return (
    <Document title={`${profile.name} - CV`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.tagline}>{profile.tagline}</Text>
        <View style={styles.contactRow}>
          <Text>{profile.publicEmail}</Text>
          <Text>{profile.location}</Text>
          {links.map((link) => (
            <Text key={link.url}>{link.url}</Text>
          ))}
        </View>

        <Text style={{ marginBottom: 12 }}>{profile.bio}</Text>

        {experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experience.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.entryTitleRow}>
                  <Text style={styles.entryTitle}>
                    {item.title} · {item.company}
                  </Text>
                  <Text style={styles.entryMeta}>{formatDateRange(item.startDate, item.endDate)}</Text>
                </View>
                <Text>{item.description}</Text>
                {asStringArray(item.bullets).map((bullet, i) => (
                  <Text key={i} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((item) => (
              <View key={item.id} style={styles.entry} wrap={false}>
                <View style={styles.entryTitleRow}>
                  <Text style={styles.entryTitle}>{item.degree}</Text>
                  <Text style={styles.entryMeta}>{formatDateRange(item.startDate, item.endDate)}</Text>
                </View>
                <Text>
                  {item.institution}
                  {item.field ? ` · ${item.field}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsRow}>
              {skills.map((skill) => (
                <Text key={skill.id} style={styles.skillChip}>
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}
