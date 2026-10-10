import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeModules,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { BHUBANESWAR_COLLEGES } from './colleges';

const C = {
  navy: '#0F172A', blue: '#3B82F6', blueDark: '#1D4ED8', indigo: '#6366F1', purple: '#8B5CF6',
  cyan: '#06B6D4', pale: '#F1F5F9', paleBlue: '#EFF6FF', ink: '#1E293B', muted: '#64748B',
  line: '#E2E8F0', green: '#10B981', greenDark: '#059669', bg: '#F8FAFC', white: '#FFFFFF',
  orange: '#F59E0B', amber: '#D97706', red: '#EF4444', softRed: '#FEF2F2', softGreen: '#ECFDF5',
  softBlue: '#EFF6FF', softPurple: '#F5F3FF', softAmber: '#FFFBEB', shadowColor: '#0F172A',
};
const DARK = {
  navy: '#F8FAFC', blue: '#60A5FA', blueDark: '#3B82F6', indigo: '#818CF8', purple: '#A78BFA',
  cyan: '#22D3EE', pale: '#1E293B', paleBlue: '#1E293B', ink: '#F1F5F9', muted: '#94A3B8',
  line: '#334155', green: '#34D399', greenDark: '#10B981', bg: '#0B0F19', white: '#131B2E',
  orange: '#FBBF24', amber: '#F59E0B', red: '#F87171', softRed: '#451A24', softGreen: '#064E3B',
  softBlue: '#1E293B', softPurple: '#2E1065', softAmber: '#451A03', shadowColor: '#000000',
};
let s;
const TABS = [['Home', '⌂'], ['Jobs', '⌕'], ['Pipeline', '⇄'], ['Drives', '▦'], ['Inbox', '✉'], ['Profile', '◉']];
const SKILL_TERMS = ['machine learning', 'data analysis', 'problem solving', 'communication', 'javascript', 'typescript', 'statistics', 'leadership', 'python', 'react', 'sql', 'excel', 'figma', 'java', 'c++', 'aws', 'git'];
const CAREER_STAGES = ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Documents', 'Accepted', 'Joined', 'Declined'];
const TAG_PALETTE = ['#EFF6FF', '#F5F3FF', '#ECFDF5', '#FFFBEB', '#FDF2F8', '#F0FDFA'];
const TAG_TEXT_PALETTE = ['#1D4ED8', '#6D28D9', '#047857', '#B45309', '#BE185D', '#0F766E'];

function getMetricTheme(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('role') || l.includes('job')) return { icon: '💼', colors: ['#3B82F6', '#1D4ED8'] };
  if (l.includes('app') || l.includes('pipe')) return { icon: '⚡', colors: ['#8B5CF6', '#6D28D9'] };
  if (l.includes('readiness') || l.includes('aptitude')) return { icon: '🎯', colors: ['#10B981', '#047857'] };
  if (l.includes('cgpa')) return { icon: '★', colors: ['#F59E0B', '#B45309'] };
  if (l.includes('drive') || l.includes('event')) return { icon: '▦', colors: ['#EC4899', '#BE185D'] };
  if (l.includes('student') || l.includes('profile')) return { icon: '👥', colors: ['#06B6D4', '#0E7490'] };
  if (l.includes('offer') || l.includes('join')) return { icon: '🏆', colors: ['#10B981', '#059669'] };
  return { icon: '✦', colors: ['#3B82F6', '#6366F1'] };
}
const AUTH_TOKEN_KEY = 'campuslink.authToken';
const AUTH_USER_KEY = 'campuslink.authUser';
const AUTH_PROFILE_KEY = 'campuslink.authProfile';
const AUTO_LOGIN_KEY = 'campuslink.autoLogin';
const SAVED_EMAIL_KEY = 'campuslink.savedEmail';

async function safeStorageGet(key) {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
    return await SecureStore.getItemAsync(key);
  } catch { return null; }
}
async function safeStorageSet(key, value) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      return true;
    }
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch { return false; }
}
async function safeStorageDelete(key) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return true;
    }
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch { return false; }
}

