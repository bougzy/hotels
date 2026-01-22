import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import {
  Hotel,
  Calendar,
  CreditCard,
  BarChart3,
  Users,
  Globe,
  Smartphone,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Play,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Landing Page
 *
 * Professional glassmorphism design to convert visitors into customers.
 * Mobile-first, responsive, and optimized for conversions.
 */

const features = [
  {
    icon: Calendar,
    title: 'Smart Booking Management',
    description: 'Accept bookings 24/7 from your website, WhatsApp, and walk-ins. Never double-book again.',
  },
  {
    icon: CreditCard,
    title: 'Integrated Payments',
    description: 'Accept Paystack, bank transfers, cash, and card payments. Automatic reconciliation.',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'Real-time dashboards showing occupancy, ADR, RevPAR, and revenue by channel.',
  },
  {
    icon: Users,
    title: 'Guest Management',
    description: 'Build guest profiles, track preferences, and increase repeat bookings.',
  },
  {
    icon: Globe,
    title: 'Direct Booking Widget',
    description: 'Embed on your website. Save 15-20% on OTA commissions with direct bookings.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Design',
    description: 'Manage your hotel from anywhere. Works perfectly on phones and tablets.',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '₦15,000',
    period: '/month',
    description: 'Perfect for small hotels and guesthouses',
    features: [
      'Up to 20 rooms',
      'Unlimited bookings',
      'Basic analytics',
      'Email notifications',
      'Direct booking widget',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '₦35,000',
    period: '/month',
    description: 'For growing hotels that need more power',
    features: [
      'Up to 50 rooms',
      'Everything in Starter',
      'Advanced analytics',
      'Paystack integration',
      'SMS notifications',
      'Priority support',
      'Staff management',
      'Custom reports',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For hotel chains and large properties',
    features: [
      'Unlimited rooms',
      'Everything in Professional',
      'Multi-property support',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'On-site training',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

const testimonials = [
  {
    name: 'Adebayo Johnson',
    role: 'Owner, Royal Palms Hotel',
    location: 'Lagos',
    image: null,
    quote: 'HHOS transformed how we manage bookings. We reduced no-shows by 40% and increased direct bookings significantly.',
    rating: 5,
  },
  {
    name: 'Chioma Okafor',
    role: 'Manager, Sunrise Suites',
    location: 'Abuja',
    image: null,
    quote: 'The payment integration is seamless. Our guests love paying online, and we love the automatic reconciliation.',
    rating: 5,
  },
  {
    name: 'Emmanuel Nwachukwu',
    role: 'Director, Golden Gate Hotels',
    location: 'Port Harcourt',
    image: null,
    quote: 'Finally, a hotel management system built for Nigerian hotels. The support team understands our challenges.',
    rating: 5,
  },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                <Hotel className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">HHOS</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white/70 hover:text-white transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-white/70 hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-white/70 hover:text-white transition-colors">
                Testimonials
              </a>
              <Link to="/login" className="text-white/70 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register">
                <Button className="bg-white text-purple-900 hover:bg-white/90">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 inset-x-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 space-y-4">
            <a href="#features" className="block text-white/70 hover:text-white transition-colors py-2">
              Features
            </a>
            <a href="#pricing" className="block text-white/70 hover:text-white transition-colors py-2">
              Pricing
            </a>
            <a href="#testimonials" className="block text-white/70 hover:text-white transition-colors py-2">
              Testimonials
            </a>
            <Link to="/login" className="block text-white/70 hover:text-white transition-colors py-2">
              Sign In
            </Link>
            <Link to="/register" className="block">
              <Button className="w-full bg-white text-purple-900 hover:bg-white/90">
                Get Started Free
              </Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full border border-white/20 mb-8">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-white/80">Built for African Hotels</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Manage Your Hotel
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Smarter, Not Harder
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              The all-in-one hotel management system that helps you increase bookings,
              accept payments seamlessly, and grow your revenue. Start free today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/register">
                <Button size="lg" className="bg-white text-purple-900 hover:bg-white/90 px-8 py-6 text-lg rounded-xl">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-white/50 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <span>Setup in 5 Minutes</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-4 shadow-2xl">
              <div className="bg-slate-800 rounded-2xl overflow-hidden">
                {/* Mock Dashboard */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Hotel className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-white/20 rounded" />
                        <div className="h-3 w-20 bg-white/10 rounded mt-2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-24 bg-purple-500/50 rounded-lg" />
                      <div className="h-8 w-8 bg-white/10 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4">
                        <div className="h-3 w-16 bg-white/10 rounded mb-2" />
                        <div className="h-6 w-12 bg-white/20 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-white/5 rounded-xl p-4 h-40" />
                    <div className="bg-white/5 rounded-xl p-4 h-40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Run Your Hotel
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              From bookings to payments to analytics — manage every aspect of your hotel
              from one powerful platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 sm:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">500+</div>
                <div className="text-white/60">Hotels Trust Us</div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">50K+</div>
                <div className="text-white/60">Bookings Managed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">₦2B+</div>
                <div className="text-white/60">Revenue Processed</div>
              </div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">99.9%</div>
                <div className="text-white/60">Uptime Guarantee</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-3xl border transition-all duration-300 ${
                  plan.popular
                    ? 'bg-white/10 backdrop-blur-xl border-purple-500/50 scale-105'
                    : 'bg-white/5 backdrop-blur-lg border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-medium text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-white/60 text-sm">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/60">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/80">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register">
                  <Button
                    className={`w-full py-6 rounded-xl ${
                      plan.popular
                        ? 'bg-white text-purple-900 hover:bg-white/90'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Loved by Hotels Across Nigeria
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Don't just take our word for it — hear from hotel owners who've transformed
              their operations with HHOS.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>

                <p className="text-white/80 mb-6 italic">"{testimonial.quote}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-white">{testimonial.name}</div>
                    <div className="text-sm text-white/60">
                      {testimonial.role} • {testimonial.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center p-12 bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-3xl border border-white/10">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Hotel?
            </h2>
            <p className="text-lg text-white/70 mb-8 max-w-xl mx-auto">
              Join hundreds of hotels already using HHOS to increase bookings,
              streamline operations, and grow revenue.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-white text-purple-900 hover:bg-white/90 px-8 py-6 text-lg rounded-xl">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <span className="text-white/50">No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
                  <Hotel className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HHOS</span>
              </div>
              <p className="text-white/50 text-sm">
                The modern hotel management system built for African hospitality.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-white/50">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-white/50">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} HHOS. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-white/40">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
