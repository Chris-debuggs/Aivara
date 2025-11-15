"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loader2, User, Activity, Building2, FileText, Mail, Phone } from 'lucide-react';
import Link from 'next/link';

interface Hospital {
  id: number;
  name: string;
  city: string;
  state: string;
  // pincode may be provided by the API for display; make optional to avoid TS errors
  pincode?: string;
}

export default function DoctorRegisterPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    specialization: '',
    registrationNumber: '',
    phone: '',
    hospitalId: '',
    cityFilter: '',
    stateFilter: '',
  });

  useEffect(() => {
    fetchHospitals();
  }, [formData.cityFilter, formData.stateFilter]);

  const fetchHospitals = async () => {
    setFetchingHospitals(true);
    try {
      const data = await api.getHospitals(
        formData.cityFilter || undefined,
        formData.stateFilter || undefined
      );
      setHospitals(data);
    } catch (error: any) {
      toast.error('Failed to load hospitals', {
        description: error.response?.data?.detail || 'Please try again',
      });
    } finally {
      setFetchingHospitals(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!formData.hospitalId) {
      toast.error('Please select a hospital');
      return;
    }

    if (!formData.registrationNumber) {
      toast.error('Please enter your medical registration number');
      return;
    }

    setLoading(true);

    try {
      await api.doctorRegister(
        formData.email,
        formData.password,
        formData.fullName,
        formData.specialization || undefined,
        parseInt(formData.hospitalId),
        formData.phone || undefined,
        formData.registrationNumber || undefined
      );
      
      toast.success('Registration successful', {
        description: 'You can now log in to your doctor account',
      });
      router.push('/doctor/login');
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.response?.data?.detail || 'Please check your information and try again',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 p-4">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">Aivara Healthcare</span>
      </div>
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Doctor Registration</CardTitle>
          <CardDescription>
            Register to provide medical consultations and review patient reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  <User className="inline h-4 w-4 mr-1" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  type="text"
                  placeholder="e.g., Cardiology, General Medicine"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationNumber">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Medical Registration Number *
                </Label>
                <Input
                  id="registrationNumber"
                  type="text"
                  placeholder="MCI-12345"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline h-4 w-4 mr-1" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91-9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Hospital Selection */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">Hospital Selection *</Label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cityFilter">Filter by City (Optional)</Label>
                  <Input
                    id="cityFilter"
                    type="text"
                    placeholder="e.g., Mumbai, Delhi"
                    value={formData.cityFilter}
                    onChange={(e) => setFormData({ ...formData, cityFilter: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stateFilter">Filter by State (Optional)</Label>
                  <Input
                    id="stateFilter"
                    type="text"
                    placeholder="e.g., Maharashtra, Delhi"
                    value={formData.stateFilter}
                    onChange={(e) => setFormData({ ...formData, stateFilter: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hospital">Select Hospital *</Label>
                {fetchingHospitals ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <Select
                    value={formData.hospitalId}
                    onValueChange={(value) => setFormData({ ...formData, hospitalId: value })}
                    required
                  >
                    <SelectTrigger id="hospital" className="h-auto py-3">
                      <SelectValue placeholder="Choose your current hospital">
                        {formData.hospitalId && hospitals.find(h => h.id.toString() === formData.hospitalId) && (
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">
                              {hospitals.find(h => h.id.toString() === formData.hospitalId)?.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {hospitals.find(h => h.id.toString() === formData.hospitalId)?.city}, {hospitals.find(h => h.id.toString() === formData.hospitalId)?.state}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No hospitals found
                        </SelectItem>
                      ) : (
                        hospitals.map((hospital) => (
                          <SelectItem key={hospital.id} value={hospital.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-semibold text-base">{hospital.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {hospital.city}, {hospital.state} - {hospital.pincode}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Select the hospital where you currently work. You'll be visible to patients
                  selecting this hospital.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Register as Doctor
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/doctor/login" className="underline hover:text-primary font-medium">
              Sign in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

