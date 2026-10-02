import { notFound } from "next/navigation";

// Any unknown path inside a language: raise a 404 so the localized not-found page (with the site
// header) is shown instead of Next's bare default.
export default function UnknownPage() {
  notFound();
}
