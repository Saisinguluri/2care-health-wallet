import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { getErrorMessage } from '../utils/helpers';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'owner' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === 'owner' ? '/dashboard' : '/shared');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">2care</span>
        </div>
        <h2 className="mt-8 text-3xl font-bold text-white">
          Start managing your health today
        </h2>
        <p className="mt-4 max-w-md text-brand-100">
          Create your personal health wallet to store reports, track vitals, and share with trusted contacts.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="label">Full name</label>
              <input
                name="name"
                className="input"
                value={form.name}
                onChange={handleChange}
                placeholder="Alex Morgan"
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                name="email"
                type="email"
                className="input"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                name="password"
                type="password"
                className="input"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 6 characters"
                minLength={6}
                required
              />
            </div>

            <div>
              <label className="label">Account type</label>
              <select name="role" className="input" value={form.role} onChange={handleChange}>
                <option value="owner">Owner — manage my health records</option>
                <option value="viewer">Viewer — access shared reports only</option>
              </select>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
