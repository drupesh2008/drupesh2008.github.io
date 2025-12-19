import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const rootDirectory = path.join(process.cwd(), 'src/content')

export async function getBlogPosts() {
  const postsDirectory = path.join(rootDirectory, 'blog')
  
  if (!fs.existsSync(postsDirectory)) {
    return []
  }

  const files = fs.readdirSync(postsDirectory)
  const posts = []

  for (const file of files) {
    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      const filePath = path.join(postsDirectory, file)
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const { data, content } = matter(fileContent)
      
      posts.push({
        slug: file.replace(/\.mdx?$/, ''),
        frontmatter: data,
        content,
      })
    }
  }

  return posts.sort((a, b) => {
    const dateA = new Date(a.frontmatter.date || 0)
    const dateB = new Date(b.frontmatter.date || 0)
    return dateB.getTime() - dateA.getTime()
  })
}

export async function getBlogPost(slug: string) {
  const postsDirectory = path.join(rootDirectory, 'blog')
  const filePath = path.join(postsDirectory, `${slug}.md`)
  
  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContent = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContent)
  
  return {
    slug,
    frontmatter: data,
    content,
  }
} 