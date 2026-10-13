import { CarFront, Globe2, HandHeart, ShieldCheck, ThumbsUp, Wallet } from 'lucide-react';

/** Shown until the owner saves their own points in Admin → Settings. */
export const DEFAULT_WHY_CHOOSE_US = [
  { title: 'Trust & Transparency', body: 'Clear communication and honest dealings to help you buy with confidence.' },
  { title: 'International Vehicle Sourcing', body: 'Access to vehicles sourced from the USA, Canada, and Japan.' },
  { title: 'Wide Range of Vehicles', body: 'Options spanning brand-new, foreign-used, and Ghanaian-used cars.' },
  { title: 'Options for Every Budget', body: 'We work with your budget and preferences to identify suitable vehicles.' },
  { title: 'Personalised Service', body: 'We listen to your needs and help you find the right car for your lifestyle.' },
  { title: 'Your Satisfaction Matters', body: 'We aim to make your vehicle-buying journey smooth, informed, and rewarding.' },
];

/** Paired with points by position, so the defaults above each get a fitting icon. */
export const WHY_CHOOSE_US_ICONS = [ShieldCheck, Globe2, CarFront, Wallet, HandHeart, ThumbsUp];
