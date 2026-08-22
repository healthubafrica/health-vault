import type { LucideIcon } from 'lucide-react-native';
import { Bike, Plus, FlaskConical, Video, ShieldCheck, Heart, HeartHandshake, Brain, Plane } from 'lucide-react-native';

// Single source of truth for the app's service catalog — logo, tagline, and
// colors, used by both the Services Hub grid and the Book Care service
// picker (step 1). Previously duplicated three ways (services-hub.tsx,
// (tabs)/services.tsx, book-appointment-step1.tsx each had their own copy,
// step1's with no real logos at all).
//
// serviceType is the backend's ServiceType enum value — present only on
// services that can actually be booked via appointments.listProviders()/
// create(). Not every hub tile is bookable (DispatchCare dispatches
// directly, MyHealth Vault+ just opens records).
export interface ServiceCatalogItem {
  id: string;
  name: string;
  tagline: string;
  logo?: any;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  serviceType?: string;
  hubRoute: string;
  hubActionText: string;
}

export const SERVICE_CATALOG: ServiceCatalogItem[] = [
  {
    id: 'telecare',
    name: 'TeleCare',
    tagline: 'Telemedicine Services - Anywhere, Anytime',
    logo: require('@/assets/images/Telecare.png'),
    icon: Video,
    iconColor: '#0E4A30',
    iconBg: '#EBF5EC',
    serviceType: 'TeleCare',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book TeleCare',
  },
  {
    id: 'minute-care',
    name: 'MinuteCare',
    tagline: 'Quick Care, Anytime, Anywhere',
    logo: require('@/assets/images/Minute care.png'),
    icon: Plus,
    iconColor: '#137333',
    iconBg: '#EAF5E2',
    serviceType: 'MinuteCare',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book MinuteCare',
  },
  {
    id: 'care-test',
    name: 'CareTest',
    tagline: 'Fast, Accurate, and Comprehensive Testing',
    logo: require('@/assets/images/Caretest.png'),
    icon: FlaskConical,
    iconColor: '#1565C0',
    iconBg: '#E3F2FD',
    serviceType: 'CareTest',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book CareTest',
  },
  {
    id: 'health-consult',
    name: 'Health Consult',
    tagline: 'Personalized Medicine & Healthcare',
    logo: require('@/assets/images/Health Consult.png'),
    icon: ShieldCheck,
    iconColor: '#E8930A',
    iconBg: '#FFF4E0',
    serviceType: 'HealthConsult',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book Consult',
  },
  {
    id: 'dispatch-care',
    name: 'DispatchCare',
    tagline: 'Rapid Response, Lifesaving Care!',
    logo: require('@/assets/images/dispatch care.png'),
    icon: Bike,
    iconColor: '#C0392B',
    iconBg: '#FDECEA',
    serviceType: 'DispatchCare',
    hubRoute: '/emergency',
    hubActionText: 'Dispatch Emergency',
  },
  {
    id: 'expert-review',
    name: 'Expert Review',
    tagline: 'Specialist clinical second opinions across 18+ medical fields',
    icon: HeartHandshake,
    iconColor: '#B91C1C',
    iconBg: '#FDECEA',
    serviceType: 'ExpertReview',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book Expert Review',
  },
  {
    id: 'neuroflex',
    name: 'NeuroFlex',
    tagline: 'Dedicated neurology specialist access, consultation, and follow-up',
    icon: Brain,
    iconColor: '#6B21A8',
    iconBg: '#F3E8FF',
    serviceType: 'NeuroFlex',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book NeuroFlex',
  },
  {
    id: 'travelsafe',
    name: 'TravelSafe',
    tagline: 'Pre-trip health requirements, vaccines, and travel support profile',
    icon: Plane,
    iconColor: '#0D9488',
    iconBg: '#CCFBF1',
    serviceType: 'TravelSafe',
    hubRoute: '/book-appointment-step1',
    hubActionText: 'Book TravelSafe',
  },
  {
    id: 'myhealth-vault',
    name: 'MyHealth Vault+',
    tagline: 'Smart Health & Safety Solutions',
    logo: require('@/assets/images/myhealth vault+.png'),
    icon: Heart,
    iconColor: '#137333',
    iconBg: '#EAF5E2',
    hubRoute: '/(tabs)/records',
    hubActionText: 'Open Health Vault',
  },
];

// Services Hub shows a curated set of quick actions (including
// non-bookable ones like the Vault); Book Care step 1 shows only what can
// actually be booked as an appointment.
export const HUB_SERVICES = SERVICE_CATALOG.filter((s) =>
  ['telecare', 'minute-care', 'care-test', 'health-consult', 'dispatch-care', 'myhealth-vault'].includes(s.id)
);

export const BOOKABLE_SERVICES = SERVICE_CATALOG.filter((s) => !!s.serviceType);
