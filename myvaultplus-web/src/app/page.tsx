import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Marquee from '@/components/Marquee'
import About from '@/components/About'
import Services from '@/components/Services'
import HowItWorks from '@/components/HowItWorks'
import Plans from '@/components/Plans'
import Security from '@/components/Security'
import Testimonials from '@/components/Testimonials'
import FinalCTA from '@/components/FinalCTA'
import Footer from '@/components/Footer'

export default function HomePage() {
  return (
    <div style={{ width: '100%', overflowX: 'hidden', background: '#fff' }}>
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <About />
        <Services />
        <HowItWorks />
        <Plans />
        <Security />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
