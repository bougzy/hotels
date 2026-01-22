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
  TrendingUp,
  Clock,
  HeadphonesIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Landing Page
 *
 * Professional dark blue glassmorphism design with mature animations.
 * Mobile-first, responsive, and optimized for conversions.
 */

const features = [
  {
    icon: Calendar,
    title: 'Smart Booking Management',
    description: 'Accept bookings 24/7 from your website, WhatsApp, and walk-ins. Never double-book again.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: CreditCard,
    title: 'Integrated Payments',
    description: 'Accept Paystack, bank transfers, cash, and card payments. Automatic reconciliation.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'Real-time dashboards showing occupancy, ADR, RevPAR, and revenue by channel.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: Users,
    title: 'Guest Management',
    description: 'Build guest profiles, track preferences, and increase repeat bookings.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Globe,
    title: 'Direct Booking Widget',
    description: 'Embed on your website. Save 15-20% on OTA commissions with direct bookings.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First Design',
    description: 'Manage your hotel from anywhere. Works perfectly on phones and tablets.',
    color: 'from-sky-500 to-blue-500',
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
    quote: 'HHOS transformed how we manage bookings. We reduced no-shows by 40% and increased direct bookings significantly.',
    rating: 5,
  },
  {
    name: 'Chioma Okafor',
    role: 'Manager, Sunrise Suites',
    location: 'Abuja',
    quote: 'The payment integration is seamless. Our guests love paying online, and we love the automatic reconciliation.',
    rating: 5,
  },
  {
    name: 'Emmanuel Nwachukwu',
    role: 'Director, Golden Gate Hotels',
    location: 'Port Harcourt',
    quote: 'Finally, a hotel management system built for Nigerian hotels. The support team understands our challenges.',
    rating: 5,
  },
];

const stats = [
  { value: '500+', label: 'Hotels Trust Us', icon: Hotel },
  { value: '50K+', label: 'Bookings Managed', icon: Calendar },
  { value: '₦2B+', label: 'Revenue Processed', icon: TrendingUp },
  { value: '99.9%', label: 'Uptime Guarantee', icon: Clock },
];

