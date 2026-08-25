'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  GraduationCap,
  Plus,
  Send,
  Settings,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { hasRequiredProfileFields } from '@/lib/profile'
import {
  getPushPermissionStatus,
  requestPushPermissionAndSubscribe,
  sendLocalBrowserNotification,
  type PushPermissionStatus,
} from '@/lib/push-notifications'

function saveNotice(setToast: (value: string) => void, message: string) {
  setToast(message)
  window.setTimeout(() => setToast(''), 2500)
}

export function SettingsWorkspace({
  profile,
  setProfile,
  subjects,
  addSubject,
  deleteSubject,
  skillsHook,
  notifications,
  setNotifications,
  language,
  setLanguage,
  toast,
  setToast,
}: any) {
  const router = useRouter()
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus>('default')
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    setPushStatus(getPushPermissionStatus())
  }, [])

  const update = (key: string, value: string) =>
    setProfile((current: any) => ({ ...current, [key]: value }))

  const handlePushToggle = async () => {
    setPushBusy(true)
    try {
      const res = await requestPushPermissionAndSubscribe()
      setPushStatus(res.status)
      if (res.status === 'granted') {
        saveNotice(setToast, 'Browser push notifications enabled!')
        await sendLocalBrowserNotification('YATVERSE Notification Activated', {
          body: 'You are subscribed to academic deadlines and study reminders.',
        })
      } else if (res.status === 'denied') {
        saveNotice(setToast, 'Push notifications blocked in browser.')
      }
    } catch {
      saveNotice(setToast, 'Could not configure push notifications.')
    } finally {
      setPushBusy(false)
    }
  }

  const handleTestPush = async () => {
    if (pushStatus !== 'granted') {
      await handlePushToggle()
      return
    }
    const sent = await sendLocalBrowserNotification('YATVERSE Test Alert', {
      body: 'Browser push notifications are working smoothly!',
    })
    if (sent) {
      saveNotice(setToast, 'Test notification sent to browser.')
    } else {
      saveNotice(setToast, 'Could not trigger browser alert.')
    }
  }

  const addSkillPrompt = async () => {
    const name = window.prompt('Enter skill name (e.g. Next.js, Python, System Design):')
    if (!name?.trim()) return
    try {
      await skillsHook.createSkill({
        name: name.trim(),
        category: 'Technical',
        proficiency: 'Intermediate',
        progress: 40,
        target_level: 'Advanced',
      })
      saveNotice(setToast, `Skill "${name.trim()}" added.`)
    } catch {
      saveNotice(setToast, 'Could not add skill.')
    }
  }

  const removeSkill = async (id: string, name: string) => {
    try {
      await skillsHook.deleteSkill(id)
      saveNotice(setToast, `Skill "${name}" removed.`)
    } catch {
      saveNotice(setToast, 'Could not remove skill.')
    }
  }

  const save = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const fullName = profile.name.trim()
    const college = profile.college.trim()
    const semesterNumber = Number(profile.semester)
    const cgpaNumber = profile.cgpa === '' ? null : Number(profile.cgpa)

    if (!hasRequiredProfileFields({ full_name: fullName, college })) {
      saveNotice(setToast, 'Name and college or university are required.')
      return
    }

    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 8) {
      saveNotice(setToast, 'Please select a valid semester.')
      return
    }

    if (cgpaNumber !== null && (!Number.isFinite(cgpaNumber) || cgpaNumber < 0 || cgpaNumber > 10)) {
      saveNotice(setToast, 'Please enter a CGPA between 0 and 10.')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        college,
        branch: profile.branch.trim() || null,
        semester: semesterNumber,
        cgpa: cgpaNumber,
        career_goal: profile.role.trim() || null,
        preferred_language: language === 'English' ? 'english' : 'hinglish',
      })
      .eq('id', user.id)
      .select('full_name, college, branch, semester, cgpa, career_goal, preferred_language')
      .maybeSingle()

    if (error || !data) {
      console.error('Failed to save profile settings:', error)
      saveNotice(setToast, 'We could not save your profile. Please try again.')
      return
    }

    const preferred = data.preferred_language?.toLowerCase() === 'english' ? 'English' : 'Hinglish'
    setLanguage(preferred)
    setProfile((current: any) => ({
      ...current,
      name: data.full_name?.trim() || '',
      college: data.college?.trim() || '',
      branch: data.branch?.trim() || '',
      semester: data.semester != null ? String(data.semester) : '',
      cgpa: data.cgpa != null ? String(data.cgpa) : '',
      role: data.career_goal?.trim() || '',
      language: preferred,
    }))
    saveNotice(setToast, 'Profile settings saved.')
  }

  return (
    <div className="settings-page">
      <div className="settings-intro">
        <div>
          <span className="eyebrow accent">YATVERSE CONTROL CENTER</span>
          <h2>Make YATVERSE yours.</h2>
          <p className="muted">Your preferences power every recommendation, task, and career signal.</p>
        </div>
        <Button className="primary-btn" onClick={save}>
          <Check data-icon="inline-start" /> Save changes
        </Button>
      </div>

      <div className="settings-grid">
        <section className="surface settings-card">
          <div className="settings-heading">
            <UserRound />
            <div>
              <span className="eyebrow">PROFILE</span>
              <h3>Your identity</h3>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Name
              <input value={profile.name} onChange={(e) => update('name', e.target.value)} />
            </label>
            <label>
              College / University
              <input value={profile.college} onChange={(e) => update('college', e.target.value)} />
            </label>
            <label>
              Email
              <input value={profile.email || ''} readOnly className="opacity-70 cursor-not-allowed" />
            </label>
            <label>
              Profile avatar
              <div className="profile-upload">
                <div className="avatar">{(profile.name || 'Y').slice(0, 1).toUpperCase()}</div>
                <span>Connected account identity</span>
              </div>
            </label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <GraduationCap />
            <div>
              <span className="eyebrow">ACADEMICS</span>
              <h3>Your academic signal</h3>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Degree
              <select value={profile.degree} onChange={(e) => update('degree', e.target.value)}>
                <option>B.Tech</option>
                <option>BCA</option>
                <option>B.Sc.</option>
                <option>M.Tech</option>
              </select>
            </label>
            <label>
              Branch / Program
              <input value={profile.branch} onChange={(e) => update('branch', e.target.value)} />
            </label>
            <label>
              Current semester
              <select value={profile.semester} onChange={(e) => update('semester', e.target.value)}>
                <option value="">Select semester</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
              </select>
            </label>
            <label>
              Current CGPA
              <input value={profile.cgpa} onChange={(e) => update('cgpa', e.target.value)} placeholder="9.11" />
            </label>
            <label>
              Previous semester CGPA
              <input value={profile.previousCgpa} onChange={(e) => update('previousCgpa', e.target.value)} placeholder="8.90" />
            </label>
            <label>
              Target CGPA
              <input value={profile.targetCgpa} onChange={(e) => update('targetCgpa', e.target.value)} placeholder="9.50" />
            </label>
          </div>
          <p className="muted settings-help">
            Branch, semester, and current CGPA are saved directly to your Supabase profile record.
          </p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <BookOpen />
            <div>
              <span className="eyebrow">SUBJECTS</span>
              <h3>Current semester ({subjects.length})</h3>
            </div>
            <Button variant="outline" size="sm" onClick={addSubject}>
              <Plus data-icon="inline-start" /> Manage
            </Button>
          </div>
          <div className="settings-list">
            {subjects.map((subject: any) => (
              <div className="settings-row" key={subject.id}>
                <div>
                  <strong>{subject.name}</strong>
                  <small>{subject.code || 'No code'} · {subject.credits} credits</small>
                </div>
                <div className="row-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${subject.name}`}
                    onClick={() => deleteSubject(subject.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="muted settings-help">Edit, add, and track subject progress in the Subjects workspace.</p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <Target />
            <div>
              <span className="eyebrow">CAREER GOALS</span>
              <h3>Where you are headed</h3>
            </div>
          </div>
          <div className="settings-fields">
            <label className="field-wide">
              Desired role
              <input value={profile.role} onChange={(e) => update('role', e.target.value)} placeholder="e.g. AI/ML Engineer" />
            </label>
            <label>
              Target companies
              <input value={profile.companies} onChange={(e) => update('companies', e.target.value)} placeholder="e.g. Google, Microsoft" />
            </label>
            <label>
              Career interests
              <input value={profile.interests} onChange={(e) => update('interests', e.target.value)} placeholder="e.g. Deep Learning, Distributed Systems" />
            </label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <Zap />
            <div>
              <span className="eyebrow">SKILLS</span>
              <h3>Your tracked skills ({skillsHook?.skills?.length || 0})</h3>
            </div>
            <Button variant="outline" size="sm" onClick={addSkillPrompt}>
              <Plus data-icon="inline-start" /> Add
            </Button>
          </div>
          <div className="skill-pills">
            {skillsHook?.skills?.map((skill: any) => (
              <button className="skill-pill" key={skill.id} onClick={() => void removeSkill(skill.id, skill.name)}>
                {skill.name} <X />
              </button>
            ))}
            {(!skillsHook?.skills || skillsHook.skills.length === 0) && (
              <p className="muted text-xs">No skills tracked yet. Click Add to log your first skill.</p>
            )}
          </div>
          <p className="muted settings-help">Skills are persisted in Supabase with RLS. Click a skill to remove it.</p>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <CalendarDays />
            <div>
              <span className="eyebrow">SCHEDULE</span>
              <h3>Design your rhythm</h3>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              Preferred daily study hours
              <input value={profile.studyHours} onChange={(e) => update('studyHours', e.target.value)} />
            </label>
            <label>
              Available study days
              <select defaultValue="Weekdays">
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Every day</option>
              </select>
            </label>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <Sparkles />
            <div>
              <span className="eyebrow">LANGUAGE</span>
              <h3>AI Tutor language</h3>
            </div>
          </div>
          <div className="choice-row">
            <button
              className={language === 'English' ? 'choice-on' : ''}
              onClick={() => {
                setLanguage('English')
                update('language', 'English')
              }}
            >
              English
            </button>
            <button
              className={language === 'Hinglish' ? 'choice-on' : ''}
              onClick={() => {
                setLanguage('Hinglish')
                update('language', 'Hinglish')
              }}
            >
              Hinglish
            </button>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-heading">
            <Bell />
            <div>
              <span className="eyebrow">NOTIFICATIONS & PUSH</span>
              <h3>Stay in the loop</h3>
            </div>
          </div>
          <div className="toggle-list">
            {[
              ['study', 'Study reminders'],
              ['revision', 'Revision reminders'],
              ['assignments', 'Assignment / exam reminders'],
              ['career', 'Career reminders'],
            ].map(([key, label]) => (
              <label className="toggle-row" key={key}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={notifications[key as keyof typeof notifications]}
                  onChange={(e) =>
                    setNotifications((current: any) => ({ ...current, [key]: e.target.checked }))
                  }
                />
              </label>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs">
              <strong className="block text-white">Browser Push Alerts</strong>
              <span className="text-zinc-400">
                {pushStatus === 'granted'
                  ? 'Active on this browser.'
                  : pushStatus === 'denied'
                  ? 'Blocked by browser permissions.'
                  : 'Receive updates when away.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pushStatus === 'granted' && (
                <Button variant="outline" size="sm" onClick={handleTestPush} className="text-xs">
                  <Send className="w-3 h-3 mr-1" /> Test Alert
                </Button>
              )}
              {pushStatus !== 'granted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePushToggle}
                  disabled={pushBusy || pushStatus === 'denied'}
                  className="text-xs"
                >
                  {pushBusy ? 'Enabling…' : 'Enable Push'}
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="surface settings-card account-card">
          <div className="settings-heading">
            <Settings />
            <div>
              <span className="eyebrow">ACCOUNT</span>
              <h3>Account access</h3>
            </div>
          </div>
          <div className="account-actions">
            <Button
              variant="outline"
              onClick={() =>
                saveNotice(setToast, 'Password reset email can be requested on the login screen.')
              }
            >
              Change password
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                router.push('/login')
                router.refresh()
              }}
            >
              Logout
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
