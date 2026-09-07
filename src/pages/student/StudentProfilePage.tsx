import React, { useState, useEffect } from 'react';
import { StudentLayout } from '../../components/layout/StudentLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Input } from '../../components/common/Input.tsx';
import { Badge } from '../../components/common/Badge.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { CheckCircle2, AlertCircle, User, Mail, Briefcase, GraduationCap } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { profile, user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(
    profile?.full_name || user?.user_metadata?.full_name || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [education, setEducation] = useState(profile?.education || '');
  const [experienceLevel, setExperienceLevel] = useState(profile?.experience_level || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setEducation(profile.education || '');
      setExperienceLevel(profile.experience_level || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      education: education.trim() || null,
      experience_level: experienceLevel.trim() || null,
    });

    setIsSaving(false);

    if (res.success) setSuccessMsg('Profile saved.');
    else setErrorMsg(res.error || 'Your profile could not be saved. Please try again.');
  };

  return (
    <StudentLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Profile</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">
            Your details as they appear on certificates and to course instructors.
          </p>
        </div>

        {successMsg && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] font-medium text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
        >
          <section className="space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Identity
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                helperText="Printed on your certificates."
                required
              />
              <Input
                label="Email address"
                value={user?.email || ''}
                disabled
                icon={<Mail className="h-4 w-4" />}
                helperText="Managed by your sign-in method."
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-6">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Background
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Highest education"
                placeholder="e.g. B.Tech in Computer Science"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <Input
                label="Experience level"
                placeholder="e.g. 3 years, software engineering"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                icon={<Briefcase className="h-4 w-4" />}
              />
            </div>

            <Input
              label="Avatar image URL"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              helperText="Optional."
            />

            <div>
              <label
                htmlFor="profile-bio"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Short bio
              </label>
              <textarea
                id="profile-bio"
                rows={4}
                placeholder="A sentence or two about what you are working towards."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <span>Account role</span>
              <Badge variant="primary">{profile?.role || 'STUDENT'}</Badge>
            </div>
            <Button variant="primary" type="submit" loading={isSaving} disabled={isSaving}>
              {isSaving ? 'Saving' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </StudentLayout>
  );
};
