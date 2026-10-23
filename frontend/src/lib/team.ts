export interface TeamMember {
  name: string;
  role: string;
  photo: { src: string; srcSet: string; width: number; height: number };
  phones?: string[];
  email?: string;
  locations?: string;
  instagram?: string;
  facebook?: { label: string; url: string };
}

export const TEAM: TeamMember[] = [
  {
    name: 'Godman Fiifi Aggrey',
    role: 'Founder & Chief Executive Officer',
    photo: {
      src: '/images/team/godman-fiifi-aggrey-studio-576.webp',
      srcSet: '/images/team/godman-fiifi-aggrey-studio-480.webp 480w, /images/team/godman-fiifi-aggrey-studio-576.webp 576w',
      width: 576,
      height: 1024,
    },
    phones: ['0556062526', '0501655090'],
    email: 'godmanagg@gmail.com',
    locations: 'Accra / Takoradi',
    instagram: 'aggreydedon',
    facebook: { label: 'Goddy Aggrey', url: 'https://www.facebook.com/search/top?q=Goddy%20Aggrey' },
  },
  {
    name: 'Emmanuella Sikaba Amoah',
    role: 'Co-Founder',
    photo: {
      src: '/images/team/emmanuella-sikaba-amoah-800.webp',
      srcSet: '/images/team/emmanuella-sikaba-amoah-480.webp 480w, /images/team/emmanuella-sikaba-amoah-800.webp 800w',
      width: 800,
      height: 1000,
    },
    email: 'angelishieella@gmail.com',
    instagram: 'queen_sikaba',
    facebook: { label: 'Sikaba Ella', url: 'https://www.facebook.com/search/top?q=Sikaba%20Ella' },
  },
];