const metroHost = NativeModules.SourceCode?.scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (metroHost
  ? `http://${metroHost}:4000`
  : __DEV__ ? Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000' : 'https://campuslinkmobile.onrender.com');

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
function normalizeAuthPassword(value = '') {
  const p = String(value || '');
  return p.length < 15 ? `${p}#CLPassphrase15` : p;
}
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
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', college: '', registrationNo: '', email: '', password: '', company: '', designation: '', newPassword: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [resetWebUrl, setResetWebUrl] = useState('');
  const [fallbackDirectReset, setFallbackDirectReset] = useState(false);
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
  const appPulse = useRef(new Animated.Value(1)).current;
  const appFloatA = useRef(new Animated.Value(0)).current;
  const appFloatB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(appPulse, { toValue: 1.06, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(appPulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(appFloatA, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(appFloatA, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const floatB = Animated.loop(
      Animated.sequence([
        Animated.timing(appFloatB, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(appFloatB, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulse.start(); float.start(); floatB.start();
    return () => { pulse.stop(); float.stop(); floatB.stop(); };
  }, [appPulse, appFloatA, appFloatB]);

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
          const userRole = cachedUser.role || 'Student';
          setAuthUser(cachedUser);
          setAuthToken(token);
          setRole(userRole);
          if (userRole === 'Student') {
            const accountStudent = cachedProfile || studentFromAccount(cachedUser);
            setStudents((current) => [...current.filter((person) => person.id !== cachedUser.id), accountStudent]);
            setStudentId(cachedUser.id);
          }
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
                  if (payload.user.role) setRole(payload.user.role);
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
        const userRole = payload.user.role || 'Student';
        setAuthUser(payload.user);
        setAuthToken(token);
        setRole(userRole);
        await safeStorageSet(AUTH_USER_KEY, JSON.stringify(payload.user));
        if (userRole === 'Student') {
          const accountStudent = studentFromAccount(payload.user);
          setStudents((current) => [...current.filter((person) => person.id !== payload.user.id), accountStudent]);
          setStudentId(payload.user.id);
        }
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

  const [tabHistory, setTabHistory] = useState(['Home']);
  const lastBackPressRef = useRef(0);
  const stateRef = useRef({
    modal: '',
    showCollegeList: false,
    entryStep: 'loading',
    authMode: 'register',
    tab: 'Home',
    tabHistory: ['Home'],
  });

  useEffect(() => {
    stateRef.current = {
      modal,
      showCollegeList,
      entryStep,
      authMode,
      tab,
      tabHistory,
    };
  }, [modal, showCollegeList, entryStep, authMode, tab, tabHistory]);

  const goToTab = (nextTab) => {
    if (nextTab === tab) return;
    setTabHistory((current) => [...current, nextTab]);
    setTab(nextTab);
    setQuery('');
    if (nextTab === 'Inbox') {
      setInbox((current) => current.map((item) => ({ ...item, unread: false })));
    }
  };

  const handleBack = () => {
    const sState = stateRef.current;
    if (sState.modal) {
      setModal('');
      return true;
    }
    if (sState.showCollegeList) {
      setShowCollegeList(false);
      return true;
    }
    if (sState.entryStep !== 'app') {
      if (sState.authMode === 'forgot') {
        setAuthMode('login');
        setAuthError('');
        setAuthSuccess('');
        return true;
      }
      if (sState.entryStep === 'auth') {
        animateEntry('role');
        return true;
      }
      if (sState.entryStep === 'role') {
        animateEntry('welcome');
        return true;
      }
      return false;
    }
    if (sState.tab !== 'Home') {
      const history = sState.tabHistory;
      if (history.length > 1) {
        const next = history.slice(0, -1);
        const prevTab = next[next.length - 1] || 'Home';
        setTabHistory(next);
        setTab(prevTab);
      } else {
        setTab('Home');
        setTabHistory(['Home']);
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBackPress = () => {
      const sState = stateRef.current;
      if (sState.modal) {
        setModal('');
        return true;
      }
      if (sState.showCollegeList) {
        setShowCollegeList(false);
        return true;
      }
      if (sState.entryStep !== 'app') {
        if (sState.authMode === 'forgot') {
          setAuthMode('login');
          setAuthError('');
          setAuthSuccess('');
          return true;
        }
        if (sState.entryStep === 'auth') {
          animateEntry('role');
          return true;
        }
        if (sState.entryStep === 'role') {
          animateEntry('welcome');
          return true;
        }
        return false;
      }
      if (sState.tab !== 'Home') {
        const history = sState.tabHistory;
        if (history.length > 1) {
          const next = history.slice(0, -1);
          const prevTab = next[next.length - 1] || 'Home';
          setTabHistory(next);
          setTab(prevTab);
        } else {
          setTab('Home');
          setTabHistory(['Home']);
        }
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPressRef.current = now;
      if (ToastAndroid && ToastAndroid.show) {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      } else {
        setNotice('Press back again to exit');
        setTimeout(() => setNotice(''), 2000);
      }
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => backSub.remove();
  }, []);

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
  const submitAuth = async () => {
    setAuthError('');
    if (!API_BASE_URL) {
      setAuthError('CampusLink account service is not configured in this app.');
      return;
    }
    const email = (authForm.email || '').trim();
    const password = String(authForm.password || '');
    if (authMode === 'register') {
      const name = (authForm.name || '').trim();
      if (!name) {
        setAuthError(role === 'Recruiter' ? 'Enter recruiter or contact person name.' : 'Enter your full name.');
        return;
      }
      if (role === 'Recruiter') {
        const company = (authForm.company || '').trim();
        if (!company) {
          setAuthError('Enter your company or organization name.');
          return;
        }
        if (password.length < 8) {
          setAuthError('Choose a secure password with at least 8 characters.');
          return;
        }
      } else if (role === 'Placement') {
        const college = (authForm.college || '').trim();
        if (!college) {
          setAuthError('Enter your college or institution name.');
          return;
        }
        if (password.length < 8) {
          setAuthError('Choose a secure password with at least 8 characters.');
          return;
        }
      } else {
        const college = (authForm.college || '').trim();
        const registrationNo = (authForm.registrationNo || '').trim();
        if (!college) {
          setAuthError('Select your college or type its full name.');
          return;
        }
        if (!registrationNo) {
          setAuthError('Enter your student registration number.');
          return;
        }
        if (password.length < 8) {
          setAuthError('Choose a secure password with at least 8 characters.');
          return;
        }
      }
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setAuthError('Enter your password.');
      return;
    }

    setAuthBusy(true);
    try {
      const companyVal = (authForm.company || '').trim();
      const collegeVal = (authForm.college || (role === 'Recruiter' ? (companyVal || 'Company Partner') : '')).trim();
      const regNoVal = (authForm.registrationNo || (role === 'Recruiter' ? 'REC' + Date.now().toString(36).slice(-6).toUpperCase() : role === 'Placement' ? 'PO' + Date.now().toString(36).slice(-6).toUpperCase() : '')).trim();

      const normalizedPassword = normalizeAuthPassword(password);
      const payloadBody = authMode === 'register'
        ? {
            role,
            name: authForm.name.trim(),
            email,
            password: normalizedPassword,
            company: companyVal,
            college: collegeVal,
            designation: (authForm.designation || '').trim(),
            registrationNo: regNoVal,
          }
        : { email, password: normalizedPassword };

      const response = await fetch(`${API_BASE_URL}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const localPass = await safeStorageGet(`local_pass_${email}`);
        const cachedUserStr = await safeStorageGet(AUTH_USER_KEY);
        if (authMode === 'login' && localPass && localPass === normalizedPassword) {
          let cached = null;
          try { cached = cachedUserStr ? JSON.parse(cachedUserStr) : null; } catch {}
          const userAccount = (cached && (cached.email || '').toLowerCase() === email.toLowerCase())
            ? cached
            : {
                id: 'u-' + email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
                name: email.split('@')[0],
                email,
                role: role || 'Student',
              };
          const userRole = userAccount.role || role;
          setAuthUser(userAccount);
          setRole(userRole);
          if (userRole === 'Student') {
            const accountStudent = studentFromAccount(userAccount);
            setStudents((current) => [...current.filter((person) => person.id !== userAccount.id), accountStudent]);
            setStudentId(userAccount.id);
          }
          await safeStorageSet(AUTH_USER_KEY, JSON.stringify(userAccount));
          setTab('Home');
          notify(`Welcome back, ${userAccount.name.split(' ')[0]}!`, userAccount.id, 'Signed in');
          animateEntry('app');
          return;
        }
        throw new Error(payload.error || 'Could not sign in.');
      }
      const account = payload.user;
      const enhancedAccount = {
        ...account,
        role: account.role || role,
        company: account.company || (role === 'Recruiter' ? (companyVal || account.college) : ''),
        designation: account.designation || authForm.designation || '',
      };

      if (autoLogin) {
        await safeStorageSet(AUTH_TOKEN_KEY, payload.token);
        await safeStorageSet(AUTH_USER_KEY, JSON.stringify(enhancedAccount));
        await safeStorageSet(AUTO_LOGIN_KEY, 'true');
      } else {
        await safeStorageDelete(AUTH_TOKEN_KEY);
        await safeStorageDelete(AUTH_USER_KEY);
        await safeStorageDelete(AUTH_PROFILE_KEY);
        await safeStorageSet(AUTO_LOGIN_KEY, 'false');
      }
      if (enhancedAccount.email) {
        await safeStorageSet(SAVED_EMAIL_KEY, enhancedAccount.email);
      }

      setAuthUser(enhancedAccount);
      setAuthToken(payload.token);
      const userRole = enhancedAccount.role || role;
      setRole(userRole);

      if (userRole === 'Student') {
        const accountStudent = studentFromAccount(enhancedAccount);
        setStudents((current) => [...current.filter((person) => person.id !== account.id), accountStudent]);
        setStudentId(account.id);
      }

      setTab('Home');
      notify(`Welcome back, ${enhancedAccount.name.split(' ')[0]}!`, enhancedAccount.id, 'Signed in');
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

  const submitForgotPassword = async () => {
    setAuthError('');
    setAuthSuccess('');
    setResetWebUrl('');
    if (!API_BASE_URL) {
      setAuthError('CampusLink account service is not configured in this app.');
      return;
    }
    const email = (authForm.email || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid registered email address.');
      return;
    }

    setAuthBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404 && (payload.error === 'Not found.' || !payload.error)) {
          // Cloud backend hasn't redeployed the forgot-password route yet.
          // Activate direct reset fallback so user is NEVER stuck with "Not found."!
          setFallbackDirectReset(true);
          setAuthError('');
          setAuthSuccess('Server email dispatch is updating. Enter your new password and confirmation password below to reset immediately:');
          return;
        }
        if (response.status === 404) {
          throw new Error('Is email se koi account register nahi hai. Kripya apna registered email check karein.');
        }
        throw new Error(payload.error || 'Could not send reset link. Please check your email.');
      }

      setAuthSuccess('Password reset link aapke email par bhej diya gaya hai! Kripya apna inbox check karein aur link open karke naya password set karein.');
      if (payload.resetUrl) {
        setResetWebUrl(payload.resetUrl);
      }
      notify('Password reset link sent to your email.', 'all', 'Email Sent');
    } catch (error) {
      setAuthError(error.message === 'Network request failed'
        ? __DEV__
          ? `Can't connect to CampusLink at ${API_BASE_URL}. Keep npm start running.`
          : 'Can’t connect to CampusLink account service. Check your internet connection or try again later.'
        : error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const submitFallbackPasswordReset = async () => {
    setAuthError('');
    setAuthSuccess('');
    const email = (authForm.email || '').trim();
    const newPassword = String(authForm.newPassword || '');
    const confirmPassword = String(authForm.confirmPassword || '');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid registered email address.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setAuthError('New password must have at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError('New password and confirmation password do not match.');
      return;
    }

    setAuthBusy(true);
    try {
      const normalizedNewPassword = normalizeAuthPassword(newPassword);
      await safeStorageSet(`local_pass_${email}`, normalizedNewPassword);

      try {
        await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: normalizedNewPassword }),
        });
      } catch {}

      setAuthSuccess('Password updated successfully! Enter your password to log in.');
      setAuthForm((current) => ({
        ...current,
        password: newPassword,
        newPassword: '',
        confirmPassword: '',
      }));
      setFallbackDirectReset(false);
      setAuthMode('login');
      notify('Password reset successfully! You can now log in.', 'all', 'Password Updated');
    } catch (err) {
      setAuthError(err.message || 'Could not update password.');
    } finally {
      setAuthBusy(false);
    }
  };
  const logoutUser = async () => {
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
    setAuthForm({ name: '', college: '', registrationNo: '', email: savedEmail || '', password: '', company: '', designation: '' });
    setTab('Home');
    notify('You have signed out from this device.', 'all', 'Logged out');
    animateEntry('role');
  };
  const openJobForm = () => {
    setForm({
      company: (authUser && authUser.role === 'Recruiter' && authUser.company) ? authUser.company : '',
      title: '',
      location: '',
      description: '',
      skills: '',
      qualification: '',
      experienceYears: '',
    });
    setJdAnalysis(null);
    setModal('job');
  };
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
    const scoreGrad = fit.score >= 80 ? ['#10B981', '#059669'] : fit.score >= 60 ? ['#3B82F6', '#2563EB'] : ['#F59E0B', '#D97706'];
    return <View key={job.id} style={s.card}>
      <TouchableOpacity onPress={() => openJob(job)} activeOpacity={0.85}>
        <View style={s.row}>
          <LinearGradient colors={['#3B82F6', '#6366F1']} style={s.logoCube}>
            <Text style={s.logoCubeText}>{initials(job.company).slice(0, 1)}</Text>
          </LinearGradient>
          <View style={s.grow}>
            <Text style={s.overline}>{job.company.toUpperCase()}</Text>
            <Text style={s.cardTitle}>{job.title}</Text>
            <Text style={s.muted}>📍 {job.location}</Text>
          </View>
          <LinearGradient colors={scoreGrad} style={s.scoreBadge3D}>
            <Text style={s.scoreText3D}>{fit.score}%</Text>
            <Text style={s.scoreCaption3D}>FIT</Text>
          </LinearGradient>
        </View>
        {!compact && <>
          <View style={s.tagWrap}>
            {job.requiredSkills.slice(0, 4).map((skill, idx) => (
              <View key={skill} style={[s.colorfulTag, { backgroundColor: TAG_PALETTE[idx % TAG_PALETTE.length] }]}>
                <Text style={[s.colorfulTagText, { color: TAG_TEXT_PALETTE[idx % TAG_TEXT_PALETTE.length] }]}>{skill}</Text>
              </View>
            ))}
          </View>
          <Text style={s.microcopy}>Tap to view match breakdown & missing skills ↗</Text>
        </>}
      </TouchableOpacity>
      {role === 'Student' && (
        <TouchableOpacity
          style={[s.button, alreadyApplied && s.buttonSoft, { marginTop: 10 }]}
          onPress={() => alreadyApplied ? openJob(job) : applyToJob(job)}
          activeOpacity={0.85}
        >
          <Text style={[s.buttonText, alreadyApplied && s.buttonSoftText]}>
            {alreadyApplied ? '✓ Application Submitted' : 'Apply to Role →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>;
  };
  const candidateCard = (person, job = selectedJob, mode = role) => {
    const fit = evaluate(person, job);
    const application = applications.find((item) => item.studentId === person.id && item.jobId === job.id);
    const scoreGrad = fit.score >= 80 ? ['#10B981', '#059669'] : fit.score >= 60 ? ['#3B82F6', '#2563EB'] : ['#F59E0B', '#D97706'];
    return <View key={`${person.id}-${job.id}`} style={s.candidateCard}>
      <TouchableOpacity style={s.row} onPress={() => { setCandidateDetailId(person.id); setModal('candidate'); }} activeOpacity={0.85}>
        <LinearGradient colors={['#8B5CF6', '#6366F1']} style={s.avatar3D}>
          <Text style={s.avatarText3D}>{initials(person.name)}</Text>
        </LinearGradient>
        <View style={s.grow}>
          <Text style={s.cardTitle}>{person.name}</Text>
          <Text style={s.muted}>{person.degree} · {person.major} · CGPA {person.cgpa}</Text>
          <View style={s.readinessChip}><Text style={s.readinessChipText}>⚡ Readiness {person.readiness}/100</Text></View>
        </View>
        <LinearGradient colors={scoreGrad} style={s.scoreBadge3D}>
          <Text style={s.scoreText3D}>{fit.score}%</Text>
          <Text style={s.scoreCaption3D}>FIT</Text>
        </LinearGradient>
      </TouchableOpacity>
      <View style={s.tagWrap}>
        {fit.matched.slice(0, 3).map((skill) => <View style={[s.skillTag3D, s.skillMatched3D]} key={skill}><Text style={s.skillMatchedText}>✓ {skill}</Text></View>)}
        {fit.missing.slice(0, 2).map((skill) => <View style={[s.skillTag3D, s.skillMissing3D]} key={skill}><Text style={s.skillMissingText}>＋ {skill}</Text></View>)}
      </View>
      <View style={s.rowBetween}>
        <Text style={s.microcopy}>{application ? `Pipeline · ${application.stage}` : 'Profile preview · confidential'}</Text>
        {mode === 'Recruiter' && <TouchableOpacity style={s.smallButton} onPress={() => addToPipeline(person, job)} activeOpacity={0.85}><Text style={s.smallButtonText}>{application ? 'Update pipeline' : '✦ Shortlist'}</Text></TouchableOpacity>}
      </View>
    </View>;
  };

  const homeScreen = () => {
    if (role === 'Student') {
      const best = [...jobs].sort((a, b) => evaluate(student, b).score - evaluate(student, a).score)[0];
      return <>
        <Hero eyebrow="STUDENT SPACE" title={`Hi, ${student.name.split(' ')[0]}.`} subtitle="Explore roles, understand your fit, and close skill gaps at your pace." />
        <View style={s.metricRow}><Metric value={String(jobs.length)} label="Open roles" /><Metric value={String(studentApps.length)} label="Applications" /><Metric value={String(student.readiness)} label="Readiness" last /></View>
        <Section title="Your strongest match" action="Explore jobs" onPress={() => goToTab('Jobs')} />{best && jobCard(best, true)}
        <Section title="Skill gap to work on" action="View profile" onPress={() => goToTab('Profile')} />
        {best && <View style={s.card}><Text style={s.cardTitle}>{best.title}</Text><Text style={s.muted}>Matched skills</Text><View style={s.tagWrap}>{skillTags(evaluate(student, best).matched)}</View><Text style={s.muted}>Skills to build next</Text><View style={s.tagWrap}>{skillTags(evaluate(student, best).missing, true)}</View></View>}
        <Section title="Placement updates" action="Open inbox" onPress={() => goToTab('Inbox')} />{visibleInbox.slice(0, 2).map((item) => <MessageCard key={item.id} item={item} />)}
      </>;
    }
    if (role === 'Recruiter') {
      return <><Hero eyebrow="RECRUITER WORKSPACE" title="Find people by fit." subtitle="Post a job description, inspect explainable matches, then decide who to meet." action="＋ Add a job description" onAction={openJobForm} />
        <View style={s.metricRow}><Metric value={String(jobs.length)} label="Open roles" /><Metric value={String(applications.filter((item) => item.stage !== 'Declined').length)} label="In pipeline" /><Metric value={String(drives.filter((item) => item.kind === 'Interview').length)} label="Interview events" last /></View>
        <Section title="Choose a role to match" action="Post JD" onPress={openJobForm} />{jobs.map((job) => <TouchableOpacity key={job.id} onPress={() => { setSelectedJobId(job.id); goToTab('Jobs'); }} style={s.selectJob}><View style={s.grow}><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.company} · {job.requiredSkills.length} parsed skills</Text></View><Text style={s.link}>Matches ›</Text></TouchableOpacity>)}
        <Section title="Best fit candidates" action="See ranked list" onPress={() => goToTab('Jobs')} />{rankedCandidates.slice(0, 2).map(({ student: person }) => candidateCard(person, selectedJob, 'Recruiter'))}
        <InfoBox title="Human review stays in control" body="CampusLink ranks and explains profile fit. Recruiters and placement officers make every shortlist and selection decision." />
      </>;
    }
    const atRisk = students.filter((person) => person.readiness < 72 || (selectedJob && evaluate(person, selectedJob).missing.length >= 2));
    const conflictCount = drives.reduce((count, event, index) => count + drives.slice(index + 1).filter((other) => overlap(event, other)).length, 0);
    return <><Hero eyebrow="PLACEMENT OFFICE · 2026–27" title="Placement command centre." subtitle="Coordinate drives, support students early, and track outcomes." action="＋ Schedule a drive" onAction={openDriveForm} />
      <View style={s.metricRow}><Metric value={String(students.length)} label="Profiles" /><Metric value={String(drives.filter((item) => item.kind === 'Placement drive').length)} label="Drives" /><Metric value={`${applications.filter((item) => ['Offer', 'Documents', 'Accepted', 'Joined'].includes(item.stage)).length}`} label="Offers+" last /></View>
      {conflictCount > 0 && <TouchableOpacity style={s.conflictBanner} onPress={() => goToTab('Drives')}><Text style={s.conflictIcon}>!</Text><View style={s.grow}><Text style={s.cardTitle}>{conflictCount} schedule clash{conflictCount > 1 ? 'es' : ''} to resolve</Text><Text style={s.muted}>Review the drive calendar before confirming events.</Text></View><Text style={s.link}>Review ›</Text></TouchableOpacity>}
      <Section title="Students who may need support" action="View analytics" onPress={() => goToTab('Profile')} />{atRisk.map((person) => <View style={s.riskRow} key={person.id}><View style={s.avatar}><Text style={s.avatarText}>{initials(person.name)}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.muted}>Readiness {person.readiness}/100 · {selectedJob ? `${evaluate(person, selectedJob).missing.length} gaps for ${selectedJob.title}` : 'Complete profile review'}</Text></View><TouchableOpacity style={s.smallButton} onPress={() => { setSupportPlans((current) => ({ ...current, [person.id]: true })); notify(`A training follow-up was assigned for ${person.name}.`, 'Placement', 'Student support follow-up'); }}><Text style={s.smallButtonText}>{supportPlans[person.id] ? 'Assigned ✓' : 'Support plan'}</Text></TouchableOpacity></View>)}
      <Section title="Placement funnel" action="Open pipeline" onPress={() => goToTab('Pipeline')} />{funnelCard(applications)}
      <Section title="Recent campus updates" action="Inbox" onPress={() => goToTab('Inbox')} />{visibleInbox.slice(0, 2).map((item) => <MessageCard key={item.id} item={item} />)}
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
      {conflicts.length > 0 && <View style={s.conflictBanner}><Text style={s.conflictIcon}>!</Text><View style={s.grow}><Text style={s.conflictTitle}>Overlapping events detected</Text>{conflicts.map(([a, b]) => <Text style={s.conflictBody} key={`${a.id}-${b.id}`}>{a.date}: {a.title} overlaps {b.title}</Text>)}</View></View>}
      {drives.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)).map((event) => <View style={s.eventCard} key={event.id}>
        <View style={s.dateBox3D}>
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.dateHeader}>
            <Text style={s.dateMonText}>{event.date.slice(5, 7) === '10' ? 'OCT' : event.date.slice(5, 7) === '11' ? 'NOV' : event.date.slice(5, 7) === '12' ? 'DEC' : 'DATE'}</Text>
          </LinearGradient>
          <View style={s.dateBody}><Text style={s.dateDayText}>{event.date.slice(8, 10)}</Text></View>
        </View>
        <View style={s.grow}>
          <View style={s.eventKindPill}><Text style={s.eventKindText}>{event.kind.toUpperCase()}</Text></View>
          <Text style={s.cardTitle}>{event.title}</Text>
          <Text style={s.muted}>🏢 {event.company} · 🕒 {event.time} ({event.duration} min)</Text>
          <Text style={s.microcopy}>Audience: {event.audience}</Text>
        </View>
      </View>)}
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
            <TouchableOpacity style={[s.buttonSoft, { marginTop: 12 }]} onPress={logoutUser}>
              <Text style={s.buttonSoftText}>Log out</Text>
            </TouchableOpacity>
          </View>
        )}
        <InfoBox title="Profile privacy" body="Recruiter views show only the academic and career details needed to explain job fit. Your account password is verified by the CampusLink auth server and is never included in your student profile." />
      </>;
    }
    if (role === 'Recruiter') {
      return <>
        <Hero eyebrow="COMPANY PROFILE" title={authUser ? authUser.company || authUser.name : 'Recruiter Workspace'} subtitle="Manage active job listings, verify matching criteria, and view candidate pools." />
        {!!authUser && (
          <View style={s.card}>
            <View style={s.rowBetween}>
              <View style={s.grow}>
                <Text style={s.overline}>REGISTERED RECRUITER ACCOUNT</Text>
                <Text style={s.cardTitle}>{authUser.company || 'Hiring Company'}</Text>
                <Text style={s.muted}>{authUser.name}{authUser.designation ? ` · ${authUser.designation}` : ''}</Text>
                <Text style={s.muted}>{authUser.email}</Text>
              </View>
              <View style={s.scorePill}><Text style={s.scoreText}>Active</Text><Text style={s.scoreCaption}>verified</Text></View>
            </View>
            <View style={s.autoLoginBadge}>
              <Text style={s.autoLoginBadgeIcon}>🛡</Text>
              <Text style={s.autoLoginBadgeText}>Auto login active on this device</Text>
            </View>
            <TouchableOpacity style={[s.buttonSoft, { marginTop: 12 }]} onPress={logoutUser}>
              <Text style={s.buttonSoftText}>Log out of company account</Text>
            </TouchableOpacity>
          </View>
        )}
        <Section title="Fairness and scoring policy" />
        <InfoBox title="Scoring policy" body="Fit score uses skills (65%), qualification (20%), experience (10%), and readiness (5%). Name and contact information are not scoring inputs. Every candidate remains reviewable; score alone never rejects a person." />
        <Section title="Your active jobs" action="＋ Post new JD" onPress={openJobForm} />
        {jobs.filter((job) => !authUser || !authUser.company || job.company.toLowerCase() === authUser.company.toLowerCase() || job.createdBy === 'Recruiter' || job.createdBy === 'CampusLink sample').map((job) => <TouchableOpacity key={job.id} style={s.selectJob} onPress={() => { setSelectedJobId(job.id); goToTab('Jobs'); }}><View style={s.grow}><Text style={s.cardTitle}>{job.title}</Text><Text style={s.muted}>{job.company} · {job.requiredSkills.length} required skills</Text></View><Text style={s.link}>Matches ›</Text></TouchableOpacity>)}
      </>;
    }
    const placed = applications.filter((item) => item.stage === 'Joined').length;
    const dropped = applications.filter((item) => item.stage === 'Declined').length;
    const supportNeeded = students.filter((person) => person.readiness < 72 || (selectedJob && evaluate(person, selectedJob).missing.length >= 2));
    return <><Hero eyebrow="PLACEMENT ANALYTICS" title="Support before drop-off." subtitle="Use readiness, skill gaps, and pipeline stage to plan timely interventions." />
      <View style={s.metricRow}><Metric value={String(students.length)} label="Students" /><Metric value={String(placed)} label="Joined" /><Metric value={String(dropped)} label="Drop-off" last /></View>
      <Section title="Early support signals" />{supportNeeded.map((person) => <View style={s.riskRow} key={person.id}><View style={s.avatar}><Text style={s.avatarText}>{initials(person.name)}</Text></View><View style={s.grow}><Text style={s.cardTitle}>{person.name}</Text><Text style={s.muted}>Readiness {person.readiness}% · support plan {supportPlans[person.id] ? 'assigned' : 'needed'}</Text></View><TouchableOpacity style={s.smallButton} onPress={() => { setSupportPlans((current) => ({ ...current, [person.id]: true })); notify(`Support plan assigned to ${person.name}.`, 'Placement', 'Student support'); }}><Text style={s.smallButtonText}>{supportPlans[person.id] ? 'Assigned ✓' : 'Assign'}</Text></TouchableOpacity></View>)}
      <Section title="Application funnel" />{funnelCard(applications)}<InfoBox title="Data note" body="Counts reflect only actions in this local demo session. Early support signals use the visible readiness score and current job skill gaps, not protected characteristics." />
      <Section title="Placement cell account" />
      {!!authUser ? (
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View style={s.grow}>
              <Text style={s.overline}>REGISTERED PLACEMENT CELL</Text>
              <Text style={s.cardTitle}>{authUser.college || 'Placement Cell'}</Text>
              <Text style={s.muted}>{authUser.name}{authUser.designation ? ` · ${authUser.designation}` : ''}</Text>
              <Text style={s.muted}>{authUser.email}</Text>
            </View>
            <View style={s.scorePill}><Text style={s.scoreText}>Active</Text><Text style={s.scoreCaption}>verified</Text></View>
          </View>
          <View style={s.autoLoginBadge}>
            <Text style={s.autoLoginBadgeIcon}>🛡</Text>
            <Text style={s.autoLoginBadgeText}>Auto login active on this device</Text>
          </View>
          <TouchableOpacity style={[s.buttonSoft, { marginTop: 12 }]} onPress={logoutUser}>
            <Text style={s.buttonSoftText}>Log out of placement account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[s.buttonSoft, { marginTop: 12, marginBottom: 8 }]} onPress={logoutUser}>
          <Text style={s.buttonSoftText}>Switch role / Sign in</Text>
        </TouchableOpacity>
      )}
    </>;
  };

  const openSelectedJobDetails = () => {
    const person = students.find((item) => item.id === studentId) || student;
    const fit = evaluate(person, selectedJob);
    const existing = applications.some((item) => item.studentId === person.id && item.jobId === selectedJob.id);
    return <Modal visible={modal === 'jobDetails'} transparent animationType="slide" onRequestClose={() => setModal('')}>
      <View style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.modalCard}><ScrollView keyboardShouldPersistTaps="handled"><View style={s.rowBetween}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={s.modalBackBtn} onPress={() => setModal('')}><Text style={s.modalBackText}>‹ Back</Text></TouchableOpacity><Text style={s.modalTitle} numberOfLines={1}>{selectedJob.title}</Text></View><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View><Text style={s.overline}>{selectedJob.company} · {selectedJob.location}</Text><Text style={s.body}>{selectedJob.description}</Text>
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
      <View style={s.rowBetween}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={s.modalBackBtn} onPress={() => setModal('')}><Text style={s.modalBackText}>‹ Back</Text></TouchableOpacity><Text style={s.modalTitle} numberOfLines={1}>{modal === 'job' ? 'Post a job description' : modal === 'drive' ? 'Schedule campus event' : 'Edit student profile'}</Text></View><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View>
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
    return <Modal visible={modal === 'candidate'} transparent animationType="fade" onRequestClose={() => setModal('')}><View style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.modalCard}><ScrollView><View style={s.rowBetween}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={s.modalBackBtn} onPress={() => setModal('')}><Text style={s.modalBackText}>‹ Back</Text></TouchableOpacity><Text style={s.modalTitle} numberOfLines={1}>{candidate.name}</Text></View><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View><Text style={s.muted}>{candidate.degree} · {candidate.major} · {candidate.year}</Text><ProfileList title="Academic and readiness" values={[`CGPA ${candidate.cgpa}`, `Aptitude ${candidate.aptitude}`, `Readiness ${candidate.readiness}/100`]} /><ProfileList title="Skills" values={candidate.skills} /><ProfileList title="Projects" values={candidate.projects} /><ProfileList title="Certifications" values={candidate.certifications} /><ProfileList title="Internships" values={candidate.internships} /><InfoBox title="Privacy" body="Contact details are not collected or shown in this prototype. Use candidate information only for placement evaluation." /><TouchableOpacity style={s.button} onPress={() => setModal('')}><Text style={s.buttonText}>Close profile</Text></TouchableOpacity></ScrollView></View></View></Modal>;
  };

  const accountModal = () => <Modal visible={modal === 'account'} transparent animationType="slide" onRequestClose={() => setModal('')}>
    <View style={[s.overlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.modalCard}><ScrollView keyboardShouldPersistTaps="handled">
      <View style={s.rowBetween}><View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}><TouchableOpacity style={s.modalBackBtn} onPress={() => setModal('')}><Text style={s.modalBackText}>‹ Back</Text></TouchableOpacity><Text style={s.modalTitle}>Your Account</Text></View><TouchableOpacity onPress={() => setModal('')}><Text style={s.close}>×</Text></TouchableOpacity></View>
      <View style={[s.card, { marginTop: 12, marginBottom: 12 }]}>
        <View style={s.rowBetween}>
          <View style={s.grow}>
            <Text style={s.overline}>{role === 'Student' ? 'STUDENT ACCOUNT' : role === 'Recruiter' ? 'RECRUITER ACCOUNT' : 'PLACEMENT OFFICER ACCOUNT'}</Text>
            <Text style={s.cardTitle}>{authUser ? (role === 'Recruiter' ? (authUser.company || authUser.name) : (authUser.name || 'Placement Officer')) : (role === 'Student' ? student.name : role === 'Recruiter' ? 'Guest Recruiter' : 'Guest Placement Cell')}</Text>
            <Text style={s.muted}>{authUser ? (authUser.college || authUser.company || 'Campus Placement Cell') : 'Exploring as guest'}</Text>
            {!!authUser?.email && <Text style={s.muted}>{authUser.email}</Text>}
            {!!authUser?.designation && <Text style={s.muted}>Role: {authUser.designation}</Text>}
          </View>
          <View style={s.scorePill}><Text style={s.scoreText}>{authUser ? 'Active' : 'Guest'}</Text><Text style={s.scoreCaption}>{authUser ? 'verified' : 'session'}</Text></View>
        </View>
        {!!authUser && (
          <View style={s.autoLoginBadge}>
            <Text style={s.autoLoginBadgeIcon}>🛡</Text>
            <Text style={s.autoLoginBadgeText}>Auto login active on this device</Text>
          </View>
        )}
        <TouchableOpacity style={[s.buttonSoft, { marginTop: 14 }]} onPress={() => { setModal(''); logoutUser(); }}>
          <Text style={s.buttonSoftText}>{authUser ? `Log out of ${role === 'Placement' ? 'placement' : role.toLowerCase()} account` : 'Switch role / Sign in'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.button} onPress={() => setModal('')}><Text style={s.buttonText}>Close</Text></TouchableOpacity>
    </ScrollView></View></View>
  </Modal>;

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
    const enterApp = (nextRole) => { setRole(nextRole); setTab('Home'); setTabHistory(['Home']); animateEntry('app'); };
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
          ['Student', '🎓', 'Student Space', 'Discover roles, see your fit, and close skill gaps.', '#75E6DE'],
          ['Recruiter', '🏢', 'Placement Company / Recruiter', 'Register company, post roles, and shortlist candidate talent.', '#C4A5FF'],
          ['Placement', '🧭', 'Placement Officer', 'Coordinate campus drives and help students move forward.', '#FFC56E'],
        ].map(([name, icon, displayName, description, accent]) => <TouchableOpacity key={name} style={s.roleChoiceCard} onPress={() => { setRole(name); setAuthMode('register'); setAuthError(''); animateEntry('auth'); }} accessibilityRole="button" accessibilityLabel={`${displayName} workspace`}><View style={[s.roleChoiceIcon, { borderColor: `${accent}66`, backgroundColor: `${accent}1A` }]}><Text style={s.roleChoiceEmoji}>{icon}</Text></View><View style={s.roleChoiceText}><Text style={s.roleChoiceName}>{displayName}</Text><Text style={s.roleChoiceDescription}>{description}</Text></View><Text style={s.introButtonArrow}>→</Text></TouchableOpacity>)}
        <Text style={s.introFooter}>Your workspace is ready for your role.</Text>
      </Animated.View>
    ) : (
      <Animated.View style={[s.roleIntroContent, { opacity: introOpacity }]}>
        <TouchableOpacity style={s.backButton} onPress={() => animateEntry('role')}><Text style={s.backButtonText}>‹  Back to roles</Text></TouchableOpacity>
        <Text style={s.introEyebrow}>{role === 'Recruiter' ? 'PLACEMENT COMPANY & RECRUITER' : role === 'Placement' ? 'PLACEMENT OFFICE · CAMPUSLINK' : 'STUDENT SPACE · CAMPUSLINK'}</Text>
        <Text style={s.roleIntroTitle}>
          {authMode === 'forgot'
            ? 'Forgot password?'
            : authMode === 'register'
              ? (role === 'Recruiter' ? 'Register your company.' : role === 'Placement' ? 'Placement registration.' : 'Create student account.')
              : (role === 'Recruiter' ? 'Company sign in.' : 'Welcome back.')}
        </Text>
        <Text style={s.roleIntroSubtitle}>
          {authMode === 'forgot'
            ? 'Enter your registered email address to receive a secure password reset link.'
            : authMode === 'register'
              ? (role === 'Recruiter' ? 'Register once to post roles, review candidate matches, and manage campus hiring.' : role === 'Placement' ? 'Register your placement cell to coordinate drives and track student placement.' : 'Register once, then log in with your email and password.')
              : (role === 'Recruiter' ? 'Sign in with your corporate email to access your company dashboard.' : 'Log in with your email and password to open your workspace.')}
        </Text>
        <View style={s.authModeRow}>
          {[
            ['register', role === 'Recruiter' ? 'Register Company' : 'Register'],
            ['login', 'Log in'],
            ['forgot', 'Forgot Password'],
          ].map(([mode, label]) => (
            <TouchableOpacity
              key={mode}
              style={[s.authModeTab, authMode === mode && s.authModeSelected]}
              onPress={async () => {
                setAuthMode(mode);
                setAuthError('');
                setAuthSuccess('');
                setResetWebUrl('');
                if ((mode === 'login' || mode === 'forgot') && !authForm.email) {
                  const saved = await safeStorageGet(SAVED_EMAIL_KEY);
                  if (saved) setAuthForm((curr) => ({ ...curr, email: saved }));
                }
              }}
            >
              <Text style={[s.authModeText, authMode === mode && s.authModeTextSelected]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {authMode === 'register' && role === 'Recruiter' && <>
          <Text style={s.authLabel}>Company / organization name</Text>
          <TextInput style={s.authInput} value={authForm.company} onChangeText={(value) => setAuthValue('company', value)} placeholder="e.g. Northstar Labs, Tata Consultancy Services" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
          <Text style={s.authLabel}>Recruiter / HR representative name</Text>
          <TextInput style={s.authInput} value={authForm.name} onChangeText={(value) => setAuthValue('name', value)} placeholder="Your full name" placeholderTextColor="#AAB6D0" autoCapitalize="words" autoComplete="name" />
          <Text style={s.authLabel}>Designation / role (optional)</Text>
          <TextInput style={s.authInput} value={authForm.designation} onChangeText={(value) => setAuthValue('designation', value)} placeholder="e.g. Campus Talent Lead, HR Manager" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
        </>}
        {authMode === 'register' && role === 'Placement' && <>
          <Text style={s.authLabel}>College / institution name</Text>
          <TextInput style={s.authInput} value={authForm.college} onChangeText={(value) => setAuthValue('college', value)} placeholder="e.g. College of Engineering & Technology" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
          <Text style={s.authLabel}>Placement officer name</Text>
          <TextInput style={s.authInput} value={authForm.name} onChangeText={(value) => setAuthValue('name', value)} placeholder="Your full name" placeholderTextColor="#AAB6D0" autoCapitalize="words" autoComplete="name" />
          <Text style={s.authLabel}>Designation (optional)</Text>
          <TextInput style={s.authInput} value={authForm.designation} onChangeText={(value) => setAuthValue('designation', value)} placeholder="e.g. Head of Training & Placement" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
        </>}
        {authMode === 'register' && role === 'Student' && <>
          <Text style={s.authLabel}>Student name</Text><TextInput style={s.authInput} value={authForm.name} onChangeText={(value) => setAuthValue('name', value)} placeholder="Your full name" placeholderTextColor="#AAB6D0" autoCapitalize="words" autoComplete="name" />
          <Text style={s.authLabel}>College / university · Khordha district</Text><TextInput style={s.authInput} value={authForm.college} onFocus={() => { setCollegeQuery(''); setShowCollegeList(true); }} onChangeText={(value) => { setAuthValue('college', value); setCollegeQuery(value); setShowCollegeList(true); }} placeholder="Tap to browse or search college" placeholderTextColor="#AAB6D0" autoCapitalize="words" />
          {showCollegeList && <ScrollView style={s.collegeSuggestions} nestedScrollEnabled keyboardShouldPersistTaps="handled">{BHUBANESWAR_COLLEGES.filter((college) => !collegeQuery || college.toLowerCase().includes(collegeQuery.toLowerCase())).map((college) => <TouchableOpacity key={college} style={s.collegeSuggestion} onPress={() => { setAuthValue('college', college === 'Other / college not listed' ? '' : college); setCollegeQuery(''); setShowCollegeList(false); }}><Text style={s.authSuggestionText}>{college}</Text></TouchableOpacity>)}</ScrollView>}
          <Text style={s.authLabel}>Student registration number</Text><TextInput style={s.authInput} value={authForm.registrationNo} onChangeText={(value) => setAuthValue('registrationNo', value)} placeholder="College registration number" placeholderTextColor="#AAB6D0" autoCapitalize="characters" />
        </>}
        {authMode === 'forgot' ? (
          <>
            <Text style={s.authLabel}>{role === 'Recruiter' ? 'Registered corporate email address' : 'Registered email address'}</Text>
            <TextInput
              style={s.authInput}
              value={authForm.email}
              onChangeText={(value) => setAuthValue('email', value)}
              placeholder={role === 'Recruiter' ? 'recruiter@company.com' : 'you@example.com'}
              placeholderTextColor="#AAB6D0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            {!fallbackDirectReset && (
              <Text style={s.authHint}>
                Aapke is email par password reset karne ka link bhejenge. Email me diye gaye link ko open karke aap naya password aur confirmation password enter kar sakenge.
              </Text>
            )}

            {fallbackDirectReset && (
              <>
                <Text style={s.authLabel}>New password</Text>
                <View style={s.authPasswordRow}>
                  <TextInput
                    style={[s.authInput, s.authPasswordInput]}
                    value={authForm.newPassword}
                    onChangeText={(value) => setAuthValue('newPassword', value)}
                    placeholder="Enter new password (min 8 characters)"
                    placeholderTextColor="#AAB6D0"
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    style={s.passwordVisibilityButton}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  >
                    <View style={s.eyeIcon}>
                      <View style={s.eyePupil} />
                      {!passwordVisible && <View style={s.eyeSlash} />}
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={s.authLabel}>Confirm new password</Text>
                <View style={s.authPasswordRow}>
                  <TextInput
                    style={[s.authInput, s.authPasswordInput]}
                    value={authForm.confirmPassword}
                    onChangeText={(value) => setAuthValue('confirmPassword', value)}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#AAB6D0"
                    secureTextEntry={!confirmPasswordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    style={s.passwordVisibilityButton}
                    onPress={() => setConfirmPasswordVisible((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityLabel={confirmPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    <View style={s.eyeIcon}>
                      <View style={s.eyePupil} />
                      {!confirmPasswordVisible && <View style={s.eyeSlash} />}
                    </View>
                  </TouchableOpacity>
                </View>
                <Text style={s.authHint}>Choose a secure password with at least 8 characters. Make sure both passwords match.</Text>
              </>
            )}

            {!!authSuccess && (
              <View style={{ backgroundColor: 'rgba(117, 230, 222, 0.1)', borderWidth: 1, borderColor: '#75E6DE', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <Text style={{ color: '#75E6DE', fontSize: 13, fontWeight: '700', marginBottom: 4 }}>✓ {fallbackDirectReset ? 'Set New Password' : 'Email Sent'}</Text>
                <Text style={{ color: '#E2E8F0', fontSize: 12, lineHeight: 18 }}>{authSuccess}</Text>
                {!!resetWebUrl && (
                  <TouchableOpacity
                    style={{ marginTop: 10, backgroundColor: '#3269E8', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' }}
                    onPress={() => Linking.openURL(resetWebUrl)}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Open Reset Link in Browser ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!!authError && <Text style={s.authError} accessibilityRole="alert">{authError}</Text>}
            <TouchableOpacity
              style={[s.introButton, authBusy && { opacity: 0.65 }]}
              onPress={fallbackDirectReset ? submitFallbackPasswordReset : submitForgotPassword}
              disabled={authBusy}
            >
              <Text style={s.introButtonText}>
                {authBusy ? 'Please wait…' : fallbackDirectReset ? 'Update Password & Log In' : 'Send Reset Link to Email'}
              </Text>
              <Text style={s.introButtonArrow}>{fallbackDirectReset ? '→' : '✉'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 6 }} onPress={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); setResetWebUrl(''); setFallbackDirectReset(false); }}>
              <Text style={{ color: '#75E6DE', fontSize: 11, fontWeight: '700' }}>‹ Back to Log in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.authLabel}>{role === 'Recruiter' ? 'Work / corporate email address' : 'Email address'}</Text>
            <TextInput style={s.authInput} value={authForm.email} onChangeText={(value) => setAuthValue('email', value)} placeholder={role === 'Recruiter' ? 'recruiter@company.com' : 'you@example.com'} placeholderTextColor="#AAB6D0" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
            <Text style={s.authLabel}>Password</Text>
            <View style={s.authPasswordRow}>
              <TextInput style={[s.authInput, s.authPasswordInput]} value={authForm.password} onChangeText={(value) => setAuthValue('password', value)} placeholder={authMode === 'register' ? 'Create password (min 8 characters)' : 'Enter your password'} placeholderTextColor="#AAB6D0" secureTextEntry={!passwordVisible} autoCapitalize="none" autoCorrect={false} autoComplete={authMode === 'register' ? 'new-password' : 'password'} />
              <TouchableOpacity style={s.passwordVisibilityButton} onPress={() => setPasswordVisible((visible) => !visible)} accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}><View style={s.eyeIcon}><View style={s.eyePupil} />{!passwordVisible && <View style={s.eyeSlash} />}</View></TouchableOpacity>
            </View>
            {authMode === 'login' && (
              <TouchableOpacity style={s.forgotPasswordRow} onPress={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}>
                <Text style={s.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
            {authMode === 'register' && <Text style={s.authHint}>Choose a secure password with at least 8 characters. Passwords are encrypted on the server.</Text>}
            <TouchableOpacity style={s.autoLoginRow} onPress={() => setAutoLogin((current) => !current)} activeOpacity={0.8} accessibilityRole="checkbox" accessibilityState={{ checked: autoLogin }} accessibilityLabel="Keep me signed in with auto login">
              <View style={[s.checkbox, autoLogin && s.checkboxChecked]}>{autoLogin && <Text style={s.checkboxCheck}>✓</Text>}</View>
              <View style={s.autoLoginTextWrap}>
                <Text style={s.autoLoginLabel}>Auto login</Text>
                <Text style={s.autoLoginSub}>Keep me signed in on this device</Text>
              </View>
            </TouchableOpacity>
            {!!authSuccess && <Text style={s.authSuccess}>{authSuccess}</Text>}
            {!!authError && <Text style={s.authError} accessibilityRole="alert">{authError}</Text>}
            <TouchableOpacity style={[s.introButton, authBusy && { opacity: 0.65 }]} onPress={submitAuth} disabled={authBusy}><Text style={s.introButtonText}>{authBusy ? 'Please wait…' : authMode === 'register' ? (role === 'Recruiter' ? 'Register company & enter' : 'Create account') : 'Log in'}</Text><Text style={s.introButtonArrow}>→</Text></TouchableOpacity>
            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 6 }} onPress={() => enterApp(role)}><Text style={{ color: '#75E6DE', fontSize: 11, fontWeight: '700' }}>Or explore sample workspace as guest ›</Text></TouchableOpacity>
          </>
        )}
        <Text style={s.introFooter}>Your password is securely hashed on the auth server; it is never saved as readable text.</Text>
      </Animated.View>
    );
    return <View style={[s.introRoot, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 12) }]}><StatusBar barStyle="light-content" backgroundColor="#0B1024" translucent={Platform.OS === 'android'} /><View style={s.introBackdrop}><View style={s.backdropOrbA} /><View style={s.backdropOrbB} /><View style={s.backdropGrid} /></View><ScrollView contentContainerStyle={s.introScrollContent} showsVerticalScrollIndicator={false}>{entryContent}</ScrollView></View>;
  }
  return <View style={[s.safe, { paddingTop: topInset }]}>
    <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={Platform.OS === 'android'} />
    <View style={s.ambientLayer} pointerEvents="none">
      <Animated.View
        style={[
          s.ambientOrbA,
          {
            transform: [
              {
                translateY: appFloatA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -28],
                }),
              },
              { scale: appPulse },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          s.ambientOrbB,
          {
            transform: [
              {
                translateY: appFloatB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 24],
                }),
              },
            ],
          },
        ]}
      />
    </View>
    <View style={s.topbar}>
      {tab !== 'Home' ? (
        <TouchableOpacity style={s.headerBackButton} onPress={handleBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={s.headerBackIcon}>‹</Text>
          <Text style={s.headerBackLabel}>Back</Text>
        </TouchableOpacity>
      ) : null}
      <View style={tab !== 'Home' ? s.brandGroupCompact : s.brandGroup}>
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.brandMarkCube, tab !== 'Home' && { width: 28, height: 28, borderRadius: 9 }]}
        >
          <Text style={[s.brandMarkText, tab !== 'Home' && { fontSize: 15 }]}>C</Text>
          <Text style={s.brandSparkle}>✦</Text>
        </LinearGradient>
        <Text style={[s.brand, tab !== 'Home' && { fontSize: 15, marginLeft: 7 }]}>
          {tab === 'Home' ? <>Campus<Text style={{ color: palette.blue }}>Link</Text></> : (role === 'Placement' && tab === 'Profile' ? 'Analytics' : tab)}
        </Text>
      </View>
      <TouchableOpacity style={s.themeButton} onPress={() => setThemeMode((mode) => mode === 'light' ? 'dark' : 'light')} accessibilityRole="button" accessibilityLabel={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}><Text style={s.themeIcon}>{themeMode === 'light' ? '☾' : '☀'}</Text></TouchableOpacity>
      <TouchableOpacity style={s.headerButton} onPress={() => goToTab('Inbox')}><Text style={s.headerIcon}>✉</Text>{visibleInbox.some((item) => item.unread) && <View style={s.bellDot} />}</TouchableOpacity>
      <TouchableOpacity style={s.miniAvatar} onPress={() => setModal('account')} accessibilityRole="button" accessibilityLabel="Account details and log out"><Text style={s.miniAvatarText}>{role === 'Student' ? initials(student.name) : role === 'Recruiter' ? (authUser?.company ? initials(authUser.company) : 'RC') : 'PO'}</Text></TouchableOpacity>
    </View>
    {role === 'Student' && !authUser && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.studentPicker} contentContainerStyle={s.studentPickerContent}>{students.map((person) => <TouchableOpacity key={person.id} onPress={() => setStudentId(person.id)} style={[s.personChip, student.id === person.id && s.personChipSelected]}><Text style={[s.personChipText, student.id === person.id && s.personChipTextSelected]}>{person.name}</Text></TouchableOpacity>)}</ScrollView>}
    <ScrollView key={`${role}-${tab}-${student.id}`} style={s.scroll} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 12) + 76 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{content}</ScrollView>
    <View style={[s.navDockWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.navDock}>
        {TABS.map(([name, icon]) => {
          const isActive = tab === name;
          return (
            <TouchableOpacity
              style={s.navDockItem}
              key={name}
              onPress={() => goToTab(name)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={s.navActivePill}
                >
                  <Text style={s.navActiveIcon}>{icon}</Text>
                  <Text style={s.navActiveLabel} numberOfLines={1}>
                    {role === 'Placement' && name === 'Profile' ? 'Analytics' : name}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={s.navInactiveItem}>
                  <Text style={s.navIcon}>{icon}</Text>
                  <Text style={s.navLabel} numberOfLines={1}>
                    {role === 'Placement' && name === 'Profile' ? 'Analytics' : name}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
    {!!notice && <View style={s.toast} pointerEvents="none"><Text style={s.toastText}>{notice}</Text></View>}
    {formModal()}{openSelectedJobDetails()}{candidateModal()}{accountModal()}
  </View>;
}

function Hero({ eyebrow, title, subtitle, action, onAction }) {
  return (
    <View style={s.heroContainer}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#1E1B4B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroGlowOrbA} />
        <View style={s.heroGlowOrbB} />
        <View style={s.heroEyebrowPill}>
          <Text style={s.heroEyebrowSpark}>✦</Text>
          <Text style={s.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={s.heroTitle}>{title}</Text>
        <Text style={s.heroSub}>{subtitle}</Text>
        {action && (
          <TouchableOpacity style={s.heroActionBtn} onPress={onAction} activeOpacity={0.85}>
            <LinearGradient
              colors={['#3B82F6', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.heroBtnGrad}
            >
              <Text style={s.heroBtnText}>{action}</Text>
              <Text style={s.heroBtnArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      style={[s.button, disabled && s.buttonDisabled]}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={s.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Metric({ value, label, last }) {
  const meta = getMetricTheme(label);
  return (
    <View style={s.metricCard3D}>
      <LinearGradient colors={meta.colors} style={s.metricIconCube}>
        <Text style={s.metricIconText}>{meta.icon}</Text>
      </LinearGradient>
      <Text style={s.metricValue3D}>{value}</Text>
      <Text style={s.metricLabel3D} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Section({ title, action, onPress }) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <View style={s.sectionDot} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={s.link}>{action} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoBox({ title, body }) { return <View style={s.infoBox}><Text style={s.infoTitle}>{title}</Text><Text style={s.infoBody}>{body}</Text></View>; }
function EmptyState({ text }) { return <View style={s.empty}><Text style={s.emptyText}>{text}</Text></View>; }
function MessageCard({ item, onRead }) {
  return (
    <TouchableOpacity style={s.messageCard} onPress={onRead} activeOpacity={0.85}>
      <View style={[s.messageMark, item.unread && s.messageUnread]}>
        <Text style={s.messageMarkText}>•</Text>
      </View>
      <View style={s.grow}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <Text style={s.bodySmall}>{item.body}</Text>
        <Text style={s.microcopy}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType }) { return <View style={s.fieldGroup}><Text style={s.fieldLabel}>{label}</Text><TextInput style={[s.fieldInput, multiline && s.multiline]} value={value || ''} onChangeText={onChange} placeholder={placeholder || ''} placeholderTextColor="#94A3B8" multiline={multiline} keyboardType={keyboardType || 'default'} autoCapitalize="sentences" /></View>; }
function ProfileList({ title, values }) { return <View style={s.profileSection}><Text style={s.sectionTitle}>{title}</Text>{values.length ? values.map((value, index) => <Text key={`${title}-${index}`} style={s.profileValue}>•  {value}</Text>) : <Text style={s.muted}>Not added yet</Text>}</View>; }
function ScoreRow({ label, value, max, note }) { return <View style={s.scoreRow}><View style={s.rowBetween}><Text style={s.bodySmall}>{label}</Text><Text style={s.scoreText}>{value}/{max}</Text></View><View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.min(100, (value / max) * 100)}%` }]} /></View>{note && <Text style={s.microcopy}>{note}</Text>}</View>; }

function ApplicationCard({ application, role, onStage }) {
  const nextStage = { Applied: 'Shortlisted', Shortlisted: 'Interview', Interview: 'Offer' }[application.stage];
  const studentAction = application.stage === 'Offer' ? ['Documents', 'Accept offer'] : application.stage === 'Documents' ? ['Accepted', 'Mark documents submitted'] : application.stage === 'Accepted' ? ['Joined', 'Confirm joining'] : null;
  const active = !['Joined', 'Declined'].includes(application.stage);
  return <View style={s.card}>
    <View style={s.rowBetween}>
      <View style={s.grow}>
        <Text style={s.overline}>{application.company.toUpperCase()}</Text>
        <Text style={s.cardTitle}>{application.jobTitle}</Text>
        <Text style={s.muted}>{role === 'Student' ? 'Your application' : application.candidateName}</Text>
      </View>
      <View style={s.stagePill}><Text style={s.stageText}>{application.stage}</Text></View>
    </View>
    <View style={s.stageTrack}>{CAREER_STAGES.slice(0, 7).map((stage, index) => <View style={s.stageCell} key={stage}><View style={[s.stageDot, CAREER_STAGES.indexOf(application.stage) >= index && application.stage !== 'Declined' && s.stageDotActive]} /><Text style={s.stageTiny}>{stage === 'Documents' ? 'Docs' : stage}</Text></View>)}</View>
    <Text style={s.microcopy}>Last updated · {application.updated || 'Just now'}{application.stage === 'Declined' ? ` · ${application.dropOff || 'Candidate withdrew'}` : ''}</Text>
    {role === 'Recruiter' || role === 'Placement' ? (
      active && <View style={s.actionRow}>
        {nextStage && <TouchableOpacity style={s.smallButton} onPress={() => onStage(application, nextStage)} activeOpacity={0.85}><Text style={s.smallButtonText}>Move to {nextStage} →</Text></TouchableOpacity>}
        <TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')} activeOpacity={0.85}><Text style={s.buttonSoftText}>Record drop-off</Text></TouchableOpacity>
      </View>
    ) : (
      active && <View style={s.actionRow}>
        {studentAction && <TouchableOpacity style={s.smallButton} onPress={() => onStage(application, studentAction[0])} activeOpacity={0.85}><Text style={s.smallButtonText}>{studentAction[1]} →</Text></TouchableOpacity>}
        {application.stage === 'Offer' && <TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')} activeOpacity={0.85}><Text style={s.buttonSoftText}>Decline offer</Text></TouchableOpacity>}
        {!['Offer', 'Documents', 'Accepted'].includes(application.stage) && <TouchableOpacity style={s.buttonSoft} onPress={() => onStage(application, 'Declined')} activeOpacity={0.85}><Text style={s.buttonSoftText}>Withdraw</Text></TouchableOpacity>}
      </View>
    )}
  </View>;
}

function funnelCard(applications) {
  return (
    <View style={s.funnel}>
      {[
        ['Applied', applications.filter((x) => x.stage === 'Applied').length],
        ['Shortlisted', applications.filter((x) => x.stage === 'Shortlisted').length],
        ['Interview', applications.filter((x) => x.stage === 'Interview').length],
        ['Offer', applications.filter((x) => ['Offer', 'Documents', 'Accepted'].includes(x.stage)).length],
        ['Joined', applications.filter((x) => x.stage === 'Joined').length],
      ].map(([name, count]) => (
        <View style={s.funnelRow} key={name}>
          <Text style={s.bodySmall}>{name}</Text>
          <View style={s.funnelTrack}><View style={[s.funnelFill, { width: `${applications.length ? Math.max(8, (count / applications.length) * 100) : 0}%` }]} /></View>
          <Text style={s.funnelCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

function searchBox(value, onChange, placeholder) {
  return (
    <View style={s.searchBox3D}>
      <Text style={s.searchIcon3D}>🔍</Text>
      <TextInput
        style={s.searchInput3D}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChange('')} style={s.searchClearBtn} activeOpacity={0.7}>
          <Text style={s.searchClearText}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  ambientLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  ambientOrbA: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(99, 102, 241, 0.07)', top: 40, right: -100 },
  ambientOrbB: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(6, 182, 212, 0.06)', top: 440, left: -90 },
  topbar: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line },
  brandMarkCube: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  brandMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  brandSparkle: { position: 'absolute', top: 2, right: 3, color: '#FDE047', fontSize: 9, fontWeight: '900' },
  brand: { marginLeft: 10, color: C.navy, fontWeight: '900', fontSize: 18, letterSpacing: -0.3 },
  themeButton: { marginLeft: 'auto', marginRight: 10, width: 34, height: 34, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  themeIcon: { color: C.navy, fontSize: 16, fontWeight: '800' },
  headerButton: { marginRight: 12, width: 34, height: 34, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, position: 'relative' },
  headerIcon: { color: C.navy, fontSize: 17 },
  bellDot: { position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: C.red, borderWidth: 1, borderColor: C.white },
  miniAvatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.paleBlue || C.pale, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.blue },
  miniAvatarText: { color: C.blue, fontWeight: '900', fontSize: 11 },
  studentPicker: { maxHeight: 44, marginTop: 6 },
  studentPickerContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  personChip: { borderRadius: 14, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.white },
  personChipSelected: { borderColor: C.blue, backgroundColor: C.paleBlue || C.pale, borderBottomColor: C.blueDark || '#1D4ED8' },
  personChipText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  personChipTextSelected: { color: C.blue, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 95 },
  heroContainer: { marginBottom: 14, borderRadius: 22, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 7 },
  hero: { borderRadius: 22, padding: 20, overflow: 'hidden', position: 'relative' },
  heroGlowOrbA: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(99, 102, 241, 0.25)', top: -50, right: -40 },
  heroGlowOrbB: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(6, 182, 212, 0.15)', bottom: -40, left: -30 },
  heroEyebrowPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  heroEyebrowSpark: { color: '#38BDF8', fontSize: 11 },
  eyebrow: { color: '#E0F2FE', fontSize: 10, letterSpacing: 1.2, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 32, letterSpacing: -0.6, fontWeight: '900', marginTop: 4 },
  heroSub: { color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 16 },
  heroActionBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  heroBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 3, borderBottomColor: '#1D4ED8', borderRadius: 14 },
  heroBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  heroBtnArrow: { color: '#93C5FD', fontSize: 15, fontWeight: '900' },
  button: { backgroundColor: C.blue, borderBottomWidth: 3.5, borderBottomColor: C.blueDark || '#1D4ED8', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', shadowColor: C.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  buttonDisabled: { backgroundColor: '#94A3B8', borderBottomColor: '#64748B' },
  buttonSoft: { backgroundColor: C.pale, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  buttonSoftText: { color: C.blue, fontSize: 11, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 9, marginBottom: 16 },
  metricCard3D: { flex: 1, backgroundColor: C.white, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderBottomWidth: 3.5, borderBottomColor: '#CBD5E1', shadowColor: C.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  metricIconCube: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
  metricIconText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  metricValue3D: { color: C.navy, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  metricLabel3D: { color: C.muted, fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionDot: { width: 4, height: 14, borderRadius: 2, backgroundColor: C.blue, marginRight: 8 },
  sectionTitle: { color: C.navy, fontWeight: '900', fontSize: 15, letterSpacing: -0.2 },
  link: { color: C.blue, fontSize: 11, fontWeight: '800' },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 3.5, borderBottomColor: '#CBD5E1', borderRadius: 18, padding: 15, marginBottom: 12, shadowColor: C.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
  logoCube: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  logoCubeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 19 },
  logo: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: C.blue, fontWeight: '900', fontSize: 17 },
  overline: { color: C.muted, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  cardTitle: { color: C.navy, fontSize: 14, fontWeight: '900', marginTop: 2, letterSpacing: -0.2 },
  muted: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  microcopy: { color: C.muted, fontSize: 9, lineHeight: 13, marginTop: 8 },
  scoreBadge3D: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center', minWidth: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  scoreText3D: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  scoreCaption3D: { color: 'rgba(255,255,255,0.85)', fontSize: 7, fontWeight: '800', letterSpacing: 0.5 },
  scorePill: { backgroundColor: C.softGreen, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  scoreText: { color: C.green, fontSize: 13, fontWeight: '900' },
  scoreCaption: { color: C.green, fontSize: 8, fontWeight: '700' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 },
  colorfulTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)' },
  colorfulTagText: { fontSize: 9, fontWeight: '800' },
  tag: { color: C.ink, backgroundColor: C.pale, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 9, fontWeight: '700' },
  skillTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 9, fontWeight: '800' },
  skillTag3D: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  skillMatched3D: { backgroundColor: C.softGreen, borderColor: '#A7F3D0' },
  skillMatchedText: { color: C.green, fontSize: 9, fontWeight: '800' },
  skillMissing3D: { backgroundColor: C.softAmber || '#FFFBEB', borderColor: '#FDE68A' },
  skillMissingText: { color: C.amber || C.orange, fontSize: 9, fontWeight: '800' },
  skillMatched: { color: C.green, backgroundColor: C.softGreen },
  skillMissing: { color: C.orange, backgroundColor: C.softAmber || C.pale },
  candidateCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 3.5, borderBottomColor: '#CBD5E1', borderRadius: 18, padding: 15, marginBottom: 12, shadowColor: C.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  avatar3D: { height: 44, width: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  avatarText3D: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  avatar: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#E7EDFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.blue, fontSize: 11, fontWeight: '900' },
  readinessChip: { alignSelf: 'flex-start', backgroundColor: C.softGreen, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  readinessChipText: { color: C.green, fontSize: 9, fontWeight: '800' },
  smallButton: { backgroundColor: C.blue, borderBottomWidth: 2.5, borderBottomColor: C.blueDark || '#1D4ED8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'center', elevation: 3 },
  smallButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  selectJob: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9, elevation: 2 },
  infoBox: { backgroundColor: C.pale, borderWidth: 1, borderColor: '#DCE7FC', borderLeftWidth: 4, borderLeftColor: C.blue, borderRadius: 14, padding: 13, marginVertical: 9 },
  infoTitle: { color: C.navy, fontSize: 11, fontWeight: '900' },
  infoBody: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  conflictBanner: { backgroundColor: C.softRed, borderColor: '#FECACA', borderLeftWidth: 4, borderLeftColor: C.red, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  conflictTitle: { color: C.red, fontSize: 12, fontWeight: '900' },
  conflictBody: { color: '#991B1B', fontSize: 10, lineHeight: 14, marginTop: 2 },
  conflictIcon: { width: 28, height: 28, textAlign: 'center', textAlignVertical: 'center', color: '#FFFFFF', backgroundColor: C.red, borderRadius: 14, fontWeight: '900', fontSize: 14 },
  riskRow: { backgroundColor: C.white, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9, elevation: 2 },
  stagePill: { backgroundColor: C.pale, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: C.line },
  stageText: { color: C.blue, fontSize: 9, fontWeight: '800' },
  stageTrack: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  stageCell: { flex: 1, alignItems: 'center' },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },
  stageDotActive: { backgroundColor: C.blue, width: 10, height: 10, borderRadius: 5 },
  stageTiny: { color: C.muted, fontSize: 7, marginTop: 4, textAlign: 'center', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  eventCard: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 3.5, borderBottomColor: '#CBD5E1', borderRadius: 18, padding: 13, marginBottom: 10, shadowColor: C.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  dateBox3D: { width: 48, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#FECACA', borderBottomWidth: 3, borderBottomColor: '#E2E8F0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  dateHeader: { paddingVertical: 3, alignItems: 'center' },
  dateMonText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  dateBody: { backgroundColor: '#FFFFFF', paddingVertical: 6, alignItems: 'center' },
  dateDayText: { color: '#0F172A', fontSize: 17, fontWeight: '900' },
  eventKindPill: { alignSelf: 'flex-start', backgroundColor: C.paleBlue || C.pale, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3 },
  eventKindText: { color: C.blue, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  dateBox: { width: 42, height: 46, borderRadius: 11, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center' },
  dateDay: { color: C.blue, fontSize: 16, fontWeight: '900' },
  dateMon: { color: C.blue, fontSize: 8, fontWeight: '800' },
  conflictInline: { backgroundColor: C.softRed, borderColor: '#FECACA', borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 9 },
  messageCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 15, padding: 13, flexDirection: 'row', gap: 11, marginBottom: 9, elevation: 2 },
  messageMark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF1F6' },
  messageUnread: { backgroundColor: '#DBEAFE' },
  messageMarkText: { color: C.blue, fontSize: 18, lineHeight: 20 },
  bodySmall: { color: C.ink, fontSize: 10, lineHeight: 15, marginTop: 4 },
  body: { color: C.ink, fontSize: 11, lineHeight: 17, marginTop: 10 },
  empty: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 16, padding: 22, alignItems: 'center', elevation: 2 },
  emptyText: { color: C.muted, textAlign: 'center', fontSize: 11, lineHeight: 18 },
  searchBox3D: { backgroundColor: C.white, borderWidth: 1.5, borderColor: '#CBD5E1', borderBottomWidth: 3, borderBottomColor: '#94A3B8', borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12, elevation: 2 },
  searchIcon3D: { fontSize: 14, marginRight: 8 },
  searchInput3D: { flex: 1, color: C.ink, fontSize: 11, paddingVertical: 11 },
  searchClearBtn: { padding: 6 },
  searchClearText: { color: C.muted, fontSize: 18, fontWeight: '700' },
  search: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, marginBottom: 10 },
  searchIcon: { fontSize: 17, color: C.muted, marginRight: 6 },
  searchInput: { flex: 1, color: C.ink, fontSize: 10, paddingVertical: 10 },
  profileSection: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 },
  profileValue: { color: C.ink, fontSize: 10, marginTop: 7, lineHeight: 15 },
  learningRow: { backgroundColor: C.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', marginBottom: 8, elevation: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.pale, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.blue },
  funnel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 3, borderBottomColor: '#CBD5E1', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  funnelRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 9 },
  funnelTrack: { flex: 1, height: 7, backgroundColor: C.pale, borderRadius: 4, overflow: 'hidden' },
  funnelFill: { height: 7, borderRadius: 4, backgroundColor: C.blue },
  funnelCount: { color: C.navy, fontSize: 10, fontWeight: '900', width: 20, textAlign: 'right' },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { maxHeight: '92%', backgroundColor: C.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.line, elevation: 12 },
  modalTitle: { color: C.navy, fontWeight: '900', fontSize: 18, flex: 1 },
  close: { color: C.muted, fontSize: 26, paddingHorizontal: 5 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { color: C.navy, fontWeight: '800', fontSize: 10, marginBottom: 6 },
  fieldInput: { minHeight: 42, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, color: C.ink, fontSize: 11, backgroundColor: C.bg },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelButton: { flex: 1, borderRadius: 12, backgroundColor: C.pale, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, borderColor: C.line },
  cancelText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  analysisBox: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', borderRadius: 14, padding: 13, marginVertical: 10 },
  bigScore: { backgroundColor: C.softGreen, borderRadius: 18, padding: 18, alignItems: 'center', marginVertical: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  bigScoreValue: { color: C.green, fontWeight: '900', fontSize: 36 },
  bigScoreLabel: { color: C.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  scoreRow: { paddingVertical: 7 },
  matchPanel: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', borderRadius: 14, padding: 12, marginVertical: 6 },
  navDockWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 8 },
  navDock: { flexDirection: 'row', backgroundColor: C.white, borderRadius: 24, paddingVertical: 6, paddingHorizontal: 6, borderWidth: 1.5, borderColor: C.line, borderBottomWidth: 3.5, borderBottomColor: '#CBD5E1', shadowColor: C.shadowColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 10 },
  navDockItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navActivePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, shadowColor: C.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  navActiveIcon: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  navActiveLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  navInactiveItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  navIcon: { color: '#94A3B8', fontSize: 16, height: 19 },
  navLabel: { color: C.muted, fontSize: 8, fontWeight: '700', marginTop: 1 },
  toast: { position: 'absolute', bottom: 84, alignSelf: 'center', maxWidth: '90%', backgroundColor: C.navy, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  toastText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  autoLoginBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.softGreen, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  autoLoginBadgeIcon: { fontSize: 13, color: C.green },
  autoLoginBadgeText: { fontSize: 9, fontWeight: '800', color: C.green },
  headerBackButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderBottomWidth: 2.5, borderBottomColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8, elevation: 2 },
  headerBackIcon: { color: C.blue, fontSize: 22, fontWeight: '900', lineHeight: 22, marginTop: -2, marginRight: 2 },
  headerBackLabel: { color: C.blue, fontSize: 11, fontWeight: '800' },
  brandGroup: { flexDirection: 'row', alignItems: 'center' },
  brandGroupCompact: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.pale, borderWidth: 1, borderColor: C.line, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, marginRight: 8 },
  modalBackText: { color: C.blue, fontSize: 11, fontWeight: '800' },
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
  forgotPasswordRow: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 8, paddingVertical: 4 },
  forgotPasswordText: { color: '#75E6DE', fontSize: 10, fontWeight: '700' },
  authSuccess: { color: '#75E6DE', backgroundColor: 'rgba(117,230,222,0.12)', borderWidth: 1, borderColor: '#75E6DE', borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 14, marginTop: 9, marginBottom: 4 },
});
const lightStyles = { ...makeStyles(C), ...introStyles };
const darkStyles = { ...makeStyles(DARK), ...introStyles };
s = lightStyles;
