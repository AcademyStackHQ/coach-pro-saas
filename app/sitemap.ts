import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://coachpro.in", changeFrequency: "weekly", priority: 1 },
    { url: "https://coachpro.in/features", changeFrequency: "monthly", priority: 0.8 },
    { url: "https://coachpro.in/pricing", changeFrequency: "weekly", priority: 0.9 },
    { url: "https://coachpro.in/how-it-works", changeFrequency: "monthly", priority: 0.7 },
    { url: "https://coachpro.in/stories", changeFrequency: "monthly", priority: 0.6 },
  ]
}
