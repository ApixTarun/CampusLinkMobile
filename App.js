import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Easing,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { BHUBANESWAR_COLLEGES } from './colleges';

const C = {
  navy: '#12233F', blue: '#3269E8', pale: '#EEF3FF', ink: '#1E293B', muted: '#718096',
  line: '#E8EDF4', green: '#138A66', bg: '#F5F7FB', white: '#FFFFFF', orange: '#D97706',
  red: '#C94B54', softRed: '#FFF0F0', softGreen: '#EAF7F1',
};
const DARK = {
  navy: '#E8EEFF', blue: '#83A4FF', pale: '#24314B', ink: '#E3E8F2', muted: '#A3AEC1',
  line: '#344056', green: '#63D5A8', bg: '#111722', white: '#1B2432', orange: '#FFBD70',
  red: '#FF8790', softRed: '#3A252C', softGreen: '#20372F',
};
let s;
const TABS = [['Home', '⌂'], ['Jobs', '⌕'], ['Pipeline', '⇄'], ['Drives', '▦'], ['Inbox', '✉'], ['Profile', '◉']];
const SKILL_TERMS = ['machine learning', 'data analysis', 'problem solving', 'communication', 'javascript', 'typescript', 'statistics', 'leadership', 'python', 'react', 'sql', 'excel', 'figma', 'java', 'c++', 'aws', 'git'];
const CAREER_STAGES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Documents', 'Accepted', 'Joined', 'Declined'];
const AUTH_TOKEN_KEY = 'campuslink.authToken';
const AUTH_USER_KEY = 'campuslink.authUser';
const AUTH_PROFILE_KEY = 'campuslink.authProfile';
const AUTO_LOGIN_KEY = 'campuslink.autoLogin';
const SAVED_EMAIL_KEY = 'campuslink.savedEmail';

async function safeStorageGet(key) {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}
async function safeStorageSet(key, value) {
  try { await SecureStore.setItemAsync(key, value); return true; } catch { return false; }
}
async function safeStorageDelete(key) {
  try { await SecureStore.deleteItemAsync(key); return true; } catch { return false; }
}

