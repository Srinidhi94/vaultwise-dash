import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, TrendingUp, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, loading, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (activeTab === 'login') {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        setError(error.message || 'Failed to sign in');
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const { error } = await signUp(formData.email, formData.password);
      if (error) {
        setError(error.message || 'Failed to sign up');
      } else {
        setSuccess('Account created successfully!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center text-white mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">VaultWise</h1>
          <p className="text-white/80">Your Personal Finance Dashboard</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center text-white/90">
            <TrendingUp className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">Track Spending</p>
          </div>
          <div className="text-center text-white/90">
            <CreditCard className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">Manage Accounts</p>
          </div>
          <div className="text-center text-white/90">
            <Shield className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">Secure & Private</p>
          </div>
        </div>

        <Card className="financial-card border-white/20 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mt-4 border-success bg-success/10">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                {activeTab === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-white/70 text-sm">
          Your financial data is encrypted and secure
        </p>
      </div>
    </div>
  );
};

export default Auth;