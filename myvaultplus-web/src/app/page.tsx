import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhyJoin from '@/components/WhyJoin'
import Marquee from '@/components/Marquee'
import About from '@/components/About'
import Services from '@/components/Services'
import HowItWorks from '@/components/HowItWorks'
import Plans from '@/components/Plans'
import Security from '@/components/Security'
import Testimonials from '@/components/Testimonials'
import HomepageBlog from '@/components/HomepageBlog'
import FounderStory from '@/components/FounderStory'
import FinalCTA from '@/components/FinalCTA'
import CorporateCTA from '@/components/CorporateCTA'
import Footer from '@/components/Footer'
import { fetchBlogPosts, fetchTestimonials } from '@/lib/cms'

export default async function HomePage() {
  const [testimonials, { data: posts }] = await Promise.all([
    fetchTestimonials(),
    fetchBlogPosts({ limit: 3 }),
  ])

  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#fff' }}>
      <Navbar />
      <main>
        <Hero />
        <WhyJoin />
        <Marquee />
        <About />
        <Services />
        <HowItWorks />
        <Plans />
        <Security />
        <Testimonials testimonials={testimonials} />
        <HomepageBlog posts={posts} />
        <FounderStory />
        <CorporateCTA />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