const metroHost = NativeModules.SourceCode?.scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (metroHost
  ? `http://${metroHost}:4000`
  : __DEV__ ? Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000' : '');

const START_STUDENTS = [
  { id: 's-aarav', name: 'Aarav Shah', degree: 'B.Tech', major: 'Computer Science', year: 'Final year · 2026', cgpa: '7.8', skills: ['React', 'SQL', 'Python', 'Communication', 'Product thinking'], projects: ['Campus event dashboard · React, SQL', 'Student survey analysis · Python'], certifications: ['SQL for Data Analysis'], internships: ['Product intern · 2 months'], readiness: 76, aptitude: '76/100' },
  { id: 's-mira', name: 'Mira Kapoor', degree: 'B.Tech', major: 'Information Systems', year: 'Final year · 2026', cgpa: '8.6', skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Communication'], projects: ['Demand forecasting model · Python', 'Retail insights dashboard · SQL'], certifications: ['AWS Cloud Practitioner', 'Applied Machine Learning'], internships: ['Data intern · 4 months'], readiness: 89, aptitude: '89/100' },
  { id: 's-rohan', name: 'Rohan Verma', degree: 'B.Com', major: 'Business Analytics', year: 'Final year · 2026', cgpa: '7.1', skills: ['Excel', 'SQL', 'Data Analysis', 'Communication', 'Problem Solving'], projects: ['Sales cohort analysis · Excel', 'Local business KPI report'], certifications: ['Advanced Excel'], internships: ['Operations intern · 1 month'], readiness: 68, aptitude: '68/100' },
];

const START_JOBS = [
  { id: 'j-northstar', company: 'Northstar Labs', title: 'Product Analyst Intern', location: 'Bengaluru · Hybrid', description: 'Work with SQL, data analysis, Excel and communication skills to build product insights. Bachelor degree in any discipline. 0 years experience.', qualification: "Bachelor's degree", experienceMonths: 0, requiredSkills: ['SQL', 'Data Analysis', 'Excel', 'Communication'], createdBy: 'CampusLink sample' },
  { id: 'j-bluepeak', company: 'BluePeak Systems', title: 'Frontend Developer', location: 'Remote · India', description: 'Build accessible interfaces using React, JavaScript and Git. B.Tech in Computer Science or Information Systems preferred. 0 years experience.', qualification: 'B.Tech Computer Science or Information Systems', experienceMonths: 0, requiredSkills: ['React', 'JavaScript', 'Git'], createdBy: 'CampusLink sample' },
];

function initials(name = '') { return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'CL'; }
function normalize(value = '') { return value.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim(); }
function extractSkills(text = '') {
  const source = text.toLowerCase();
  return SKILL_TERMS.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(source);
  });
}
function parseJD(description = '', manualSkills = '', qualification = '', experienceYears = '') {
  const parsedSkills = [...new Set([...extractSkills(description), ...manualSkills.split(',').map((x) => x.trim()).filter(Boolean)])];
  const years = Number(experienceYears) || Number((description.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i) || [])[1]) || 0;
  const qualificationText = qualification.trim() || (/computer science|information systems|b\.tech|bachelor/i.test(description) ? (description.match(/(?:b\.tech|bachelor(?:'s)? degree|computer science|information systems)/i) || ['Any degree'])[0] : 'Any degree');
  return { requiredSkills: parsedSkills, qualification: qualificationText, experienceMonths: Math.round(years * 12) };
}
function degreeFits(student, requirement) {
  const req = normalize(requirement);
  if (!req || req === 'any degree' || req.includes('any bachelor') || req.includes('any discipline')) return true;
  const profile = normalize(`${student.degree} ${student.major}`);
  const terms = req.split(' ').filter((word) => word.length > 2 && !['degree', 'bachelor', 'bachelors', 'preferred', 'or'].includes(word));
  if (!terms.length) return true;
  return terms.some((term) => profile.includes(term));
}
function evaluate(student, job) {
  const required = job.requiredSkills || [];
  const skillKey = (value) => normalize(value);
  const matched = required.filter((skill) => student.skills.some((item) => skillKey(item) === skillKey(skill) || skillKey(item).includes(skillKey(skill))));
  const missing = required.filter((skill) => !matched.includes(skill));
  const skillPoints = required.length ? Math.round((matched.length / required.length) * 65) : 65;
  const qualification = degreeFits(student, job.qualification) ? 20 : 0;
  const experienceMonths = (student.internships || []).reduce((sum, item) => sum + (Number((item.match(/(\d+)\s*months?/i) || [])[1]) || 0), 0);
  const experience = job.experienceMonths ? Math.min(10, Math.round((experienceMonths / job.experienceMonths) * 10)) : 10;
  const readiness = Math.round((student.readiness / 100) * 5);
  const score = Math.max(0, Math.min(100, skillPoints + qualification + experience + readiness));
  return { score, matched, missing, skillPoints, qualification, experience, experienceMonths, readiness, qualificationFit: qualification === 20 };
}
function overlap(a, b) {
  if (a.date !== b.date) return false;
  const startA = a.time.split(':').map(Number); const startB = b.time.split(':').map(Number);
  const minuteA = startA[0] * 60 + startA[1]; const minuteB = startB[0] * 60 + startB[1];
  return minuteA < minuteB + Number(b.duration || 60) && minuteB < minuteA + Number(a.duration || 60);
}
function validDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return false;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day && hour < 24 && minute < 60;
}

function studentFromAccount(account) {
  return {
    id: account.id, name: account.name, college: account.college, degree: 'Student',
    major: 'Add your course in your profile', year: 'Add your graduation year', cgpa: '—',
    skills: [], projects: [], certifications: [], internships: [], readiness: 50, aptitude: 'Not assessed',
  };
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState('Student');
  const [themeMode, setThemeMode] = useState('light');
  const [authMode, setAuthMode] = useState('register');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', college: '', registrationNo: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [autoLogin, setAutoLogin] = useState(true);
  const [collegeQuery, setCollegeQuery] = useState('');
  const [showCollegeList, setShowCollegeList] = useState(false);
  const palette = themeMode === 'dark' ? DARK : C;
  s = themeMode === 'dark' ? darkStyles : lightStyles;
  const [entryStep, setEntryStep] = useState('loading');
  const [tab, setTab] = useState('Home');
  const [students, setStudents] = useState(START_STUDENTS);
  const [studentId, setStudentId] = useState(START_STUDENTS[0].id);
  const [candidateDetailId, setCandidateDetailId] = useState(START_STUDENTS[0].id);
  const [jobs, setJobs] = useState(START_JOBS);
  const [applications, setApplications] = useState([]);
  const [drives, setDrives] = useState([
    { id: 'd-exam', title: 'End-semester examination', company: 'University', kind: 'Exam', date: '2026-10-12', time: '10:00', duration: 120, audience: 'All students' },
    { id: 'd-bluepeak', title: 'Engineering campus drive', company: 'BluePeak Systems', kind: 'Placement drive', date: '2026-10-12', time: '11:00', duration: 120, audience: 'Computer Science · Information Systems' },
  ]);
  const [inbox, setInbox] = useState([{ id: 'm-welcome', audience: 'all', title: 'Welcome to CampusLink', body: 'Your demo workspace is ready. Explore the tools available in your selected workspace.', time: 'Just now', unread: true }]);
  const [learningPlans, setLearningPlans] = useState({});
  const [supportPlans, setSupportPlans] = useState({});
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(START_JOBS[0].id);
  const [form, setForm] = useState({});
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [notice, setNotice] = useState('');
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introPulse = useRef(new Animated.Value(1)).current;
  const introFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const savedEmail = await safeStorageGet(SAVED_EMAIL_KEY);
        if (savedEmail && active) {
          setAuthForm((current) => ({ ...current, email: current.email || savedEmail }));
        }

        const autoLoginPref = await safeStorageGet(AUTO_LOGIN_KEY);
        if (autoLoginPref === 'false') {
          if (active) setEntryStep('welcome');
          return;
        }

        const token = await safeStorageGet(AUTH_TOKEN_KEY);
        if (!active) return;
        if (!token) {
          setEntryStep('welcome');
          return;
        }

        const cachedUserStr = await safeStorageGet(AUTH_USER_KEY);
        let cachedUser = null;
        try { if (cachedUserStr) cachedUser = JSON.parse(cachedUserStr); } catch {}

        const cachedProfileStr = await safeStorageGet(AUTH_PROFILE_KEY);
        let cachedProfile = null;
        try { if (cachedProfileStr) cachedProfile = JSON.parse(cachedProfileStr); } catch {}

        if (cachedUser) {
          const accountStudent = cachedProfile || studentFromAccount(cachedUser);
          setAuthUser(cachedUser);
          setAuthToken(token);
          setRole('Student');
          setStudents((current) => [...current.filter((person) => person.id !== cachedUser.id), accountStudent]);
          setStudentId(cachedUser.id);
          setEntryStep('app');
          introOpacity.setValue(1);

          if (API_BASE_URL) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 6000);
              const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              });
              clearTimeout(timer);
              if (response.status === 401) {
                await safeStorageDelete(AUTH_TOKEN_KEY);
                await safeStorageDelete(AUTH_USER_KEY);
                await safeStorageDelete(AUTH_PROFILE_KEY);
                if (active) {
                  setAuthUser(null);
                  setAuthToken('');
                  setAuthMode('login');
                  setAuthError('Your previous session has expired. Please log in again.');
                  setEntryStep('auth');
                }
                return;
              }
              if (response.ok) {
                const payload = await response.json();
                if (payload.user && active) {
                  setAuthUser(payload.user);
                  await safeStorageSet(AUTH_USER_KEY, JSON.stringify(payload.user));
                }
              }
            } catch {
              // Keep user logged in offline
            }
          }
          return;
        }

        if (!API_BASE_URL) throw new Error('CampusLink account service is not configured.');
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401) {
          await safeStorageDelete(AUTH_TOKEN_KEY);
          await safeStorageDelete(AUTH_USER_KEY);
          if (active) setEntryStep('welcome');
          return;
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not restore your session.');
        if (!active) return;
        const accountStudent = studentFromAccount(payload.user);
        setAuthUser(payload.user);
        setAuthToken(token);
        setRole('Student');
        await safeStorageSet(AUTH_USER_KEY, JSON.stringify(payload.user));
        setStudents((current) => [...current.filter((person) => person.id !== payload.user.id), accountStudent]);
        setStudentId(payload.user.id);
        setEntryStep('app');
        introOpacity.setValue(1);
      } catch (error) {
        if (!active) return;
        setAuthMode('login');
        setAuthError(error.message === 'Network request failed'
          ? 'Could not check your saved sign-in. Connect to the internet and log in again.'
          : error.message);
        setEntryStep('auth');
      }
    };
    restoreSession();
    return () => { active = false; };
  }, [introOpacity]);

  useEffect(() => {
    if (entryStep === 'app' || entryStep === 'loading') return undefined;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(introPulse, { toValue: 1.1, duration: 1450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(introPulse, { toValue: 1, duration: 1450, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    const float = Animated.loop(Animated.sequence([
      Animated.timing(introFloat, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(introFloat, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    Animated.timing(introOpacity, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    pulse.start(); float.start();
    return () => { pulse.stop(); float.stop(); introOpacity.stopAnimation(); };
  }, [entryStep, introFloat, introOpacity, introPulse]);

  const student = students.find((item) => item.id === studentId) || students[0];
  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];
  const notify = (message, audience = 'all', title = 'CampusLink update') => {
    setNotice(message);
    setInbox((current) => [{ id: `m-${Date.now()}`, audience, title, body: message, time: 'Just now', unread: true }, ...current]);
    setTimeout(() => setNotice(''), 2500);
  };
  const visibleInbox = inbox.filter((message) => message.audience === 'all' || message.audience === role || message.audience === student.id || (Array.isArray(message.audience) && (message.audience.includes(role) || message.audience.includes(student.id))));
  const studentApps = applications.filter((application) => application.studentId === student.id);
  const rankedCandidates = useMemo(() => {
    if (!selectedJob) return [];
    return students.map((person) => ({ student: person, fit: evaluate(person, selectedJob) })).sort((a, b) => b.fit.score - a.fit.score);
  }, [students, selectedJob]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setAuthValue = (key, value) => setAuthForm((current) => ({ ...current, [key]: value }));
  const submitStudentAuth = async () => {
    setAuthError('');
    if (!API_BASE_URL) {
      setAuthError('CampusLink account service is not configured in this app. Please install the latest build after the service is set up.');
      return;
    }
    if (authMode === 'register' && !authForm.college.trim()) {
      setAuthError('Select your college or type its full name.');
      return;
    }
    setAuthBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${authMode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authMode === 'register' ? authForm : { email: authForm.email, password: authForm.password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not sign in.');
      const account = payload.user;

      if (autoLogin) {
        await safeStorageSet(AUTH_TOKEN_KEY, payload.token);
        await safeStorageSet(AUTH_USER_KEY, JSON.stringify(account));
        await safeStorageSet(AUTO_LOGIN_KEY, 'true');
      } else {
        await safeStorageDelete(AUTH_TOKEN_KEY);
        await safeStorageDelete(AUTH_USER_KEY);
        await safeStorageDelete(AUTH_PROFILE_KEY);
        await safeStorageSet(AUTO_LOGIN_KEY, 'false');
      }
      if (account.email) {
        await safeStorageSet(SAVED_EMAIL_KEY, account.email);
      }

      setAuthUser(account);
      setAuthToken(payload.token);
      setRole('Student');
      const accountStudent = studentFromAccount(account);
      setStudents((current) => [...current.filter((person) => person.id !== account.id), accountStudent]);
      setStudentId(account.id);
      setTab('Home');
      notify(`Welcome back, ${account.name.split(' ')[0]}!`, account.id, 'Signed in');
      animateEntry('app');
    } catch (error) {
      setAuthError(error.message === 'Network request failed'
        ? __DEV__
          ? `Can't connect to CampusLink at ${API_BASE_URL}. Keep npm start running and connect your phone and computer to the same Wi-Fi.`
          : 'Can’t connect to CampusLink account service. Check your internet connection or try again later.'
        : error.message);
    } finally {
      setAuthBusy(false);
    }
  };
  const logoutStudent = async () => {
    try {
      await safeStorageDelete(AUTH_TOKEN_KEY);
      await safeStorageDelete(AUTH_USER_KEY);
      await safeStorageDelete(AUTH_PROFILE_KEY);
    } catch {
      setAuthError('Could not clear the saved sign-in from this device. Please try logging out again.');
      return;
    }
    if (authToken && API_BASE_URL) {
      try { await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }); } catch { /* Local logout still completes if offline. */ }
    }
    const savedEmail = await safeStorageGet(SAVED_EMAIL_KEY);
    setAuthToken('');
    setAuthUser(null);
    setAuthMode('login');
    setAuthError('');
    setAuthForm({ name: '', college: '', registrationNo: '', email: savedEmail || '', password: '' });
    setTab('Home');
    notify('You have signed out from this device.', 'all', 'Logged out');
    animateEntry('auth');
  };
  const openJobForm = () => { setForm({ company: '', title: '', location: '', description: '', skills: '', qualification: '', experienceYears: '' }); setJdAnalysis(null); setModal('job'); };
  const analyzeCurrentJD = () => setJdAnalysis(parseJD(form.description || '', form.skills || '', form.qualification || '', form.experienceYears || ''));
  const addJob = () => {
    if (!(form.title || '').trim() || !(form.company || '').trim() || !(form.description || '').trim()) { notify('Add a company, role title, and job description first.', role, 'Job posting needs details'); return; }
    const parsed = parseJD(form.description, form.skills || '', form.qualification || '', form.experienceYears || '');
    if (!parsed.requiredSkills.length) { notify('No skills were recognized. Add required skills in the skills field to run matching.', role, 'Add job skills'); return; }
    const job = { id: `j-${Date.now()}`, company: form.company.trim(), title: form.title.trim(), location: (form.location || '').trim() || 'Location to be confirmed', description: form.description.trim(), ...parsed, createdBy: role };
    setJobs((current) => [job, ...current]); setSelectedJobId(job.id); setModal(''); setTab('Jobs');
    notify(`${job.title} is live. ${job.requiredSkills.length} required skills were identified and matches are ready.`, 'all', 'New job and matches');
  };
  const openDriveForm = () => { setForm({ title: '', company: '', kind: 'Placement drive', date: '', time: '', duration: '60', audience: '' }); setModal('drive'); };
  const driveDraft = { date: form.date || '', time: form.time || '00:00', duration: Number(form.duration) || 60 };
  const driveConflicts = drives.filter((drive) => drive.date && form.date && overlap(drive, driveDraft));
  const addDrive = () => {
    if (!(form.title || '').trim() || !validDateTime(form.date, form.time)) { notify('Enter a title, a real date as YYYY-MM-DD, and a valid 24-hour time as HH:MM.', role, 'Check drive details'); return; }
    if (driveConflicts.length) { notify(`Schedule conflict with ${driveConflicts.map((item) => item.title).join(', ')}. Choose another time.`, role, 'Schedule conflict detected'); return; }
    const drive = { id: `d-${Date.now()}`, title: form.title.trim(), company: (form.company || 'Campus').trim(), kind: form.kind || 'Placement drive', date: form.date, time: form.time, duration: Number(form.duration) || 60, audience: (form.audience || 'Eligible students').trim() };
    setDrives((current) => [...current, drive]); setModal('');
    notify(`${drive.kind}: ${drive.title} scheduled for ${drive.date} at ${drive.time}.`, 'all', 'Drive scheduled');
  };

  const changeStage = (application, stage) => {
    setApplications((current) => current.map((item) => item.id === application.id ? { ...item, stage, updated: 'Just now', dropOff: stage === 'Declined' ? 'Offer declined or process withdrawn' : item.dropOff } : item));
    const targetStudent = students.find((item) => item.id === application.studentId);
    notify(`${application.jobTitle} application moved to ${stage}.`, [targetStudent?.id, 'Placement', 'Recruiter'].filter(Boolean), `Placement status: ${stage}`);
  };
  const addToPipeline = (person, job, stage = 'Shortlisted') => {
    const existing = applications.find((item) => item.studentId === person.id && item.jobId === job.id);
    if (existing) { changeStage(existing, stage); return; }
    const application = { id: `a-${Date.now()}-${person.id}`, studentId: person.id, jobId: job.id, candidateName: person.name, jobTitle: job.title, company: job.company, stage, updated: 'Just now' };
    setApplications((current) => [application, ...current]);
    notify(`${person.name} was added to the ${job.title} pipeline as ${stage}.`, [person.id, 'Placement', 'Recruiter'], `You are ${stage.toLowerCase()}`);
  };
  const applyToJob = (job) => {
    if (applications.some((item) => item.studentId === student.id && item.jobId === job.id)) { notify('You already have an application for this role.', student.id, 'Application status'); return; }
    const application = { id: `a-${Date.now()}-${student.id}`, studentId: student.id, jobId: job.id, candidateName: student.name, jobTitle: job.title, company: job.company, stage: 'Applied', updated: 'Just now' };
    setApplications((current) => [application, ...current]); setModal('');
    notify(`Your application for ${job.title} has been shared with the placement team.`, [student.id, 'Placement', 'Recruiter'], 'Application submitted');
  };
  const updateStudentField = (key, raw) => {
    const value = key === 'skills' || key === 'projects' || key === 'certifications' || key === 'internships'
      ? raw.split(',').map((item) => item.trim()).filter(Boolean)
      : key === 'readiness' ? Math.max(0, Math.min(100, Number(raw) || 0)) : raw;
    setStudents((current) => {
      const next = current.map((item) => item.id === student.id ? { ...item, [key]: value } : item);
      if (authUser && student.id === authUser.id) {
        const updated = next.find((item) => item.id === authUser.id);
        if (updated) safeStorageSet(AUTH_PROFILE_KEY, JSON.stringify(updated));
      }
      return next;
    });
  };

  const openJob = (job) => { setSelectedJobId(job.id); setModal('jobDetails'); };
  const skillTags = (items, missing = false) => items.map((skill) => <Text style={[s.skillTag, missing ? s.skillMissing : s.skillMatched]} key={`${skill}-${missing ? 'm' : 'h'}`}>{missing ? '＋ ' : '✓ '}{skill}</Text>);
  const jobCard = (job, compact = false) => {
    const fit = evaluate(student, job);
    const alreadyApplied = applications.some((item) => item.studentId === student.id && item.jobId === job.id);
    return <View key={job.id} style={s.card}>
      <TouchableOpacity onPress={() => openJob(job)}>
      <View style={s.row}><View style={s.logo}><Text style={s.logoText}>{initials(job.company).slice(0, 1)}</Text></View><View style={s.grow}><Text style={s.overline}>{job.company}</Text><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.location}</Text></View><View style={s.scorePill}><Text style={s.scoreText}>{fit.score}%</Text><Text style={s.scoreCaption}>fit</Text></View></View>
      {!compact && <><View style={s.tagWrap}>{job.requiredSkills.slice(0, 4).map((skill) => <Text style={s.tag} key={skill}>{skill}</Text>)}</View><Text style={s.microcopy}>Tap to see why it matches and which skills are missing.</Text></>}
      </TouchableOpacity>
      {role === 'Student' && <TouchableOpacity style={[s.button, alreadyApplied && s.buttonSoft]} onPress={() => alreadyApplied ? openJob(job) : applyToJob(job)}><Text style={[s.buttonText, alreadyApplied && s.buttonSoftText]}>{alreadyApplied ? 'View application' : 'Apply to role'}</Text></TouchableOpacity>}
    </View>;
  };
  const candidateCard = (person, job = selectedJob, mode = role) => {
    const fit = evaluate(person, job);
    const application = applications.find((item) => item.studentId === person.id && item.jobId === job.id);
    return <View key={`${person.id}-${job.id}`} style={s.candidateCard}>
      <TouchableOpacity style={s.row} onPress={() => { setCandidateDetailId(person.id); setModal('candidate'); }}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials(person.name)}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.muted}>{person.degree} · {person.major} · CGPA {person.cgpa}</Text><Text style={s.muted}>Readiness {person.readiness}/100</Text></View><View style={s.scorePill}><Text style={s.scoreText}>{fit.score}%</Text><Text style={s.scoreCaption}>fit</Text></View>
      </TouchableOpacity>
      <View style={s.tagWrap}>{fit.matched.slice(0, 3).map((skill) => <Text style={s.skillTag} key={skill}>✓ {skill}</Text>)}{fit.missing.slice(0, 2).map((skill) => <Text style={[s.skillTag, s.skillMissing]} key={skill}>＋ {skill}</Text>)}</View>
      <View style={s.rowBetween}><Text style={s.microcopy}>{application ? `Pipeline · ${application.stage}` : 'Profile preview · contact details hidden'}</Text>{mode === 'Recruiter' && <TouchableOpacity style={s.smallButton} onPress={() => addToPipeline(person, job)}><Text style={s.smallButtonText}>{application ? 'Update pipeline' : 'Shortlist'}</Text></TouchableOpacity>}</View>
    </View>;
  };

  const homeScreen = () => {
    if (role === 'Student') {
      const best = [...jobs].sort((a, b) => evaluate(student, b).score - evaluate(student, a).score)[0];
      return <>
        <Hero eyebrow="STUDENT SPACE" title={`Hi, ${student.name.split(' ')[0]}.`} subtitle="Explore roles, understand your fit, and close skill gaps at your pace." />
        <View style={s.metricRow}><Metric value={String(jobs.length)} label="Open roles" /><Metric value={String(studentApps.length)} label="Applications" /><Metric value={String(student.readiness)} label="Readiness" last /></View>
        <Section title="Your strongest match" action="Explore jobs" onPress={() => setTab('Jobs')} />{best && jobCard(best, true)}
        <Section title="Skill gap to work on" action="View profile" onPress={() => setTab('Profile')} />
        {best && <View style={s.card}><Text style={s.cardTitle}>{best.title}</Text><Text style={s.muted}>Matched skills</Text><View style={s.tagWrap}>{skillTags(evaluate(student, best).matched)}</View><Text style={s.muted}>Skills to build next</Text><View style={s.tagWrap}>{skillTags(evaluate(student, best).missing, true)}</View></View>}
        <Section title="Placement updates" action="Open inbox" onPress={() => setTab('Inbox')} />{visibleInbox.slice(0, 2).map((item) => <MessageCard key={item.id} item={item} />)}
      </>;
    }
    if (role === 'Recruiter') {
      return <><Hero eyebrow="RECRUITER WORKSPACE" title="Find people by fit." subtitle="Post a job description, inspect explainable matches, then decide who to meet." action="＋ Add a job description" onAction={openJobForm} />
        <View style={s.metricRow}><Metric value={String(jobs.length)} label="Open roles" /><Metric value={String(applications.filter((item) => item.stage !== 'Declined').length)} label="In pipeline" /><Metric value={String(drives.filter((item) => item.kind === 'Interview').length)} label="Interview events" last /></View>
        <Section title="Choose a role to match" action="Post JD" onPress={openJobForm} />{jobs.map((job) => <TouchableOpacity key={job.id} onPress={() => { setSelectedJobId(job.id); setTab('Jobs'); }} style={s.selectJob}><View style={s.grow}><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.company} · {job.requiredSkills.length} parsed skills</Text></View><Text style={s.link}>Matches ›</Text></TouchableOpacity>)}
        <Section title="Best fit candidates" action="See ranked list" onPress={() => setTab('Jobs')} />{rankedCandidates.slice(0, 2).map(({ student: person }) => candidateCard(person, selectedJob, 'Recruiter'))}
        <InfoBox title="Human review stays in control" body="CampusLink ranks and explains profile fit. Recruiters and placement officers make every shortlist and selection decision." />
      </>;
    }
    const atRisk = students.filter((person) => person.readiness < 72 || (selectedJob && evaluate(person, selectedJob).missing.length >= 2));
    const conflictCount = drives.reduce((count, event, index) => count + drives.slice(index + 1).filter((other) => overlap(event, other)).length, 0);
    return <><Hero eyebrow="PLACEMENT OFFICE · 2026–27" title="Placement command centre." subtitle="Coordinate drives, support students early, and track outcomes." action="＋ Schedule a drive" onAction={openDriveForm} />
      <View style={s.metricRow}><Metric value={String(students.length)} label="Profiles" /><Metric value={String(drives.filter((item) => item.kind === 'Placement drive').length)} label="Drives" /><Metric value={`${applications.filter((item) => ['Offer', 'Documents', 'Accepted', 'Joined'].includes(item.stage)).length}`} label="Offers+" last /></View>
      {conflictCount > 0 && <TouchableOpacity style={s.conflictBanner} onPress={() => setTab('Drives')}><Text style={s.conflictIcon}>!</Text><View style={s.grow}><Text style={s.cardTitle}>{conflictCount} schedule clash{conflictCount > 1 ? 'es' : ''} to resolve</Text><Text style={s.muted}>Review the drive calendar before confirming events.</Text></View><Text style={s.link}>Review ›</Text></TouchableOpacity>}
      <Section title="Students who may need support" action="View analytics" onPress={() => setTab('Profile')} />{atRisk.map((person) => <View style={s.riskRow} key={person.id}><View style={s.avatar}><Text style={s.avatarText}>{initials(person.name)}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.muted}>Readiness {person.readiness}/100 · {selectedJob ? `${evaluate(person, selectedJob).missing.length} gaps for ${selectedJob.title}` : 'Complete profile review'}</Text></View><TouchableOpacity style={s.smallButton} onPress={() => { setSupportPlans((current) => ({ ...current, [person.id]: true })); notify(`A training follow-up was assigned for ${person.name}.`, 'Placement', 'Student support follow-up'); }}><Text style={s.smallButtonText}>{supportPlans[person.id] ? 'Assigned ✓' : 'Support plan'}</Text></TouchableOpacity></View>)}
      <Section title="Placement funnel" action="Open pipeline" onPress={() => setTab('Pipeline')} />{funnelCard(applications)}
      <Section title="Recent campus updates" action="Inbox" onPress={() => setTab('Inbox')} />{visibleInbox.slice(0, 2).map((item) => <MessageCard key={item.id} item={item} />)}
    </>;
  };

  const jobsScreen = () => {
    const filtered = jobs.filter((job) => `${job.title} ${job.company} ${job.description}`.toLowerCase().includes(query.toLowerCase()));
    if (role === 'Student') return <><Hero eyebrow="OPPORTUNITY BOARD" title="Roles that fit you." subtitle="Open any role to see the matched skills, gaps, and score breakdown." />{searchBox(query, setQuery, 'Search roles, companies, skills')}{filtered.map((job) => jobCard(job))}{!filtered.length && <EmptyState text="No roles match this search." />}</>;
    if (role === 'Recruiter') return <><Hero eyebrow="YOUR JOB DESCRIPTIONS" title="JD to shortlist." subtitle="Skills are extracted from each JD, then compared with student profiles." action="＋ Post job description" onAction={openJobForm} />{jobs.map((job) => <TouchableOpacity style={s.card} key={job.id} onPress={() => { setSelectedJobId(job.id); setModal('jobDetails'); }}><View style={s.rowBetween}><View><Text style={s.overline}>{job.company}</Text><Text style={s.cardTitle}>{job.title}</Text></View><Text style={s.link}>View matches ›</Text></View><Text style={s.muted}>{job.requiredSkills.length} required skills · {job.qualification} · {job.experienceMonths} months experience</Text><View style={s.tagWrap}>{job.requiredSkills.map((skill) => <Text style={s.tag} key={skill}>{skill}</Text>)}</View></TouchableOpacity>)}<Section title={`Ranked candidates · ${selectedJob.title}`} />{rankedCandidates.map(({ student: person }) => candidateCard(person))}</>;
    return <><Hero eyebrow="CAMPUS OPERATIONS" title="Student and role matching." subtitle="Review talent against open jobs without hiding candidates who have gaps." />{jobs.map((job) => <TouchableOpacity key={job.id} style={s.selectJob} onPress={() => setSelectedJobId(job.id)}><View style={s.grow}><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.company}</Text></View><Text style={selectedJobId === job.id ? s.link : s.muted}>{selectedJobId === job.id ? 'Selected ✓' : 'Select'}</Text></TouchableOpacity>)}<Section title="Recommended profiles" />{rankedCandidates.map(({ student: person }) => candidateCard(person, selectedJob, 'Placement'))}</>;
  };

  const pipelineScreen = () => {
    const records = role === 'Student' ? studentApps : applications;
    return <><Hero eyebrow="PLACEMENT JOURNEY" title={role === 'Student' ? 'Your applications.' : role === 'Recruiter' ? 'Candidate pipeline.' : 'Placement outcomes.'} subtitle="Follow each application from first review to joining, including where a candidate exits." />
      {records.length === 0 ? <EmptyState text={role === 'Student' ? 'Apply to a role to see your application journey here.' : 'Applications and shortlists will appear here as the demo flow runs.'} /> : records.map((application) => <ApplicationCard key={application.id} application={application} role={role} onStage={changeStage} />)}
      {role !== 'Student' && <><Section title="Stage counts" />{funnelCard(records)}<InfoBox title="Track drop-off responsibly" body={`${records.filter((item) => item.stage === 'Declined').length} candidate(s) currently show a declined/withdrawn status. Record process outcomes so the placement office can improve support.`} /></>}
    </>;
  };

  const drivesScreen = () => {
    const conflicts = drives.flatMap((event, index) => drives.slice(index + 1).filter((other) => overlap(event, other)).map((other) => [event, other]));
    return <><Hero eyebrow="CAMPUS CALENDAR" title="Drives without clashes." subtitle="Schedule exams, interviews, and hiring drives in one calendar." action="＋ Add event" onAction={openDriveForm} />
      {conflicts.length > 0 && <View style={s.conflictBanner}><Text style={s.conflictIcon}>!</Text><View style={s.grow}><Text style={s.cardTitle}>Overlapping events detected</Text>{conflicts.map(([a, b]) => <Text style={s.muted} key={`${a.id}-${b.id}`}>{a.date}: {a.title} overlaps {b.title}</Text>)}</View></View>}
      {drives.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).map((event) => <View style={s.eventCard} key={event.id}><View style={s.dateBox}><Text style={s.dateDay}>{event.date.slice(8, 10)}</Text><Text style={s.dateMon}>{event.date.slice(5, 7)}</Text></View><View style={s.grow}><Text style={s.overline}>{event.kind.toUpperCase()} · {event.company}</Text><Text style={s.cardTitle}>{event.title}</Text><Text style={s.muted}>{event.date} · {event.time} · {event.duration} min</Text><Text style={s.microcopy}>For {event.audience}</Text></View></View>)}
      <InfoBox title="Clash protection" body="New events are checked against existing event times. The prototype prevents saving an overlapping event until you choose a different slot." />
    </>;
  };

  const inboxScreen = () => <><Hero eyebrow="CAMPUSLINK MESSAGES" title="One place for updates." subtitle="Drive changes, application progress, and follow-ups for your current role." />{visibleInbox.map((item) => <MessageCard item={item} key={item.id} onRead={() => setInbox((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry))} />)}{!visibleInbox.length && <EmptyState text="No messages yet." />}</>;

  const profileScreen = () => {
    if (role === 'Student') {
      const plan = learningPlans[student.id] || [];
      const missing = [...new Set(jobs.flatMap((job) => evaluate(student, job).missing))];
      return <><Hero eyebrow="YOUR PORTFOLIO" title={student.name} subtitle={`${student.degree} · ${student.major} · ${student.year}`} action="Edit profile" onAction={() => { setForm({ name: student.name, degree: student.degree, major: student.major, year: student.year, cgpa: student.cgpa, skills: student.skills.join(', '), projects: student.projects.join(', '), certifications: student.certifications.join(', '), internships: student.internships.join(', '), readiness: String(student.readiness) }); setModal('profile'); }} />
        <View style={s.metricRow}><Metric value={student.cgpa} label="CGPA" /><Metric value={student.aptitude} label="Aptitude" /><Metric value={`${student.readiness}%`} label="Readiness" last /></View>
        <ProfileList title="Skills" values={student.skills} /><ProfileList title="Projects" values={student.projects} /><ProfileList title="Certifications" values={student.certifications} /><ProfileList title="Internships" values={student.internships} />
        <Section title="Skill-gap learning plan" />{missing.length ? missing.map((skill) => <View style={s.learningRow} key={skill}><View style={s.grow}><Text style={s.cardTitle}>{skill}</Text><Text style={s.muted}>Requested by an open job · add to your learning plan</Text></View><TouchableOpacity style={s.smallButton} onPress={() => { setLearningPlans((current) => ({ ...current, [student.id]: [...new Set([...(current[student.id] || []), skill])] })); notify(`${skill} added to your learning plan.`, student.id, 'Learning plan updated'); }}><Text style={s.smallButtonText}>{plan.includes(skill) ? 'Added ✓' : 'Add'}</Text></TouchableOpacity></View>) : <InfoBox title="No skill gaps detected" body="Your current skills match the open roles in this demo." />}
        {!!plan.length && <Text style={s.microcopy}>Learning plan: {plan.join(' · ')}</Text>}
        {!!authUser && (
          <View style={s.card}>
            <View style={s.rowBetween}>
              <View style={s.grow}>
                <Text style={s.overline}>STUDENT ACCOUNT</Text>
                <Text style={s.cardTitle}>{authUser.name}</Text>
                <Text style={s.muted}>{authUser.college}</Text>
                <Text style={s.muted}>{authUser.email}</Text>
              </View>
              <View style={s.scorePill}><Text style={s.scoreText}>Active</Text><Text style={s.scoreCaption}>verified</Text></View>
            </View>
            <View style={s.autoLoginBadge}>
              <Text style={s.autoLoginBadgeIcon}>🛡</Text>
              <Text style={s.autoLoginBadgeText}>Auto login active on this device</Text>
            </View>
            <TouchableOpacity style={[s.buttonSoft, { marginTop: 12 }]} onPress={logoutStudent}>
              <Text style={s.buttonSoftText}>Log out</Text>
            </TouchableOpacity>
          </View>
        )}
        <InfoBox title="Profile privacy" body="Recruiter views show only the academic and career details needed to explain job fit. Your account password is verified by the CampusLink auth server and is never included in your student profile." />
      </>;
    }
    if (role === 'Recruiter') return <><Hero eyebrow="MATCHING EXPLAINED" title="Fairness and privacy." subtitle="Score components are visible and consistent across candidates." /><InfoBox title="Scoring policy" body="Fit score uses skills (65%), qualification (20%), experience (10%), and readiness (5%). Name and contact information are not scoring inputs. Every candidate remains reviewable; score alone never rejects a person." /><Section title="Your active jobs" />{jobs.map((job) => <TouchableOpacity key={job.id} style={s.selectJob} onPress={() => { setSelectedJobId(job.id); setTab('Jobs'); }}><View style={s.grow}><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.company} · {job.requiredSkills.length} required skills</Text></View><Text style={s.link}>Matches ›</Text></TouchableOpacity>)}</>;
    const placed = applications.filter((item) => item.stage === 'Joined').length;
    const dropped = applications.filter((item) => item.stage === 'Declined').length;
    const supportNeeded = students.filter((person) => person.readiness < 72 || (selectedJob && evaluate(person, selectedJob).missing.length >= 2));
    return <><Hero eyebrow="PLACEMENT ANALYTICS" title="Support before drop-off." subtitle="Use readiness, skill gaps, and pipeline stage to plan timely interventions." />
      <View style={s.metricRow}><Metric value={String(students.length)} label="Students" /><Metric value={String(placed)} label="Joined" /><Metric value={String(dropped)} label="Drop-off" last /></View>
      <Section title="Early support signals" />{supportNeeded.map((person) => <View style={s.riskRow} key={person.id}><View style={s.avatar}><Text style={s.avatarText}>{initials(person.name)}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.muted}>Readiness {person.readiness}% · support plan {supportPlans[person.id] ? 'assigned' : 'needed'}</Text></View><TouchableOpacity style={s.smallButton} onPress={() => { setSupportPlans((current) => ({ ...current, [person.id]: true })); notify(`Support plan assigned to ${person.name}.`, 'Placement', 'Student support'); }}><Text style={s.smallButtonText}>{supportPlans[person.id] ? 'Assigned ✓' : 'Assign'}</Text></TouchableOpacity></View>)}
      <Section title="Application funnel" />{funnelCard(applications)}<InfoBox title="Data note" body="Counts reflect only actions in this local demo session. Early support signals use the visible readiness score and current job skill gaps, not protected characteristics." />
    </>;
  };

  const openSelectedJobDetails = () => {
    const person = students.find((item) => item.id === studentId) || student;
    const fit = evaluate(person, selectedJob);
    const existing = applications.some((item) => item.studentId === person.id && item.jobId === selectedJob.id);
    return <Modal visible={modal === 'jobDetails'} transparent animationType="slide" onRequestClose={() => setModal('')}>
      <View style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.modalCard}><ScrollView keyboardShouldPersistTaps="handled"><View style={s.rowBetween}><Text style={s.modalTitle}>{selectedJob.title}</Text><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View><Text style={s.overline}>{selectedJob.company} · {selectedJob.location}</Text><Text style={s.body}>{selectedJob.description}</Text>
        {role === 'Student' ? <>
          <View style={s.bigScore}><Text style={s.bigScoreValue}>{fit.score}%</Text><Text style={s.bigScoreLabel}>explainable fit score</Text></View>
          <Text style={s.sectionTitle}>Skills that match ({fit.matched.length})</Text><View style={s.tagWrap}>{fit.matched.length ? skillTags(fit.matched) : <Text style={s.muted}>No listed skills match yet.</Text>}</View>
          <Text style={s.sectionTitle}>Skills to build ({fit.missing.length})</Text><View style={s.tagWrap}>{fit.missing.length ? skillTags(fit.missing, true) : <Text style={s.muted}>No required skills are missing.</Text>}</View>
          <Text style={s.sectionTitle}>Why this score?</Text><ScoreRow label="Required skill coverage" value={fit.skillPoints} max={65} /><ScoreRow label="Qualification alignment" value={fit.qualification} max={20} note={fit.qualificationFit ? 'Aligned' : 'Review needed · not auto-rejected'} /><ScoreRow label="Relevant experience" value={fit.experience} max={10} note={`${fit.experienceMonths} month(s) in profile`} /><ScoreRow label="Readiness contribution" value={fit.readiness} max={5} note={`${person.readiness}/100 readiness`} />
          <InfoBox title="Human decision" body="This score is a guide, not a hiring decision. A missing skill is shown as a learning opportunity, not an automatic rejection." />
          <PrimaryButton label={existing ? 'Application already submitted' : 'Apply to this role'} disabled={existing} onPress={() => applyToJob(selectedJob)} />
        </> : <>
          <Text style={s.sectionTitle}>Requirements detected</Text><View style={s.tagWrap}>{selectedJob.requiredSkills.map((skill) => <Text key={skill} style={s.tag}>{skill}</Text>)}</View><Text style={s.muted}>Qualification: {selectedJob.qualification} · Experience: {selectedJob.experienceMonths} months</Text>
          <Section title="Ranked student matches" />{rankedCandidates.map(({ student: person, fit: candidateFit }) => <View key={person.id} style={s.matchPanel}><View style={s.rowBetween}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.scoreText}>{candidateFit.score}%</Text></View><Text style={s.muted}>{person.degree} · {person.major} · CGPA {person.cgpa} · readiness {person.readiness}</Text><View style={s.tagWrap}>{skillTags(candidateFit.matched)}{skillTags(candidateFit.missing, true)}</View><Text style={s.microcopy}>Score: skills {candidateFit.skillPoints}/65 · qualification {candidateFit.qualification}/20 · experience {candidateFit.experience}/10 · readiness {candidateFit.readiness}/5</Text><TouchableOpacity style={s.smallButton} onPress={() => addToPipeline(person, selectedJob)}><Text style={s.smallButtonText}>Shortlist for human review</Text></TouchableOpacity></View>)}
          <InfoBox title="Fairness guardrail" body="All student profiles are shown, including lower scores. The fit score does not use a student’s name or contact details; recruiter makes the final decision." />
        </>}
      </ScrollView></View></View>
    </Modal>;
  };

  const formModal = () => <Modal visible={['job', 'drive', 'profile'].includes(modal)} transparent animationType="slide" onRequestClose={() => setModal('')}>
    <KeyboardAvoidingView style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={s.modalCard}>
      <View style={s.rowBetween}><Text style={s.modalTitle}>{modal === 'job' ? 'Post a job description' : modal === 'drive' ? 'Schedule campus event' : 'Edit student profile'}</Text><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View>
      <ScrollView keyboardShouldPersistTaps="handled">
        {modal === 'job' && <>
          <Field label="Company" value={form.company} onChange={(x) => setField('company', x)} placeholder="e.g. Northstar Labs" />
          <Field label="Role title" value={form.title} onChange={(x) => setField('title', x)} placeholder="e.g. Data Analyst Intern" />
          <Field label="Location" value={form.location} onChange={(x) => setField('location', x)} placeholder="City · Hybrid / Remote" />
          <Field label="Job description" value={form.description} onChange={(x) => { setField('description', x); setJdAnalysis(null); }} placeholder="Paste responsibilities, requirements, and skills..." multiline />
          <Field label="Additional required skills (optional)" value={form.skills} onChange={(x) => { setField('skills', x); setJdAnalysis(null); }} placeholder="Comma separated: SQL, Python" />
          <Field label="Qualification (optional)" value={form.qualification} onChange={(x) => { setField('qualification', x); setJdAnalysis(null); }} placeholder="e.g. B.Tech Computer Science" />
          <Field label="Minimum experience in years (optional)" value={form.experienceYears} onChange={(x) => { setField('experienceYears', x); setJdAnalysis(null); }} placeholder="0" keyboardType="numeric" />
          <TouchableOpacity style={s.buttonSoft} onPress={analyzeCurrentJD}><Text style={s.buttonSoftText}>✦  Analyze this JD</Text></TouchableOpacity>
          {jdAnalysis && <View style={s.analysisBox}><Text style={s.cardTitle}>Requirements detected</Text><View style={s.tagWrap}>{jdAnalysis.requiredSkills.map((skill) => <Text key={skill} style={s.tag}>{skill}</Text>)}</View><Text style={s.muted}>Qualification: {jdAnalysis.qualification}</Text><Text style={s.muted}>Experience: {jdAnalysis.experienceMonths} months</Text><Text style={s.microcopy}>On-device keyword extraction for this prototype. Review and correct the detected requirements before publishing.</Text></View>}
        </>}
        {modal === 'drive' && <>
          <Field label="Event title" value={form.title} onChange={(x) => setField('title', x)} placeholder="e.g. Northstar technical interviews" />
          <Field label="Company / organizer" value={form.company} onChange={(x) => setField('company', x)} placeholder="Company or University" />
          <Field label="Type" value={form.kind} onChange={(x) => setField('kind', x)} placeholder="Placement drive, Exam, Interview" />
          <Field label="Date · YYYY-MM-DD" value={form.date} onChange={(x) => setField('date', x)} placeholder="2026-10-15" />
          <Field label="Start time · 24h HH:MM" value={form.time} onChange={(x) => setField('time', x)} placeholder="10:30" />
          <Field label="Duration in minutes" value={form.duration} onChange={(x) => setField('duration', x)} placeholder="60" keyboardType="numeric" />
          <Field label="Eligible audience" value={form.audience} onChange={(x) => setField('audience', x)} placeholder="e.g. Computer Science · Final year" />
          {!!form.date && !!form.time && <View style={driveConflicts.length ? s.conflictInline : s.analysisBox}><Text style={s.cardTitle}>{driveConflicts.length ? '⚠ Schedule conflict' : '✓ No current conflict'}</Text>{driveConflicts.map((event) => <Text key={event.id} style={s.muted}>Overlaps {event.kind}: {event.title} · {event.time}</Text>)}</View>}
        </>}
        {modal === 'profile' && <>
          <Field label="Name" value={form.name} onChange={(x) => setField('name', x)} />
          <Field label="Degree" value={form.degree} onChange={(x) => setField('degree', x)} placeholder="B.Tech" />
          <Field label="Major / branch" value={form.major} onChange={(x) => setField('major', x)} />
          <Field label="Academic year" value={form.year} onChange={(x) => setField('year', x)} />
          <Field label="CGPA" value={form.cgpa} onChange={(x) => setField('cgpa', x)} keyboardType="decimal-pad" />
          <Field label="Skills · comma separated" value={form.skills} onChange={(x) => setField('skills', x)} multiline />
          <Field label="Projects · comma separated" value={form.projects} onChange={(x) => setField('projects', x)} multiline />
          <Field label="Certifications · comma separated" value={form.certifications} onChange={(x) => setField('certifications', x)} multiline />
          <Field label="Internships · comma separated" value={form.internships} onChange={(x) => setField('internships', x)} multiline />
          <Field label="Readiness score · 0 to 100" value={form.readiness} onChange={(x) => setField('readiness', x)} keyboardType="numeric" />
        </>}
      </ScrollView>
      <View style={s.modalActions}><TouchableOpacity style={s.cancelButton} onPress={() => setModal('')}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={s.button} onPress={() => modal === 'job' ? addJob() : modal === 'drive' ? addDrive() : (updateStudentField('name', form.name || ''), ['degree', 'major', 'year', 'cgpa', 'skills', 'projects', 'certifications', 'internships', 'readiness'].forEach((key) => updateStudentField(key, form[key] || '')), setModal(''), notify('Student profile updated. Match scores were recalculated.', student.id, 'Profile saved'))}><Text style={s.buttonText}>{modal === 'job' ? 'Publish and match' : modal === 'drive' ? 'Schedule event' : 'Save profile'}</Text></TouchableOpacity></View>
    </View></KeyboardAvoidingView>
  </Modal>;

  const candidateModal = () => {
    const candidate = students.find((item) => item.id === candidateDetailId) || student;
    return <Modal visible={modal === 'candidate'} transparent animationType="fade" onRequestClose={() => setModal('')}><View style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.modalCard}><ScrollView><View style={s.rowBetween}><Text style={s.modalTitle}>{candidate.name}</Text><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View><Text style={s.muted}>{candidate.degree} · {candidate.major} · {candidate.year}</Text><ProfileList title="Academic and readiness" values={[`CGPA ${candidate.cgpa}`, `Aptitude ${candidate.aptitude}`, `Readiness ${candidate.readiness}/100`]} /><ProfileList title="Skills" values={candidate.skills} /><ProfileList title="Projects" values={candidate.projects} /><ProfileList title="Certifications" values={candidate.certifications} /><ProfileList title="Internships" values={candidate.internships} /><InfoBox title="Privacy" body="Contact details are not collected or shown in this prototype. Use candidate information only for placement evaluation." /><TouchableOpacity style={s.button} onPress={() => setModal('')}><Text style={s.buttonText}>Close profile</Text></TouchableOpacity></ScrollView></View></View></Modal>;
  };

  let content;
  if (tab === 'Jobs') content = jobsScreen();
  else if (tab === 'Pipeline') content = pipelineScreen();
  else if (tab === 'Drives') content = drivesScreen();
  else if (tab === 'Inbox') content = inboxScreen();
  else if (tab === 'Profile') content = profileScreen();
  else content = homeScreen();

  const topInset = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight || 0) : insets.top;
  const animateEntry = (step) => {
    introOpacity.setValue(0);
    setEntryStep(step);
    Animated.timing(introOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  if (entryStep !== 'app') {
    if (entryStep === 'loading') {
      return <View style={[s.introRoot, { paddingTop: topInset, paddingBottom: insets.bottom }]}><View style={s.introBackdrop}><View style={s.backdropOrbA} /><View style={s.backdropOrbB} /></View><View style={s.sessionLoading}><ActivityIndicator color="#75E6DE" size="large" /><Text style={s.introFooter}>Checking your sign-in…</Text></View></View>;
    }
    const enterApp = (nextRole) => { setRole(nextRole); setTab('Home'); animateEntry('app'); };
    const entryContent = entryStep === 'welcome' ? (
      <>
        <Animated.View style={[s.introGlow, s.introGlowBlue, { transform: [{ scale: introPulse }] }]} />
        <Animated.View style={[s.introGlow, s.introGlowPink, { transform: [{ translateY: introFloat.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }) }] }]} />
        <Animated.View style={[s.introContent, { opacity: introOpacity }]}>
          <View style={s.introBrandRow}><View style={s.introBrandIcon}><Text style={s.introBrandLetter}>C</Text><View style={s.introBrandSpark} /></View><Text style={s.introBrandName}>CAMPUS<Text style={{ color: '#75E6DE' }}>LINK</Text></Text></View>
          <View style={s.orbitStage}>
            <Animated.View style={[s.orbitAura, { transform: [{ scale: introPulse }] }]} />
            <View style={s.orbitRingOuter} /><View style={s.orbitRingInner} />
            <Animated.View style={[s.orbitDot, s.orbitDotOne, { transform: [{ translateY: introFloat.interpolate({ inputRange: [0, 1], outputRange: [5, -5] }) }] }]} />
            <Animated.View style={[s.orbitDot, s.orbitDotTwo, { transform: [{ translateY: introFloat.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] }) }] }]} />
            <View style={s.orbitCore}><Text style={s.orbitCoreText}>C</Text><Text style={s.orbitCoreStar}>✦</Text></View>
            <View style={[s.orbitNode, s.nodeStudent]}><Text style={s.orbitNodeText}>S</Text></View><View style={[s.orbitNode, s.nodeCampus]}><Text style={s.orbitNodeText}>C</Text></View><View style={[s.orbitNode, s.nodeTalent]}><Text style={s.orbitNodeText}>↗</Text></View>
          </View>
          <Text style={s.introEyebrow}>FROM CAMPUS TO WHAT'S NEXT</Text>
          <Text style={s.introTitle}>Your next chapter{ '\n' }starts here.</Text>
          <Text style={s.introSubtitle}>One campus. Every opportunity.{ '\n' }A clearer path to your future.</Text>
          <View style={s.introDots}><View style={s.introDotActive} /><View style={s.introDot} /><View style={s.introDot} /></View>
          <TouchableOpacity style={s.introButton} onPress={() => animateEntry('role')}><Text style={s.introButtonText}>Get started</Text><Text style={s.introButtonArrow}>→</Text></TouchableOpacity>
          <Text style={s.introFooter}>A smarter way to make the connection.</Text>
        </Animated.View>
      </>
    ) : entryStep === 'role' ? (
      <Animated.View style={[s.roleIntroContent, { opacity: introOpacity }]}>
        <TouchableOpacity style={s.backButton} onPress={() => animateEntry('welcome')}><Text style={s.backButtonText}>‹  Back</Text></TouchableOpacity>
        <Text style={s.introEyebrow}>LET'S MAKE IT YOURS</Text>
        <Text style={s.roleIntroTitle}>Which path{ '\n' }are you on?</Text>
        <Text style={s.roleIntroSubtitle}>Choose your role to open a workspace built around you.</Text>
        {[
          ['Student', '🎓', 'Discover roles, see your fit, and grow your skills.', '#75E6DE'],
          ['Placement', '🧭', 'Coordinate campus drives and help students move forward.', '#FFC56E'],
          ['Recruiter', '✦', 'Post a role and find talent with explainable matches.', '#C4A5FF'],
        ].map(([name, icon, description, accent]) => <TouchableOpacity key={name} style={s.roleChoiceCard} onPress={() => { setRole(name); if (name === 'Student') { setAuthMode('register'); setAuthError(''); animateEntry('auth'); } else enterApp(name); }} accessibilityRole="button" accessibilityLabel={`${name === 'Placement' ? 'Placement Officer' : name} workspace`}><View style={[s.roleChoiceIcon, { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]}><Text style={s.roleChoiceEmoji}>{icon}</Text></View><View style={s.roleChoiceText}><Text style={s.roleChoiceName}>{name === 'Placement' ? 'Placement Officer' : name}</Text><Text style={s.roleChoiceDescription}>{description}</Text></View><Text style={s.introButtonArrow}>→</Text></TouchableOpacity>)}
        <Text style={s.introFooter}>Your workspace is ready for your role.</Text>
      </Animated.View>
    ) : (
      <Animated.View style={[s.roleIntroContent, { opacity: introOpacity }]}>
        <TouchableOpacity style={s.backButton} onPress={() => animateEntry('role')}><Text style={s.backButtonText}>‹  Back to roles</Text></TouchableOpacity>
        <Text style={s.introEyebrow}>STUDENT SPACE · CAMPUSLINK</Text>
        <Text style={s.roleIntroTitle}>{authMode === 'register' ? 'Create your account.' : 'Welcome back.'}</Text>
        <Text style={s.roleIntroSubtitle}>Register once, then log in with your email and password.</Text>
        <View style={s.authModeRow}>
          {['register', 'login'].map((mode) => <TouchableOpacity key={mode} style={[s.authModeTab, authMode === mode && s.authModeSelected]} onPress={async () => { setAuthMode(mode); setAuthError(''); if (mode === 'login' && !authForm.email) { const saved = await safeStorageGet(SAVED_EMAIL_KEY); if (saved) setAuthForm((curr) => ({ ...curr, email: saved })); } }}><Text style={[s.authModeText, authMode === mode && s.authModeTextSelected]}>{mode === 'register' ? 'Register' : 'Log in'}</Text></TouchableOpacity>)}
        </View>
        {authMode === 'register' && <>
          <Text style={s.authLabel}>Student name</Text><TextInput style={s.authInput} value={authForm.name} onChangeText={(value) => setAuthValue('name', value)} placeholder="Your full name" placeholderTextColor="#AAB6D0" autoCapitalize="words" autoComplete="name" />
          <Text style={s.authLabel}>College / university · Khordha district</Text><TextInput style={s.authInput} value={authForm.college} onFocus={() => { setCollegeQuery(''); setShowCollegeList(true); }} onChangeText={(value) => { setAuthValue('college', value); setCollegeQuery(value); setShowCollegeList(true); }} placeholder="Tap to browse or search college" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
          {showCollegeList && <ScrollView style={s.collegeSuggestions} nestedScrollEnabled keyboardShouldPersistTaps="handled">{BHUBANESWAR_COLLEGES.filter((college) => !collegeQuery || college.toLowerCase().includes(collegeQuery.toLowerCase())).map((college) => <TouchableOpacity key={college} style={s.collegeSuggestion} onPress={() => { setAuthValue('college', college === 'Other / college not listed' ? '' : college); setCollegeQuery(''); setShowCollegeList(false); }}><Text style={s.authSuggestionText}>{college}</Text></TouchableOpacity>)}</ScrollView>}
          <Text style={s.authLabel}>Student registration number</Text><TextInput style={s.authInput} value={authForm.registrationNo} onChangeText={(value) => setAuthValue('registrationNo', value)} placeholder="College registration number" placeholderTextColor="#AAB6D0" autoCapitalize="characters" />
        </>}
        <Text style={s.authLabel}>Email address</Text><TextInput style={s.authInput} value={authForm.email} onChangeText={(value) => setAuthValue('email', value)} placeholder="you@example.com" placeholderTextColor="#AAB6D0" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
        <Text style={s.authLabel}>Password</Text><View style={s.authPasswordRow}><TextInput style={[s.authInput, s.authPasswordInput]} value={authForm.password} onChangeText={(value) => setAuthValue('password', value)} placeholder={authMode === 'register' ? 'Create a 15+ character passphrase' : 'Enter your password'} placeholderTextColor="#AAB6D0" secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={authMode === 'register' ? 'new-password' : 'password'} /><TouchableOpacity style={s.passwordVisibilityButton} onPress={() => setPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}><View style={s.eyeIcon}><View style={s.eyePupil} />{!passwordVisible && <View style={s.eyeSlash} />}</View></TouchableOpacity></View>
        {authMode === 'register' && <Text style={s.authHint}>Choose your own password with at least 15 characters. For example, combine several words with numbers or symbols; don’t reuse someone else’s password.</Text>}
        <TouchableOpacity style={s.autoLoginRow} onPress={() => setAutoLogin((current) => !current)} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: autoLogin }} accessibilityLabel="Keep me signed in with auto login">
          <View style={[s.checkbox, autoLogin && s.checkboxChecked]}>{autoLogin && <Text style={s.checkboxCheck}>✓</Text>}</View>
          <View style={s.autoLoginTextWrap}>
            <Text style={s.autoLoginLabel}>Auto login</Text>
            <Text style={s.autoLoginSub}>Keep me signed in on this device</Text>
          </View>
        </TouchableOpacity>
        {!!authError && <Text style={s.authError} accessibilityRole="alert">{authError}</Text>}
        <TouchableOpacity style={[s.introButton, authBusy && { opacity: 0.65 }]} onPress={submitStudentAuth} disabled={authBusy}><Text style={s.introButtonText}>{authBusy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Log in'}</Text><Text style={s.introButtonArrow}>→</Text></TouchableOpacity>
        <Text style={s.introFooter}>Your password is hashed on the auth server; it is never saved as readable text.</Text>
      </Animated.View>
    );
    return <View style={[s.introRoot, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 12) }]}><StatusBar barStyle="light-content" backgroundColor="#0B1024" translucent={Platform.OS === 'android'} /><View style={s.introBackdrop}><View style={s.backdropOrbA} /><View style={s.backdropOrbB} /><View style={s.backdropGrid} /></View><ScrollView contentContainerStyle={s.introScrollContent} showsVerticalScrollIndicator={false}>{entryContent}</ScrollView></View>;
  }
  return <View style={[s.safe, { paddingTop: topInset, paddingBottom: insets.bottom }]}><StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={Platform.OS === 'android'} />
    <View style={s.topbar}><View style={s.brandMark}><Text style={s.brandMarkText}>C</Text></View><Text style={s.brand}>Campus<Text style={{ color: palette.blue }}>Link</Text></Text><TouchableOpacity style={s.themeButton} onPress={() => setThemeMode((mode) => mode === 'light' ? 'dark' : 'light')} accessibilityRole="button" accessibilityLabel={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}><Text style={s.themeIcon}>{themeMode === 'light' ? '☾' : '☀'}</Text></TouchableOpacity><TouchableOpacity style={s.headerButton} onPress={() => setTab('Inbox')}><Text style={s.headerIcon}>✉</Text>{visibleInbox.some((item) => item.unread) && <View style={s.bellDot} />}</TouchableOpacity><View style={s.miniAvatar}><Text style={s.miniAvatarText}>{role === 'Student' ? initials(student.name) : role === 'Recruiter' ? 'RC' : 'PO'}</Text></View></View>
    {role === 'Student' && !authUser && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.studentPicker} contentContainerStyle={s.studentPickerContent}>{students.map((person) => <TouchableOpacity key={person.id} onPress={() => setStudentId(person.id)} style={[s.personChip, student.id === person.id && s.personChipSelected]}><Text style={[s.personChipText, student.id === person.id && s.personChipTextSelected]}>{person.name}</Text></TouchableOpacity>)}</ScrollView>}
    <ScrollView key={`${role}-${tab}-${student.id}`} style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{content}</ScrollView>
    <View style={s.nav}>{TABS.map(([name, icon]) => <TouchableOpacity style={s.navItem} key={name} onPress={() => { setTab(name); setQuery(''); if (name === 'Inbox') setInbox((current) => current.map((item) => ({ ...item, unread: false }))); }}><Text style={[s.navIcon, tab === name && s.navActiveText]}>{icon}</Text><Text style={[s.navLabel, tab === name && s.navLabelSelected]}>{role === 'Placement' && name === 'Profile' ? 'Analytics' : name}</Text></TouchableOpacity>)}</View>
    {!!notice && <View style={s.toast} pointerEvents="none"><Text style={s.toastText}>{notice}</Text></View>}
    {formModal()}{openSelectedJobDetails()}{candidateModal()}
  </View>;
}

