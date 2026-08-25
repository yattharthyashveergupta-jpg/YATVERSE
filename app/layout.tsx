import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })

export const metadata: Metadata = {
  title: 'YATVERSE — Your entire student journey, in one universe.',
  description: 'The intelligent student operating system connecting college, learning, skills, projects, career and placement preparation.',
  generator: 'YATVERSE',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#09090b',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${geistMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