export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1c] overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
            top: '-400px',
            right: '-200px',
            transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.02}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
            bottom: '-200px',
            left: '-100px',
            transform: `translate(${-scrollY * 0.03}px, ${-scrollY * 0.02}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${scrollY * 0.02}px, ${-scrollY * 0.01}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${15 + Math.random() * 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group">
              <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <Hotel className="h-6 w-6 text-white" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                HHOS
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-medium">
                Features
              </a>
              <a href="#pricing" className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-medium">
                Testimonials
              </a>
              <Link to="/login" className="text-slate-400 hover:text-white transition-colors duration-300 text-sm font-medium">
                Sign In
              </Link>
              <Link to="/register">
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 inset-x-4 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-4 shadow-2xl animate-slide-down">
            <a href="#features" className="block text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              Features
            </a>
            <a href="#pricing" className="block text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </a>
            <a href="#testimonials" className="block text-slate-300 hover:text-white transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
              Testimonials
            </a>
            <Link to="/login" className="block text-slate-300 hover:text-white transition-colors py-2">
              Sign In
            </Link>
            <Link to="/register" className="block">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/20 mb-8 animate-fade-in-up">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-sm text-blue-300 font-medium">Built for African Hotels</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in-up animation-delay-100">
              <span className="text-white">Manage Your Hotel</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent animate-gradient">
                Smarter, Not Harder
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
              The all-in-one hotel management system that helps you increase bookings,
              accept payments seamlessly, and grow your revenue. Start free today.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animation-delay-300">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-6 text-lg rounded-xl shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-700 text-white hover:bg-white/5 px-8 py-6 text-lg rounded-xl backdrop-blur-sm transition-all duration-300 hover:border-slate-600"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm animate-fade-in-up animation-delay-400">
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <Shield className="h-5 w-5 text-blue-400" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2 hover:text-slate-400 transition-colors">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>Setup in 5 Minutes</span>
              </div>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-20 relative animate-fade-in-up animation-delay-500">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 rounded-3xl blur-2xl" />

            <div className="relative bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-2xl">
              <div className="bg-slate-900 rounded-xl overflow-hidden">
                {/* Browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-6 bg-slate-700/50 rounded-md max-w-md mx-auto" />
                  </div>
                </div>

                {/* Mock Dashboard */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Hotel className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-slate-800 rounded mt-2" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-28 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-lg" />
                      <div className="h-9 w-9 bg-slate-800 rounded-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30' },
                      { color: 'from-emerald-500/20 to-emerald-600/20', border: 'border-emerald-500/30' },
                      { color: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/30' },
                      { color: 'from-rose-500/20 to-rose-600/20', border: 'border-rose-500/30' },
                    ].map((item, i) => (
                      <div key={i} className={`bg-gradient-to-br ${item.color} rounded-xl p-4 border ${item.border}`}>
                        <div className="h-3 w-16 bg-white/10 rounded mb-3" />
                        <div className="h-7 w-14 bg-white/20 rounded font-bold" />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 bg-slate-800/50 rounded-xl p-4 h-44 border border-white/5">
                      <div className="h-3 w-24 bg-slate-700 rounded mb-4" />
                      <div className="flex items-end gap-2 h-28">
                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t opacity-80"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 h-44 border border-white/5">
                      <div className="h-3 w-20 bg-slate-700 rounded mb-4" />
                      <div className="space-y-3">
                        {[70, 55, 40, 25].map((w, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-2 bg-slate-700 rounded-full flex-1">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                style={{ width: `${w}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-8">{w}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <stat.icon className="h-8 w-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Everything You Need to
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Run Your Hotel
              </span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              From bookings to payments to analytics — manage every aspect of your hotel
              from one powerful platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`relative w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="relative text-xl font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="relative text-slate-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Bottom line accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Get Started in
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> 3 Simple Steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/50 to-blue-500/50" />

            {[
              { step: '01', title: 'Sign Up Free', description: 'Create your account in less than 2 minutes. No credit card required.', icon: Users },
              { step: '02', title: 'Setup Your Hotel', description: 'Add your rooms, rates, and customize your booking settings.', icon: Hotel },
              { step: '03', title: 'Start Earning', description: 'Accept bookings and payments instantly. Watch your revenue grow.', icon: TrendingUp },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="text-center">
                  {/* Step number */}
                  <div className="relative inline-flex mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
                      <item.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 border-2 border-blue-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">{item.step}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-slate-400 max-w-xs mx-auto">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">Pricing</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Simple, Transparent
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Pricing</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative group p-8 rounded-3xl border transition-all duration-500 hover:-translate-y-2 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-blue-500/10 to-cyan-500/10 border-blue-500/30 scale-105'
                    : 'bg-slate-800/30 border-white/5 hover:border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-sm font-semibold text-white shadow-lg shadow-blue-500/25">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register" className="block">
                  <Button
                    className={`w-full py-6 rounded-xl font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                        : 'bg-slate-700/50 text-white hover:bg-slate-700 border border-white/10'
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
            <span className="text-blue-400 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 mb-6">
              Loved by Hotels
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Across Nigeria</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group p-8 bg-slate-800/30 backdrop-blur-sm rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all duration-500 hover:-translate-y-2"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-300 mb-8 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg shadow-blue-500/25">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-slate-400">
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
          <div className="relative p-12 rounded-3xl overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

            <div className="relative text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Ready to Transform Your Hotel?
              </h2>
              <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto">
                Join hundreds of hotels already using HHOS to increase bookings,
                streamline operations, and grow revenue.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="text-blue-200 text-sm mt-6">No credit card required • 14-day free trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <Hotel className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HHOS</span>
              </div>
              <p className="text-slate-400 text-sm mb-6 max-w-sm">
                The modern hotel management system built for African hospitality. Streamline your operations and grow your revenue.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} HHOS. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <HeadphonesIcon className="h-4 w-4" />
              <span>24/7 Support: +234 800 000 0000</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
