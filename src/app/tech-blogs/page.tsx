import type { Metadata } from 'next'
import TechBlogs from '@/components/TechBlogs'

export const metadata: Metadata = {
  title: 'Industry tech blogs — one reader for engineering writing',
  description:
    'Engineering blog posts from Netflix, Stripe, Cloudflare, Uber, Meta and dozens more, filterable by company and topic. Every link goes straight to the original publisher.',
}

export default function TechBlogsPage() {
  return <TechBlogs />
}
