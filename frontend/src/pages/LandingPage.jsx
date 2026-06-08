import { Link } from 'react-router-dom';
import { Heart, Shield, Upload, LineChart, Share2 } from 'lucide-react';
import Button from '../components/ui/Button';

const features = [
  {
    icon: Upload,
    title: 'Upload Reports',
    description: 'Store blood tests, X-rays, prescriptions and more in one secure place.',
  },
  {
    icon: LineChart,
    title: 'Track Vitals',
    description: 'Monitor blood pressure, sugar, heart rate and other vitals over time with charts.',
  },
  {
    icon: Share2,
    title: 'Share Securely',
    description: 'Grant read-only access to doctors, family members, and trusted contacts.',
  },
  {
    icon: Shield,
    title: 'Your Data, Protected',
    description: 'Role-based access control keeps your health records private and secure.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">2care</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            Digital Health Wallet
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Your health records,{' '}
            <span className="text-brand-600">anywhere, anytime</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Upload medical reports, track vitals over time, and share selected records with
            doctors and family — all in one secure health wallet.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register">
              <Button className="px-8 py-3 text-base">Create Free Account</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="px-8 py-3 text-base">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Everything you need to manage your health
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="card text-left">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} 2care Health Wallet. Built with React, Node.js & SQLite.
      </footer>
    </div>
  );
}