function Hero({ eyebrow, title, subtitle, action, onAction }) { return <View style={s.hero}><Text style={s.eyebrow}>{eyebrow}</Text><Text style={s.heroTitle}>{title}</Text><Text style={s.heroSub}>{subtitle}</Text>{action && <PrimaryButton label={action} onPress={onAction} />}</View>; }
function PrimaryButton({ label, onPress, disabled }) { return <TouchableOpacity style={[s.button, disabled && s.buttonDisabled]} disabled={disabled} onPress={onPress}><Text style={s.buttonText}>{label}</Text></TouchableOpacity>; }
function Metric({ value, label, last }) { return <View style={[s.metric, last && s.metricLast]}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>; }
function Section({ title, action, onPress }) { return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{action && <TouchableOpacity onPress={onPress}><Text style={s.link}>{action} ›</Text></TouchableOpacity>}</View>; }
function InfoBox({ title, body }) { return <View style={s.infoBox}><Text style={s.infoTitle}>{title}</Text><Text style={s.infoBody}>{body}</Text></View>; }
function EmptyState({ text }) { return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>; }
function MessageCard({ item, onRead }) { return <TouchableOpacity style={s.messageCard} onPress={onRead}><View style={[s.messageMark, item.unread && s.messageUnread]}><Text style={s.messageMarkText}>•</Text></View><View style={s.grow}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.bodySmall}>{item.body}</Text><Text style={s.microcopy}>{item.time}</Text></View></TouchableOpacity>; }
function Field({ label, value, onChange, placeholder, multiline, keyboardType }) { return <View style={s.fieldGroup}><Text style={s.fieldLabel}>{label}</Text><TextInput style={[s.fieldInput, multiline && s.multiline]} value={value || ''} onChangeText={onChange} placeholder={placeholder || ''} placeholderTextColor="#9AA7B8" multiline={multiline} keyboardType={keyboardType || 'default'} autoCapitalize="sentences" /></View>; }
function ProfileList({ title, values }) { return <View style={s.profileSection}><Text style={s.sectionTitle}>{title}</Text>{values.length ? values.map((value, index) => <Text key={`${title}-${index}`} style={s.profileValue}>•  {value}</Text>) : <Text style={s.muted}>Not added yet</Text>}</View>; }
function ScoreRow({ label, value, max, note }) { return <View style={s.scoreRow}><View style={s.rowBetween}><Text style={s.bodySmall}>{label}</Text><Text style={s.scoreText}>{value}/{max}</Text></View><View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.min(100, (value / max) * 100)}%` }]} /></View>{note && <Text style={s.microcopy}>{note}</Text>}</View>; }
function ApplicationCard({ application, role, onStage }) {
  const nextStage = { Applied: 'Shortlisted', Shortlisted: 'Interview', Interview: 'Offer' }[application.stage];
  const studentAction = application.stage === 'Offer' ? ['Documents', 'Accept offer'] : application.stage === 'Documents' ? ['Accepted', 'Mark documents submitted'] : application.stage === 'Accepted' ? ['Joined', 'Confirm joining'] : null;
  const active = !['Joined', 'Declined'].includes(application.stage);
  return <View style={s.card}>
    <View style={s.rowBetween}><View style={s.grow}><Text style={s.overline}>{application.company}</Text><Text style={s.cardTitle}>{application.jobTitle}</Text><Text style={s.muted}>{role === 'Student' ? 'Your application' : application.candidateName}</Text></View><View style={s.stagePill}><Text style={s.stageText}>{application.stage}</Text></View></View>
    <View style={s.stageTrack}>{CAREER_STAGES.slice(0, 7).map((stage, index) => <View style={s.stageCell} key={stage}><View style={[s.stageDot, CAREER_STAGES.indexOf(application.stage) >= index && application.stage !== 'Declined' && s.stageDotActive]} /><Text style={s.stageTiny}>{stage === 'Documents' ? 'Docs' : stage}</Text></View>)}</View>
    <Text style={s.microcopy}>Last updated · {application.updated || 'Just now'}{application.stage === 'Declined' ? ` · ${application.dropOff || 'Candidate withdrew'}` : ''}</Text>
    {role === 'Recruiter' || role === 'Placement' ? active && <View style={s.actionRow}>{nextStage && <TouchableOpacity style={s.smallButton} onPress={() => onStage(application, nextStage)}><Text style={s.smallButtonText}>Move to {nextStage}</Text></TouchableOpacity>}<TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')}><Text style={s.buttonSoftText}>Record drop-off</Text></TouchableOpacity></View> : active && <View style={s.actionRow}>
      {studentAction && <TouchableOpacity style={s.smallButton} onPress={() => onStage(application, studentAction[0])}><Text style={s.smallButtonText}>{studentAction[1]}</Text></TouchableOpacity>}
      {application.stage === 'Offer' && <TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')}><Text style={s.buttonSoftText}>Decline offer</Text></TouchableOpacity>}
      {!['Offer', 'Documents', 'Accepted'].includes(application.stage) && <TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')}><Text style={s.buttonSoftText}>Withdraw</Text></TouchableOpacity>}
    </View>}
  </View>;
}
function funnelCard(applications) { return <View style={s.funnel}>{[['Applied', applications.filter((x) => x.stage === 'Applied').length], ['Shortlisted', applications.filter((x) => x.stage === 'Shortlisted').length], ['Interview', applications.filter((x) => x.stage === 'Interview').length], ['Offer', applications.filter((x) => ['Offer', 'Documents', 'Accepted'].includes(x.stage)).length], ['Joined', applications.filter((x) => x.stage === 'Joined').length]].map(([name, count]) => <View style={s.funnelRow} key={name}><Text style={s.bodySmall}>{name}</Text><View style={s.funnelTrack}><View style={[s.funnelFill, { width: `${applications.length ? Math.max(8, (count / applications.length) * 100) : 0}%` }]} /></View><Text style={s.funnelCount}>{count}</Text></View>)}</View>; }
function searchBox(value, onChange, placeholder) { return <View style={s.search}><Text style={s.searchIcon}>⌕</Text><TextInput style={s.searchInput} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9AA7B8" /></View>; }

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, topbar: { height: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' }, brandMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' }, brandMarkText: { color: C.white, fontWeight: '900', fontSize: 18 }, brand: { marginLeft: 9, color: C.navy, fontWeight: '800', fontSize: 17 }, themeButton: { marginLeft: 'auto', marginRight: 12, width: 30, height: 30, borderRadius: 10, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, themeIcon: { color: C.navy, fontSize: 17, fontWeight: '800' }, headerButton: { marginRight: 15, position: 'relative' }, headerIcon: { color: C.navy, fontSize: 19 }, bellDot: { position: 'absolute', right: -1, top: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: C.red }, miniAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, miniAvatarText: { color: C.blue, fontWeight: '800', fontSize: 9 }, studentPicker: { maxHeight: 40, marginTop: 5 }, studentPickerContent: { paddingHorizontal: 16, gap: 7, alignItems: 'center' }, personChip: { borderRadius: 15, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.white }, personChipSelected: { borderColor: '#B7C9FF', backgroundColor: C.pale }, personChipText: { color: C.muted, fontSize: 9, fontWeight: '700' }, personChipTextSelected: { color: C.blue }, scroll: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 22 }, hero: { backgroundColor: C.navy, borderRadius: 21, padding: 19, marginBottom: 14 }, eyebrow: { color: C.blue, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' }, heroTitle: { color: C.white, fontSize: 25, lineHeight: 30, letterSpacing: -0.5, fontWeight: '800', marginTop: 7 }, heroSub: { color: '#C5CEE0', fontSize: 11, lineHeight: 17, marginTop: 6, marginBottom: 13 }, button: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: C.white, fontSize: 11, fontWeight: '800' }, buttonDisabled: { backgroundColor: '#AEBBD3' }, metricRow: { flexDirection: 'row', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, paddingVertical: 13, marginBottom: 19 }, metric: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderColor: C.line, paddingHorizontal: 3 }, metricLast: { borderRightWidth: 0 }, metricValue: { color: C.navy, fontWeight: '800', fontSize: 16 }, metricLabel: { color: C.muted, fontSize: 9, marginTop: 3, textAlign: 'center' }, section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 9 }, sectionTitle: { color: C.navy, fontWeight: '800', fontSize: 14 }, link: { color: C.blue, fontSize: 10, fontWeight: '800' }, card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 13, marginBottom: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, grow: { flex: 1 }, logo: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, logoText: { color: C.blue, fontWeight: '900', fontSize: 16 }, overline: { color: C.muted, fontSize: 8, letterSpacing: 0.8, fontWeight: '800' }, cardTitle: { color: C.navy, fontSize: 12, fontWeight: '800', marginTop: 2 }, muted: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 4 }, microcopy: { color: C.muted, fontSize: 8, lineHeight: 12, marginTop: 7 }, scorePill: { backgroundColor: C.softGreen, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center' }, scoreText: { color: C.green, fontSize: 12, fontWeight: '900' }, scoreCaption: { color: C.green, fontSize: 7, fontWeight: '700' }, tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8, marginBottom: 5 }, tag: { color: C.ink, backgroundColor: C.pale, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, fontSize: 8, fontWeight: '700' }, skillTag: { color: C.green, backgroundColor: C.softGreen, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, fontSize: 8, fontWeight: '700', overflow: 'hidden' }, skillMatched: { color: C.green }, skillMissing: { color: C.orange, backgroundColor: C.pale }, buttonSoft: { backgroundColor: C.pale, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' }, buttonSoftText: { color: C.blue, fontSize: 10, fontWeight: '800' }, candidateCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 9 }, avatar: { height: 38, width: 38, borderRadius: 19, backgroundColor: '#E7EDFF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.blue, fontSize: 10, fontWeight: '900' }, smallButton: { backgroundColor: C.blue, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'center' }, smallButtonText: { color: C.white, fontSize: 9, fontWeight: '800' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, selectJob: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, infoBox: { backgroundColor: C.pale, borderWidth: 1, borderColor: '#DFE7FB', borderRadius: 13, padding: 12, marginVertical: 8 }, infoTitle: { color: C.navy, fontSize: 10, fontWeight: '800' }, infoBody: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 4 }, conflictBanner: { backgroundColor: C.softRed, borderColor: '#F3D4D7', borderWidth: 1, borderRadius: 13, padding: 12, marginBottom: 12, flexDirection: 'row', gap: 9, alignItems: 'center' }, conflictIcon: { width: 24, height: 24, textAlign: 'center', textAlignVertical: 'center', color: C.red, backgroundColor: '#FFE1E4', borderRadius: 12, fontWeight: '900' }, riskRow: { backgroundColor: C.white, borderColor: C.line, borderWidth: 1, borderRadius: 13, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }, stagePill: { backgroundColor: C.pale, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 }, stageText: { color: C.blue, fontSize: 8, fontWeight: '800' }, stageTrack: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 7 }, stageCell: { flex: 1, alignItems: 'center' }, stageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DCE2EC' }, stageDotActive: { backgroundColor: C.blue }, stageTiny: { color: C.muted, fontSize: 6, marginTop: 4, textAlign: 'center' }, actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, dateBox: { width: 42, height: 46, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' }, dateDay: { color: C.blue, fontSize: 16, fontWeight: '900' }, dateMon: { color: C.blue, fontSize: 8, fontWeight: '800' }, eventCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 11, marginBottom: 9 }, conflictInline: { backgroundColor: C.softRed, borderColor: '#F3D4D7', borderWidth: 1, borderRadius: 12, padding: 11, marginVertical: 9 }, messageCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 12, flexDirection: 'row', gap: 10, marginBottom: 8 }, messageMark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1F6' }, messageUnread: { backgroundColor: '#DCE6FF' }, messageMarkText: { color: C.blue, fontSize: 18, lineHeight: 20 }, bodySmall: { color: C.ink, fontSize: 9, lineHeight: 14, marginTop: 4 }, body: { color: C.ink, fontSize: 10, lineHeight: 16, marginTop: 10 }, empty: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 18, alignItems: 'center' }, emptyText: { color: C.muted, textAlign: 'center', fontSize: 10, lineHeight: 16 }, search: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, marginBottom: 10 }, searchIcon: { fontSize: 17, color: C.muted, marginRight: 6 }, searchInput: { flex: 1, color: C.ink, fontSize: 10, paddingVertical: 10 }, profileSection: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 12, marginBottom: 9 }, profileValue: { color: C.ink, fontSize: 9, marginTop: 7, lineHeight: 14 }, learningRow: { backgroundColor: C.white, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, marginBottom: 7 }, progressTrack: { height: 5, borderRadius: 3, backgroundColor: C.pale, marginTop: 6 }, progressFill: { height: 5, borderRadius: 3, backgroundColor: C.blue }, funnel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 12, marginBottom: 10 }, funnelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 9 }, funnelTrack: { flex: 1, height: 6, backgroundColor: C.pale, borderRadius: 3, overflow: 'hidden' }, funnelFill: { height: 6, borderRadius: 3, backgroundColor: C.blue }, funnelCount: { color: C.navy, fontSize: 9, fontWeight: '800', width: 17, textAlign: 'right' }, overlay: { flex: 1, backgroundColor: 'rgba(18,35,63,0.45)', justifyContent: 'center', padding: 16 }, modalCard: { maxHeight: '92%', backgroundColor: C.white, borderRadius: 19, padding: 17 }, modalTitle: { color: C.navy, fontWeight: '900', fontSize: 17, flex: 1 }, close: { color: C.muted, fontSize: 26, paddingHorizontal: 5 }, fieldGroup: { marginBottom: 12 }, fieldLabel: { color: C.navy, fontWeight: '800', fontSize: 9, marginBottom: 5 }, fieldInput: { minHeight: 39, borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 10, color: C.ink, fontSize: 10 }, multiline: { minHeight: 92, textAlignVertical: 'top', paddingTop: 9 }, modalActions: { flexDirection: 'row', gap: 9, marginTop: 11 }, cancelButton: { flex: 1, borderRadius: 9, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingVertical: 11 }, cancelText: { color: C.muted, fontSize: 10, fontWeight: '800' }, analysisBox: { backgroundColor: '#F4F8FF', borderWidth: 1, borderColor: '#DCE7FC', borderRadius: 12, padding: 11, marginVertical: 9 }, bigScore: { backgroundColor: C.softGreen, borderRadius: 15, padding: 15, alignItems: 'center', marginVertical: 12 }, bigScoreValue: { color: C.green, fontWeight: '900', fontSize: 32 }, bigScoreLabel: { color: C.green, fontSize: 9, fontWeight: '700' }, scoreRow: { paddingVertical: 7 }, matchPanel: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, marginVertical: 5 }, nav: { height: 58, flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderColor: C.line, paddingTop: 5 }, navItem: { flex: 1, alignItems: 'center' }, navIcon: { color: '#93A0B2', fontSize: 17, height: 23 }, navActiveText: { color: C.blue }, navLabel: { color: C.muted, fontSize: 7 }, navLabelSelected: { color: C.blue, fontWeight: '800' },    toast: { position: 'absolute', bottom: 68, alignSelf: 'center', maxWidth: '90%', backgroundColor: C.navy, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, elevation: 5 }, toastText: { color: C.white, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    autoLoginBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.softGreen, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10 },
    autoLoginBadgeIcon: { fontSize: 13, color: C.green },
    autoLoginBadgeText: { fontSize: 9, fontWeight: '700', color: C.green },
});

const introStyles = StyleSheet.create({
  introRoot: { flex: 1, backgroundColor: '#0B1024', overflow: 'hidden' }, introBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0B1024', overflow: 'hidden' }, backdropOrbA: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#243B76', opacity: 0.44, top: -155, right: -155 }, backdropOrbB: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#5A286F', opacity: 0.23, bottom: -155, left: -140 }, backdropGrid: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(148,174,255,0.035)' }, sessionLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, introScrollContent: { flexGrow: 1 }, introContent: { flexGrow: 1, minHeight: 690, alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 28, paddingVertical: 14 }, introGlow: { position: 'absolute', borderRadius: 999 }, introGlowBlue: { width: 260, height: 260, backgroundColor: '#3F67FF', opacity: 0.10, top: '22%', left: '12%' }, introGlowPink: { width: 220, height: 220, backgroundColor: '#D348CF', opacity: 0.12, bottom: '21%', right: '8%' }, introBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, introBrandIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: '#6E62F6', alignItems: 'center', justifyContent: 'center', shadowColor: '#7A6BFF', shadowOpacity: 0.6, shadowRadius: 16, elevation: 7 }, introBrandLetter: { color: C.white, fontSize: 21, fontWeight: '900' }, introBrandSpark: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#75E6DE', right: -2, top: 1 }, introBrandName: { color: C.white, letterSpacing: 2.4, fontSize: 11, fontWeight: '900' }, orbitStage: { width: 245, height: 235, alignItems: 'center', justifyContent: 'center', marginVertical: 4 }, orbitAura: { position: 'absolute', width: 152, height: 152, borderRadius: 76, backgroundColor: '#5866FF', opacity: 0.18 }, orbitRingOuter: { position: 'absolute', width: 214, height: 164, borderWidth: 1, borderColor: 'rgba(112,224,231,0.36)', borderRadius: 110, transform: [{ rotate: '-24deg' }] }, orbitRingInner: { position: 'absolute', width: 186, height: 194, borderWidth: 1, borderColor: 'rgba(183,139,255,0.36)', borderRadius: 100, transform: [{ rotate: '31deg' }] }, orbitDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#75E6DE' }, orbitDotOne: { top: 26, left: 66 }, orbitDotTwo: { bottom: 38, right: 52, backgroundColor: '#C4A5FF' }, orbitCore: { width: 102, height: 102, borderRadius: 34, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], shadowColor: '#55DAD3', shadowOpacity: 0.3, shadowRadius: 24, elevation: 10 }, orbitCoreText: { color: '#6655E8', fontSize: 56, fontWeight: '900', lineHeight: 65 }, orbitCoreStar: { position: 'absolute', color: '#FFB86C', fontSize: 18, right: 11, top: 8 }, orbitNode: { position: 'absolute', width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202B49', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }, orbitNodeText: { color: C.white, fontSize: 12, fontWeight: '900' }, nodeStudent: { top: 18, right: 36 }, nodeCampus: { bottom: 21, left: 36, backgroundColor: '#163C4A' }, nodeTalent: { top: 95, left: 7, backgroundColor: '#3C2853' }, introEyebrow: { color: '#79E2DB', letterSpacing: 2, fontWeight: '900', fontSize: 9, textAlign: 'center', marginTop: 4 }, introTitle: { color: C.white, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center', marginTop: 8 }, introSubtitle: { color: '#B9C4DC', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 2 }, introDots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }, introDotActive: { width: 20, height: 5, borderRadius: 3, backgroundColor: '#75E6DE' }, introDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#53607C' }, introButton: { width: '100%', height: 52, borderRadius: 15, backgroundColor: '#6B61F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#6B61F6', shadowOpacity: 0.32, shadowRadius: 14 }, introButtonText: { color: C.white, fontSize: 12, fontWeight: '900' }, introButtonArrow: { color: '#94F4EB', fontSize: 18, fontWeight: '800', marginLeft: 9 }, introFooter: { color: '#7E8AA6', fontSize: 9, marginTop: 7, textAlign: 'center' }, authModeRow: { flexDirection: 'row', gap: 8, marginTop: 7, marginBottom: 12 }, authModeTab: { flex: 1, borderWidth: 1, borderColor: 'rgba(180,196,230,0.2)', backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }, authModeSelected: { borderColor: '#75E6DE', backgroundColor: 'rgba(117,230,222,0.13)' }, authModeText: { color: '#AAB6D0', fontSize: 11, fontWeight: '700' }, authModeTextSelected: { color: '#FFFFFF' }, authLabel: { color: '#EAF0FF', fontSize: 10, fontWeight: '800', marginTop: 7, marginBottom: 5 }, authInput: { minHeight: 44, borderWidth: 1, borderColor: 'rgba(180,196,230,0.25)', borderRadius: 12, paddingHorizontal: 12, color: '#FFFFFF', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.055)' }, authPasswordRow: { minHeight: 44, borderWidth: 1, borderColor: 'rgba(180,196,230,0.25)', borderRadius: 12, paddingRight: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.055)' }, authPasswordInput: { flex: 1, minHeight: 42, borderWidth: 0, backgroundColor: 'transparent', paddingRight: 4 }, passwordVisibilityButton: { minWidth: 48, minHeight: 36, paddingHorizontal: 7, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(117,230,222,0.12)' }, eyeIcon: { width: 22, height: 14, borderWidth: 2, borderColor: '#75E6DE', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, eyePupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#75E6DE' }, eyeSlash: { position: 'absolute', width: 24, height: 2, borderRadius: 1, backgroundColor: '#75E6DE', transform: [{ rotate: '-38deg' }] }, collegeSuggestions: { maxHeight: 180, marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(180,196,230,0.18)', borderRadius: 12, backgroundColor: '#151D36' }, collegeSuggestion: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(180,196,230,0.11)' }, authSuggestionText: { color: '#EAF0FF', fontSize: 10, lineHeight: 14 }, authHint: { color: '#AAB6D0', fontSize: 9, lineHeight: 13, marginTop: 5 }, authError: { color: '#FF9AA2', fontSize: 10, lineHeight: 14, marginTop: 9, marginBottom: 4 }, roleIntroContent: { flexGrow: 1, minHeight: 690, paddingHorizontal: 22, paddingVertical: 16, justifyContent: 'center' }, backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16, marginBottom: 20 }, backButtonText: { color: '#A9B7D2', fontSize: 11, fontWeight: '700' }, roleIntroTitle: { color: C.white, fontSize: 33, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8, marginTop: 9 }, roleIntroSubtitle: { color: '#B9C4DC', fontSize: 11, lineHeight: 17, marginTop: 8, marginBottom: 19 }, roleChoiceCard: { minHeight: 79, borderWidth: 1, borderColor: 'rgba(180,196,230,0.18)', borderRadius: 17, padding: 11, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.045)' }, roleChoiceSelected: { borderColor: '#75E6DE', backgroundColor: 'rgba(117,230,222,0.11)' }, roleChoiceIcon: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, roleChoiceEmoji: { fontSize: 19 }, roleChoiceText: { flex: 1 }, roleChoiceName: { color: C.white, fontSize: 12, fontWeight: '800' }, roleChoiceDescription: { color: '#AAB6D0', fontSize: 9, lineHeight: 13, marginTop: 4 }, choiceRadio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#73819E', alignItems: 'center', justifyContent: 'center' }, choiceRadioSelected: { borderColor: '#75E6DE' }, choiceRadioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#75E6DE' },
  autoLoginRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 8, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#75E6DE', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  checkboxChecked: { backgroundColor: '#75E6DE' },
  checkboxCheck: { color: '#0B1024', fontSize: 14, fontWeight: '900', lineHeight: 16 },
  autoLoginTextWrap: { flex: 1 },
  autoLoginLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  autoLoginSub: { color: '#AAB6D0', fontSize: 9, marginTop: 1 },
});
const lightStyles = { ...makeStyles(C), ...introStyles };
const darkStyles = { ...makeStyles(DARK), ...introStyles };
s = lightStyles;
